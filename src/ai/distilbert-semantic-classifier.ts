/**
 * DistilBERT prompt-injection classifier (acuvity/distilbert-base-uncased-prompt-injection-v0.1).
 * ONNX weights live in assets/ml/prompt-injection/ (see scripts/export-prompt-injection-onnx.py).
 */
import { existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkStringLeaves } from '../policy/arg-leaf-walker.js';
import { deobfuscateRecursive } from '../utils/payload-normalizer.js';
import { Logger } from '../utils/logger.js';

export const DISTILBERT_PROMPT_INJECTION_MODEL = 'acuvity/distilbert-base-uncased-prompt-injection-v0.1';
export const LOCAL_MODEL_FOLDER = 'prompt-injection';
export const INJECTION_LABEL = 'prompt_injection';
export const SAFE_LABEL = 'safe';

export interface MlSemanticClassification {
  labels: string[];
  scores: number[];
  topLabel: string;
  topScore: number;
  maliciousScore: number;
  benignScore: number;
  suspicious: boolean;
  modelId: string;
  latencyMs: number;
}

type TextClassificationPipeline = (
  text: string,
) => Promise<Array<{ label: string; score: number }>>;

const __dirname = dirname(fileURLToPath(import.meta.url));

let pipelinePromise: Promise<TextClassificationPipeline> | null = null;
let loadError: string | null = null;
let resolvedModelId = DISTILBERT_PROMPT_INJECTION_MODEL;

function resolveAssetsMlRoot(): string | null {
  const envPath = process.env.GUARDIAN_ML_MODEL_PATH?.trim();
  if (envPath && existsSync(envPath)) return envPath;

  const candidates = [
    join(process.cwd(), 'assets', 'ml'),
    join(__dirname, '..', '..', 'assets', 'ml'),
    join(__dirname, '..', '..', '..', 'assets', 'ml'),
  ];
  for (const c of candidates) {
    const modelDir = join(c, LOCAL_MODEL_FOLDER);
    if (existsSync(join(modelDir, 'onnx', 'model.onnx')) || existsSync(join(modelDir, 'onnx', 'model_quantized.onnx'))) {
      return c;
    }
  }
  return null;
}

export function isMlSemanticEnabled(configFlag?: boolean): boolean {
  if (process.env.GUARDIAN_ML_SEMANTIC === 'false') return false;
  if (process.env.GUARDIAN_ML_SEMANTIC === 'true') return true;
  if (configFlag === false) return false;
  return true;
}

export function isMlSemanticStrictMode(): boolean {
  return process.env.GUARDIAN_ML_SEMANTIC_STRICT === 'true';
}

export function mlSemanticThreshold(): number {
  const t = parseFloat(process.env.GUARDIAN_ML_SEMANTIC_THRESHOLD || '0.5');
  return Number.isFinite(t) && t > 0 && t < 1 ? t : 0.5;
}

function buildClassifierText(ctx: { toolName: string; arguments?: Record<string, unknown> }): string {
  const parts = [
    `tool: ${ctx.toolName}`,
    ...walkStringLeaves(ctx.arguments ?? {}).map((l) => deobfuscateRecursive(l.value)),
  ];
  return parts.join('\n').replace(/\s+/g, ' ').trim().slice(0, 2000);
}

async function loadPipeline(): Promise<TextClassificationPipeline> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const { env, pipeline } = await import('@xenova/transformers');
    const assetsMl = resolveAssetsMlRoot();

    if (assetsMl) {
      env.localModelPath = assetsMl;
      env.allowLocalModels = true;
      env.allowRemoteModels = false;
      resolvedModelId = `local:${LOCAL_MODEL_FOLDER}`;
      Logger.info(`[ml-semantic] Loading local DistilBERT prompt-injection (${assetsMl}/${LOCAL_MODEL_FOLDER})`);
      const clf = await pipeline('text-classification', LOCAL_MODEL_FOLDER);
      return clf as TextClassificationPipeline;
    }

    const cacheDir = process.env.GUARDIAN_TRANSFORMERS_CACHE
      || join(homedir(), '.cache', 'mcp-guardian', 'transformers');
    mkdirSync(cacheDir, { recursive: true });
    env.cacheDir = cacheDir;
    env.allowLocalModels = true;
    if (process.env.GUARDIAN_ML_SEMANTIC_REMOTE === 'false') {
      env.allowRemoteModels = false;
    }
    resolvedModelId = DISTILBERT_PROMPT_INJECTION_MODEL;
    Logger.warn(
      `[ml-semantic] Local ONNX not found under assets/ml/${LOCAL_MODEL_FOLDER}; `
      + 'run `pnpm ml:export` or set GUARDIAN_ML_MODEL_PATH. Remote load may fail without ONNX on HuggingFace.',
    );
    const clf = await pipeline('text-classification', DISTILBERT_PROMPT_INJECTION_MODEL);
    return clf as TextClassificationPipeline;
  })().catch((err: unknown) => {
    loadError = err instanceof Error ? err.message : String(err);
    pipelinePromise = null;
    throw err;
  });

  return pipelinePromise;
}

export function getMlSemanticLoadError(): string | null {
  return loadError;
}

/** @internal Reset singleton for tests. */
export function resetMlSemanticClassifierForTests(): void {
  pipelinePromise = null;
  loadError = null;
  resolvedModelId = DISTILBERT_PROMPT_INJECTION_MODEL;
}

function parseClassificationOutput(
  output: Array<{ label: string; score: number }>,
): MlSemanticClassification {
  const labels = output.map((o) => o.label);
  const scores = output.map((o) => o.score);
  const injectionEntry = output.find((o) => o.label === INJECTION_LABEL);
  const safeEntry = output.find((o) => o.label === SAFE_LABEL);
  const injectionScore = injectionEntry?.score ?? 0;
  const safeScore = safeEntry?.score ?? 0;
  const threshold = mlSemanticThreshold();
  const suspicious = injectionScore >= threshold && injectionScore >= safeScore;

  return {
    labels,
    scores,
    topLabel: labels[0] ?? SAFE_LABEL,
    topScore: scores[0] ?? 0,
    maliciousScore: injectionScore,
    benignScore: safeScore,
    suspicious,
    modelId: resolvedModelId,
    latencyMs: 0,
  };
}

export async function classifySecurityIntent(text: string): Promise<MlSemanticClassification> {
  const start = Date.now();
  if (!text.trim()) {
    return {
      labels: [SAFE_LABEL],
      scores: [1],
      topLabel: SAFE_LABEL,
      topScore: 1,
      maliciousScore: 0,
      benignScore: 1,
      suspicious: false,
      modelId: resolvedModelId,
      latencyMs: 0,
    };
  }

  const clf = await loadPipeline();
  const raw = await clf(text);
  const result = parseClassificationOutput(raw);
  result.latencyMs = Date.now() - start;
  return result;
}

export async function classifyToolCallMlSemantic(ctx: {
  toolName: string;
  arguments?: Record<string, unknown>;
}): Promise<MlSemanticClassification> {
  return classifySecurityIntent(buildClassifierText(ctx));
}
