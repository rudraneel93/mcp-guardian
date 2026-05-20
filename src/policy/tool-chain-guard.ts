/**
 * Cross-tool chain guard — detects staged read-then-exfil instructions in argument text.
 * Complements regex prompt-injection rules when exfil uses post/webhook instead of curl.
 */
import { deobfuscateRecursive } from '../utils/payload-normalizer.js';
import { walkStringLeaves } from './arg-leaf-walker.js';
import type { CallContext, PolicyDecision } from './policy-types.js';

const READ_TOOLS =
  /\b(?:read_file|read|cat|head|tail|less|strings|type|get_file|fetch_file)\b/i;

const SENSITIVE_TARGETS =
  /\b(?:\/etc\/passwd|\.env(?:\.\w+)?|\.ssh\/|id_rsa|id_ed25519|\.aws\/|credentials|secrets?|serviceaccount\/token|terraform\.tfstate|\.kube\/config)\b/i;

const EXFIL_VERBS =
  /\b(?:curl|wget|fetch|ncat|netcat|post|send|upload|forward|deliver|transmit|ship|emit|exfil|webhook|callback)\b/i;

const CHAIN_CONNECTORS =
  /\b(?:then|after that|afterwards|next|finally|and then|step\s*2)\b/i;

/** Multi-step natural-language tool chaining (read sensitive data → exfil). */
const STAGED_CHAIN_RE = new RegExp(
  `${READ_TOOLS.source}.{0,120}${SENSITIVE_TARGETS.source}.{0,160}${CHAIN_CONNECTORS.source}.{0,120}${EXFIL_VERBS.source}`,
  'i',
);

/** Inverse order: exfil instruction referencing prior read of secrets. */
const EXFIL_AFTER_READ_RE = new RegExp(
  `${EXFIL_VERBS.source}.{0,80}${SENSITIVE_TARGETS.source}|${SENSITIVE_TARGETS.source}.{0,120}${EXFIL_VERBS.source}`,
  'i',
);

/** Step-labeled chains: "Step 1: read_file … Step 2: post …" */
const STEP_CHAIN_RE =
  /step\s*[12]\s*[:.]?\s*(?:read|cat|get).{0,200}step\s*[23]\s*[:.]?\s*(?:curl|post|send|wget|upload|webhook)/i;

export function evaluateToolChainGuard(ctx: CallContext): PolicyDecision | null {
  const args = ctx.arguments ?? {};
  const blob = walkStringLeaves(args)
    .map((l) => deobfuscateRecursive(l.value))
    .join('\n');

  if (!blob.trim()) return null;

  if (STAGED_CHAIN_RE.test(blob) || EXFIL_AFTER_READ_RE.test(blob) || STEP_CHAIN_RE.test(blob)) {
    return {
      action: 'block',
      rule: 'semantic-tool-chain-guard',
      reason: `Cross-tool exfiltration chain detected in '${ctx.toolName}' arguments`,
    };
  }

  return null;
}
