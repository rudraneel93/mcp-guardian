/**
 * Extracts data-flow signals from a tool call for cross-request session analysis.
 */
import { deobfuscateRecursive } from '../utils/payload-normalizer.js';
import { walkStringLeaves } from './arg-leaf-walker.js';
import { extractPathArgumentValues } from './path-guard.js';
import { extractHttpUrlsFromLeaves, isDangerousUrl } from './url-guard.js';
import type { CallContext } from './policy-types.js';

const READ_TOOL_NAMES = new Set([
  'read_file',
  'read_text_file',
  'get_file_contents',
  'read',
  'cat',
  'head',
  'tail',
]);

const EXFIL_TOOL_NAMES = new Set([
  'curl',
  'wget',
  'fetch',
  'http_request',
  'webhook',
]);

const SENSITIVE_PATH_IN_TEXT =
  /\b(?:\/etc\/passwd|\/etc\/shadow|\.env(?:\.\w+)?|\.ssh\/|id_rsa|id_ed25519|\.aws\/|credentials|secrets?|serviceaccount\/token|terraform\.tfstate|\.kube\/config)\b/i;

const EXFIL_VERB_IN_TEXT =
  /\b(?:curl|wget|fetch|post|send|upload|forward|deliver|transmit|webhook|callback|exfil)\b/i;

export interface CallDataFlowSignals {
  toolName: string;
  timestamp: string;
  /** Normalized sensitive paths read or referenced */
  sensitiveReads: string[];
  /** External or private URLs used as exfil sinks */
  exfilSinks: string[];
  /** Tool is primarily a filesystem read */
  isReadTool: boolean;
  /** Tool or args indicate network exfiltration */
  isExfilTool: boolean;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').trim().toLowerCase();
}

function pathsFromContext(ctx: CallContext): string[] {
  const paths = new Set<string>();
  for (const p of extractPathArgumentValues(ctx.arguments)) {
    paths.add(normalizePath(p));
  }
  for (const { value } of walkStringLeaves(ctx.arguments ?? {})) {
    const decoded = deobfuscateRecursive(value);
    const m = decoded.match(SENSITIVE_PATH_IN_TEXT);
    if (m) paths.add(normalizePath(m[0]));
  }
  return [...paths];
}

function exfilSinksFromContext(ctx: CallContext): string[] {
  const sinks = new Set<string>();
  const urls = extractHttpUrlsFromLeaves(ctx.arguments ?? {});
  for (const url of urls) {
    const check = isDangerousUrl(url);
    if (!check.block) sinks.add(url.trim());
  }
  for (const { path, value } of walkStringLeaves(ctx.arguments ?? {})) {
    const key = path.split(/[.[\]]/).filter(Boolean).pop()?.toLowerCase() ?? '';
    if (/^(webhook|callback|url|href|target|link)$/.test(key) && /^https?:\/\//i.test(value)) {
      const check = isDangerousUrl(value);
      if (!check.block) sinks.add(value.trim());
    }
  }
  return [...sinks];
}

function textBlob(ctx: CallContext): string {
  return walkStringLeaves(ctx.arguments ?? {})
    .map((l) => deobfuscateRecursive(l.value))
    .join('\n');
}

export function extractCallDataFlowSignals(ctx: CallContext): CallDataFlowSignals {
  const toolLower = ctx.toolName.toLowerCase();
  const paths = pathsFromContext(ctx);
  const sinks = exfilSinksFromContext(ctx);
  const blob = textBlob(ctx);

  const isReadTool =
    READ_TOOL_NAMES.has(toolLower)
    || paths.length > 0
    || (/\bread_file\b/i.test(blob) && SENSITIVE_PATH_IN_TEXT.test(blob));

  const isExfilTool =
    EXFIL_TOOL_NAMES.has(toolLower)
    || sinks.length > 0
    || (EXFIL_VERB_IN_TEXT.test(blob) && /\bhttps?:\/\//i.test(blob))
    || /\b(?:webhook|callback)\s*[:=]/i.test(blob);

  return {
    toolName: ctx.toolName,
    timestamp: ctx.timestamp,
    sensitiveReads: paths,
    exfilSinks: sinks,
    isReadTool,
    isExfilTool,
  };
}
