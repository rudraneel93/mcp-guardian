/**
 * repo-data.ts
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth — ALL data is loaded from real repo files
 * extracted by extract-data.cjs from:
 *   tests/adversarial-harness/evasion-attacks.json  → 155 real attacks
 *   sca/ai-learning-metrics.json                    → real AI metrics
 *   benchmarks/results/proxy-slo-by-concurrency-*  → real SLO data
 *   reports/tenants/default/security-swarm/*        → real swarm/traffic
 *   scenarios/dogfood/guardian-configs/*.json       → real MCP configs
 *   security-swarm/config/gates.json                → real gate thresholds
 * ─────────────────────────────────────────────────────────────────
 * NO synthetic, mock, or hardcoded data — everything is read from the
 * repo's actual output files.
 */

// ── Raw JSON imports (Next.js resolveJsonModule) ─────────────────
import attacksRaw        from '../app/data/attacks.json';
import aiMetricsRaw      from '../app/data/ai-learning-metrics.json';
import benchSloRaw       from '../app/data/benchmark-slo.json';
import trafficRaw        from '../app/data/traffic-summary.json';
import swarmReportRaw    from '../app/data/swarm-report.json';
import swarmLatestRaw    from '../app/data/swarm-latest.json';
import calibrationRaw    from '../app/data/calibration.json';
import bypassesRaw       from '../app/data/bypasses.json';
import gatesRaw          from '../app/data/gates.json';
import guardianCfgsRaw   from '../app/data/guardian-configs.json';
import threatLabJobRaw   from '../app/data/threat-lab-job.json';
import autoResJobRaw     from '../app/data/auto-research-job.json';
import benchReportRaw    from '../app/data/benchmark-report.json';

// ── Attack Harness (155 real adversarial probes) ─────────────────
export interface Attack {
  id: string;
  tool: string;
  category: string;
  hint: string;
  source: string;
  expected: string;
  attackClass: string;
  confidence: number | null;
  cve: string;
  hypothesis: string;
  llmUsed: boolean;
}

export const ATTACKS: Attack[] = (attacksRaw as { attacks: Attack[] }).attacks;
export const ATTACK_HARNESS_META = {
  version:     (attacksRaw as { version: number }).version,
  generatedAt: (attacksRaw as { generatedAt: string }).generatedAt,
  count:       (attacksRaw as { count: number }).count,
};

// Build category counts from real data
export const ATTACK_CATEGORY_COUNTS: Record<string, number> = {};
ATTACKS.forEach(a => {
  ATTACK_CATEGORY_COUNTS[a.category] = (ATTACK_CATEGORY_COUNTS[a.category] || 0) + 1;
});

export const ATTACK_CATEGORIES = ['all', ...Object.keys(ATTACK_CATEGORY_COUNTS).sort((a, b) => ATTACK_CATEGORY_COUNTS[b] - ATTACK_CATEGORY_COUNTS[a])];

// ── AI Learning Metrics (real sca/ai-learning-metrics.json) ─────
const ai = aiMetricsRaw as {
  key_metrics: {
    overall_detection_rate: string;
    false_positive_rate: string;
    false_negative_rate: string;
    average_latency_ms: number;
    confidence_calibration: number;
    scenarios_passed: number;
    scenarios_flagged: number;
    scenarios_failed: number;
    enterprise_readiness_score: number;
    cost_accuracy_error: string;
  };
  charts: {
    detection_accuracy_by_scenario: {
      data: { labels: string[]; datasets: { data: number[] }[] };
    };
    confidence_vs_accuracy: {
      data: { datasets: { data: { x: number; y: number }[] }[] };
    };
    attack_detection_heatmap: {
      data: {
        rows: string[];
        columns: string[];
        values: number[][];
      };
    };
    detection_latency_distribution: {
      statistics: {
        mean: string;
        median: string;
        p95: string;
        target: string;
        compliance: string;
      };
    };
    performance_under_load: {
      data: {
        labels: string[];
        datasets: { label: string; data: number[] }[];
      };
    };
    deployment_readiness_scorecard: {
      data: { categories: { name: string; score: number; status: string; color: string }[] };
    };
    detection_speed_comparison: {
      data: { labels: string[]; datasets: { data: number[] }[] };
    };
  };
};

export const AI_KEY_METRICS = ai.key_metrics;

// Detection accuracy by scenario — real labels + real data values
export const AI_DETECTION_ACCURACY = ai.charts.detection_accuracy_by_scenario.data.labels.map((label, i) => ({
  name: label,
  accuracy: ai.charts.detection_accuracy_by_scenario.data.datasets[0].data[i],
  confidence: ai.charts.confidence_vs_accuracy.data.datasets[0].data[i]?.x ?? 0,
  latencyS: ai.charts.detection_speed_comparison.data.datasets[0].data[
    ai.charts.detection_speed_comparison.data.labels.indexOf(label)
  ] ?? 0,
  status: ai.charts.detection_accuracy_by_scenario.data.datasets[0].data[i] >= 90 ? 'pass' : 'warn',
}));

// Calibration scatter data from real confidence_vs_accuracy chart
export const AI_CALIBRATION_SCATTER = ai.charts.confidence_vs_accuracy.data.datasets[0].data;

// Latency stats from real detection_latency_distribution
export const AI_LATENCY_STATS = ai.charts.detection_latency_distribution.statistics;

// Performance under load from real data
export const AI_PERFORMANCE_UNDER_LOAD = ai.charts.performance_under_load.data.labels.map((label, i) => ({
  load: label,
  latency: ai.charts.performance_under_load.data.datasets[0].data[i],
  accuracy: ai.charts.performance_under_load.data.datasets[1].data[i],
  fp: ai.charts.performance_under_load.data.datasets[2].data[i],
}));

// Enterprise readiness from real deployment_readiness_scorecard
export const ENTERPRISE_SCORES = ai.charts.deployment_readiness_scorecard.data.categories.map(c => ({
  name: c.name,
  score: c.score,
  status: c.status,
  color: c.score >= 9 ? '#00D67C' : c.score >= 7 ? '#F5A623' : c.score >= 5 ? '#FF8C42' : '#FF4D6A',
  pct: Math.round(c.score * 10),
  detail: c.status === 'READY NOW'
    ? 'Zero compliance requirements. Core proxy + auth working.'
    : c.status === '4-6 WEEKS'
    ? '4-6 weeks: audit trail, semantic scoring, tool capability matrix.'
    : c.status === '8-12 WEEKS'
    ? '8-12 weeks: HIPAA BAA, SOC2 Type II, pen test, GDPR DPA.'
    : '6+ months: FedRAMP, SLSA L3, FIPS 140-2 validation required.',
}));

// Attack detection heatmap — real values
export const AI_HEATMAP = {
  rows: ai.charts.attack_detection_heatmap.data.rows,
  columns: ai.charts.attack_detection_heatmap.data.columns,
  values: ai.charts.attack_detection_heatmap.data.values,
};

// ── Benchmarks (real proxy-slo-by-concurrency-latest.json) ──────
export const BENCHMARK_TIERS = (benchSloRaw as {
  tiers: {
    concurrency: number;
    p95SloMs: number;
    correctness: { correctnessPct: number; total: number; passed: number };
    latencyMs: { p50: number; p95: number; p99: number; avg: number };
    throughput: { callsPerSecond: number; wallMs: number };
    sloResults: { p95Ms: number; p95Pass: boolean; overallPass: boolean };
  }[];
  overallPass: boolean;
  machine: { hostname: string; platform: string; cpuCount: number; node: string };
  httpSseVariant: { status: string; reason: string };
}).tiers.map(t => ({
  concurrency: t.concurrency,
  sloMs:       t.p95SloMs,
  p50:         t.latencyMs.p50,
  p95:         t.latencyMs.p95,
  p99:         t.latencyMs.p99,
  avg:         t.latencyMs.avg,
  cps:         t.throughput.callsPerSecond,
  correctness: t.correctness.correctnessPct,
  sloPass:     t.sloResults.overallPass,
  p95Pass:     t.sloResults.p95Pass,
}));

export const BENCHMARK_META = {
  timestamp:      (benchSloRaw as { timestamp: string }).timestamp,
  overallPass:    (benchSloRaw as { overallPass: boolean }).overallPass,
  platform:       (benchSloRaw as { machine: { platform: string } }).machine.platform,
  node:           (benchSloRaw as { machine: { node: string } }).machine.node,
  httpSseStatus:  (benchSloRaw as { httpSseVariant: { status: string; reason: string } }).httpSseVariant.status,
  httpSseReason:  (benchSloRaw as { httpSseVariant: { status: string; reason: string } }).httpSseVariant.reason,
};

// Benchmark overhead (passthrough/blocking)
export const BENCHMARK_OVERHEAD = {
  timestamp:       (benchReportRaw as { timestamp: string }).timestamp,
  passthrough_p50: (benchReportRaw as { scenarios: { passthrough: { p50: number } } }).scenarios.passthrough.p50,
  passthrough_p95: (benchReportRaw as { scenarios: { passthrough: { p95: number } } }).scenarios.passthrough.p95,
  blocking_p50:    (benchReportRaw as { scenarios: { blocking: { p50: number } } }).scenarios.blocking.p50,
  blocking_p95:    (benchReportRaw as { scenarios: { blocking: { p95: number } } }).scenarios.blocking.p95,
  baseline_p50:    (benchReportRaw as { scenarios: { baseline: { p50: number } } }).scenarios.baseline.p50,
  noPolicy:        (benchReportRaw as { overheadMs: { noPolicy: number } }).overheadMs.noPolicy,
  withPolicy:      (benchReportRaw as { overheadMs: { withPolicy: number } }).overheadMs.withPolicy,
};

// ── Traffic Summary (real 7-day proxy data) ───────────────────────
export const TRAFFIC_SUMMARY = {
  generatedAt:    (trafficRaw as { generatedAt: string }).generatedAt,
  windowDays:     (trafficRaw as { windowDays: number }).windowDays,
  totalCalls:     (trafficRaw as { totalCalls: number }).totalCalls,
  totalBlocked:   (trafficRaw as { totalBlocked: number }).totalBlocked,
  totalPassed:    (trafficRaw as { totalPassed: number }).totalPassed,
  blockRatePct:   Math.round(((trafficRaw as { totalBlocked: number }).totalBlocked / (trafficRaw as { totalCalls: number }).totalCalls) * 100),
  servers:        (trafficRaw as { servers: {
    serverName: string; calls: number; blocked: number; passed: number;
    blockRatePct: number; costUsd: number; lastSeen: string;
    topTools: { tool: string; count: number }[];
    topBlockRules: { rule: string; count: number; plainEnglish: string }[];
  }[] }).servers,
  topBlockRules:  (trafficRaw as { topBlockRules: { rule: string; count: number; plainEnglish: string }[] }).topBlockRules,
  topTools:       (trafficRaw as { topTools: { tool: string; count: number }[] }).topTools,
};

// ── Swarm Report (real PASS verdict from latest run) ─────────────
export const SWARM_REPORT = swarmReportRaw as {
  version: number;
  generatedAt: string;
  verdict: string;
  headline: string;
  sections: { id: string; title: string; markdown?: string; bullets?: string[]; items?: { priority: number; text: string }[] }[];
  meta: {
    trafficCalls: number;
    trafficBlocks: number;
    regressionPass: boolean;
    liveOk: boolean;
    swarmOk: boolean;
    userServersOk: number;
    userServersTotal: number;
  };
};

// ── Swarm Latest Run (gates, steps, timings) ─────────────────────
export const SWARM_LATEST = swarmLatestRaw as {
  version: number;
  mode: string;
  timestamp: string;
  commitSha: string;
  overall: boolean;
  gates: { corpus: boolean; parity: boolean; steps: boolean; scout: boolean; bypassCount: number; netNewBypassCount: number; maxBypasses: number; bypassBaseline: boolean };
  bypasses: { detected: number; baselineKnown: number; netNew: number; items: unknown[] };
  timings: { totalSec: number; steps: { label: string; elapsedSec: number }[] };
  steps: { label: string; ok: boolean; elapsedSec: number; timedOut: boolean }[];
  corpus: { totalEntries: number; fn: number; fp: number; attackBlockRate: number; benignPassRate: number };
  parity: { agreement: number; total: number; agreementRate: number; corpusMismatches: number };
};

// ── Calibration data (real semantic calibration) ─────────────────
export const CALIBRATION = calibrationRaw as {
  timestamp: string;
  windowDays: number;
  storage: string;
  llmConfigured: boolean;
  totals: { records: number; flagged: number; labeled: number; truePositive: number; falsePositive: number };
  metrics: { avgFlagConfidence: number; labeledFpRate: number };
  thresholds: {
    current: { GUARDIAN_SEMANTIC_MIN_CONFIDENCE: number; GUARDIAN_LOCAL_SEMANTIC_THRESHOLD: number };
    recommended: { GUARDIAN_SEMANTIC_MIN_CONFIDENCE: number; GUARDIAN_LOCAL_SEMANTIC_THRESHOLD: number };
    note: string;
  };
  profile: string;
  sampleFlagged: { id: string; toolName: string; confidence: number; categories: string[] }[];
  sampleLabeled: { id: string; toolName: string; confidence: number; label: string; categories: string[] }[];
};

// ── Bypasses (real — should be 0) ────────────────────────────────
export const BYPASSES = bypassesRaw as {
  bypasses: unknown[];
  count: number;
  netNew: number;
  baselineKnown: number;
};

// ── Gates config (real thresholds from security-swarm/config) ────
export const GATES_CONFIG = gatesRaw as {
  version: number;
  corpus: { minAttackBlockRate: number; maxBenignFalsePositiveRate: number; minEntries: number };
  parity: { minCorpusAgreementRate: number; minOverallAgreementRate: number };
  evasion: { maxBypasses: number };
  threatLab: { requireLlm: boolean; maxFallbackCandidates: number; minReplayBlockRate: number };
  vitest: { maxFailures: number };
};

// ── Guardian Configs (real dogfood MCP server configs) ───────────
export const GUARDIAN_CONFIGS = guardianCfgsRaw as {
  name: string;
  description: string;
  content: string;
}[];

// ── Threat Lab Job (real last run) ────────────────────────────────
export const THREAT_LAB_JOB = threatLabJobRaw as {
  jobId: string;
  state: string;
  phase: string;
  phaseLabel: string;
  progressPct: number;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  kind: string;
  tenantId: string;
};

// ── Auto Research Job (real last run) ─────────────────────────────
export const AUTO_RESEARCH_JOB = autoResJobRaw as {
  jobId: string;
  state: string;
  phase: string;
  phaseLabel: string;
  progressPct: number;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  kind: string;
  tenantId: string;
};

// ── Derived KPIs (computed from real data, not hardcoded) ─────────
export const LIVE_KPIS = {
  detectionRate:    parseFloat(AI_KEY_METRICS.overall_detection_rate),     // 95.9
  fpRate:           parseFloat(AI_KEY_METRICS.false_positive_rate),        // 2.1
  fnRate:           parseFloat(AI_KEY_METRICS.false_negative_rate),        // 1.3
  latencyMs:        AI_KEY_METRICS.average_latency_ms,                     // 48
  confidence:       AI_KEY_METRICS.confidence_calibration,                 // 0.88
  scenariosPassed:  AI_KEY_METRICS.scenarios_passed,                       // 9
  scenariosFlagged: AI_KEY_METRICS.scenarios_flagged,                      // 2
  scenariosFailed:  AI_KEY_METRICS.scenarios_failed,                       // 0
  totalScenarios:   AI_KEY_METRICS.scenarios_passed + AI_KEY_METRICS.scenarios_flagged + AI_KEY_METRICS.scenarios_failed,
  enterpriseScore:  AI_KEY_METRICS.enterprise_readiness_score,             // 7.0
  totalAttacks:     ATTACK_HARNESS_META.count,                             // 155
  totalCalls:       TRAFFIC_SUMMARY.totalCalls,                            // 27800
  totalBlocked:     TRAFFIC_SUMMARY.totalBlocked,                         // 25214
  blockRatePct:     TRAFFIC_SUMMARY.blockRatePct,                         // 91
  bypassCount:      BYPASSES.count,                                        // 0
  swarmVerdict:     SWARM_REPORT.verdict,                                  // PASS
  swarmTimestamp:   SWARM_LATEST.timestamp,
  commitSha:        SWARM_LATEST.commitSha,
  corpusEntries:    SWARM_LATEST.corpus.totalEntries,                      // 300
  calibFpRate:      CALIBRATION.metrics.labeledFpRate,                     // 0.034
  calibConfidence:  CALIBRATION.metrics.avgFlagConfidence,                 // 0.791
};
