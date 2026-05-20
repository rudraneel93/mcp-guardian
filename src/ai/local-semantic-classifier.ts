/**
 * Local semantic risk scorer — heuristic + expanded regex when no LLM API key.
 * Not a mock API: deterministic feature scoring on normalized tool-call text.
 */
import { walkStringLeaves } from '../policy/arg-leaf-walker.js';
import { deobfuscateRecursive } from '../utils/payload-normalizer.js';

export interface LocalSemanticScore {
  risk: number;
  suspicious: boolean;
  categories: string[];
  reasoning: string;
}

const RISK_PATTERNS: { id: string; category: string; weight: number; re: RegExp }[] = [
  { id: 'ignore-instructions', category: 'prompt-injection', weight: 0.35, re: /ignore\s+(?:all\s+)?(?:previous|your|prior)\s+instructions/i },
  { id: 'jailbreak', category: 'prompt-injection', weight: 0.4, re: /\b(?:jailbreak|DAN\s+mode|developer\s+mode)\b/i },
  { id: 'bypass-synonym', category: 'prompt-injection', weight: 0.38, re: /\b(?:circumvent|work around|evade detection)\b/i },
  { id: 'exfil', category: 'exfiltration', weight: 0.45, re: /(?:curl|wget|fetch).{0,40}https?:\/\//i },
  { id: 'indirect-exfil', category: 'exfiltration', weight: 0.42, re: /(?:logged|syslog|metrics|trace).{0,40}(?:remote|external|upstream|collector)/i },
  { id: 'credential', category: 'exfiltration', weight: 0.3, re: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{12,}/i },
  { id: 'shell', category: 'encoded-payload', weight: 0.35, re: /\b(?:rm\s+-rf|bash\s+-c|eval\s*\(|powershell\s+-)/i },
  { id: 'cmd-subst', category: 'encoded-payload', weight: 0.4, re: /\$\(\s*(?:cat|head).*(?:passwd|\.ssh|\.env)/i },
  { id: 'sql-injection', category: 'injection', weight: 0.4, re: /\bor\s+['"]?1['"]?\s*=\s*['"]?1|union\s+select/i },
  { id: 'base64-shell', category: 'encoded-payload', weight: 0.4, re: /[A-Za-z0-9+/]{80,}={0,2}/ },
  { id: 'priv-esc', category: 'privilege-escalation', weight: 0.35, re: /\b(?:sudo|chmod\s+777|\/etc\/passwd|kubectl\s+apply)\b/i },
  { id: 'role-override', category: 'prompt-injection', weight: 0.38, re: /(?:you are now|act as|your new role)/i },
  { id: 'tool-chain', category: 'tool-chain', weight: 0.45, re: /read_file.{0,80}(?:\.env|passwd|\.ssh).{0,80}(?:then|next).{0,80}(?:post|webhook|curl|send)/i },
];

const SUSPICIOUS_THRESHOLD = parseFloat(process.env['GUARDIAN_LOCAL_SEMANTIC_THRESHOLD'] || '0.55');

export function isLocalSemanticEnabled(): boolean {
  if (process.env['GUARDIAN_LOCAL_SEMANTIC'] === 'false') return false;
  if (process.env['GUARDIAN_LOCAL_SEMANTIC'] === 'true') return true;
  return process.env['GUARDIAN_DISABLE_SEMANTIC'] !== 'true';
}

function normalizeText(parts: string[]): string {
  const joined = parts.join('\n');
  try {
    const deob = deobfuscateRecursive(joined);
    return deob.toLowerCase().replace(/\s+/g, ' ').trim();
  } catch {
    return joined.toLowerCase().replace(/\s+/g, ' ').trim();
  }
}

function entropyScore(text: string): number {
  if (text.length < 40) return 0;
  const freq = new Map<string, number>();
  for (const c of text) freq.set(c, (freq.get(c) || 0) + 1);
  let entropy = 0;
  for (const n of freq.values()) {
    const p = n / text.length;
    entropy -= p * Math.log2(p);
  }
  if (entropy > 4.5) return 0.15;
  if (entropy > 3.8) return 0.08;
  return 0;
}

function base64ShellScore(text: string): number {
  const chunks = text.match(/[a-z0-9+/]{80,}={0,2}/gi);
  if (!chunks) return 0;
  for (const c of chunks.slice(0, 3)) {
    try {
      const dec = Buffer.from(c, 'base64').toString('utf-8');
      if (/\b(bash|sh|curl|wget|eval|exec)\b/i.test(dec)) return 0.25;
    } catch {
      /* ignore */
    }
  }
  return 0;
}

/** Score tool call risk 0–1 from arguments + metadata. */
export function scoreLocalSemanticRisk(input: {
  serverName: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  syncRule?: string;
}): LocalSemanticScore {
  const leaves = walkStringLeaves(input.arguments ?? {});
  const parts = [
    input.toolName,
    input.serverName,
    input.syncRule || '',
    ...leaves.map((l) => l.value),
  ];
  const text = normalizeText(parts);
  if (!text) {
    return { risk: 0, suspicious: false, categories: ['none'], reasoning: 'Empty payload' };
  }

  let risk = entropyScore(text) + base64ShellScore(text);
  const categories = new Set<string>();
  const hits: string[] = [];

  for (const p of RISK_PATTERNS) {
    if (p.re.test(text)) {
      risk += p.weight;
      categories.add(p.category);
      hits.push(p.id);
    }
  }

  if (input.toolName.match(/(?:bash|exec|eval|shell|command)/i)) {
    risk += 0.1;
    categories.add('privilege-escalation');
  }

  risk = Math.min(1, Math.round(risk * 1000) / 1000);
  const suspicious = risk >= SUSPICIOUS_THRESHOLD;
  const cats = categories.size > 0 ? [...categories] : suspicious ? ['unknown'] : ['none'];

  return {
    risk,
    suspicious,
    categories: cats,
    reasoning: suspicious
      ? `Local heuristic risk ${risk.toFixed(2)} (${hits.slice(0, 4).join(', ') || 'features'})`
      : `Local heuristic risk ${risk.toFixed(2)} below threshold`,
  };
}
