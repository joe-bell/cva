/**
 * Validates `benchmark-<package>.json` files (see test/bench/scripts/report.ts) and
 * renders them as a markdown comparison table.
 *
 * This module is intentionally Node-stdlib-only with zero dependencies: it's
 * the piece that runs in the privileged sticky-comment workflow, where the
 * input directory holds an artifact uploaded by an untrusted `pull_request`
 * job (including from forks). Treat everything read here as hostile —
 * strict allowlists, size caps, and markdown-escaping before anything from
 * the input is ever written to the rendered comment.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FILE_BYTES = 512 * 1024;
const MAX_IMPLEMENTATIONS = 6;
const MAX_TASKS = 24;
const MAX_STRING = 200;
const MAX_TASK_NAME = 80;

const ALLOWED_FILENAMES: Record<string, string> = {
  "benchmark-cva.json": "cva",
  "benchmark-class-variance-authority.json": "class-variance-authority",
};

const ALLOWED_LABELS = new Set(["local", "release", "prerelease"]);
const SAFE_SHORT = /^[\w.\- ]{1,64}$/;
const SAFE_COMMIT = /^(unknown|[0-9a-f]{7,40})$/i;
const SAFE_VERSION = /^[\w.\-+]{1,64}$/;
// Deliberately excludes `[ ] ( ) ! /` and bare URLs: task names are
// PR-controlled (a fork can edit `*.bench.ts` freely), so this allowlist
// — not just escaping — is what makes markdown link/image injection into
// the rendered comment impossible, not just awkward.
const SAFE_TASK_NAME = /^[\w :,._+'-]{1,80}$/;
// Skipped reasons are PR-controlled via the untrusted benchmark artifact.
const SAFE_SKIPPED = /^[\w :.,_'()/-]{1,200}$/;
// Canonical UTC instant from Date#toISOString() — no offsets, no date-only.
const CANONICAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function assertSkippedReason(value: unknown): string {
  const skipped = assertString(value, "implementation.skipped", SAFE_SKIPPED);
  if (/https?:\/\//i.test(skipped) || skipped.includes("@")) {
    fail('"implementation.skipped" contains a disallowed URL or mention');
  }
  return skipped;
}

/**
 * Normalizes a (possibly tool-generated) skip reason so it always satisfies
 * `assertSkippedReason`. The trusted producer (test/bench/scripts/report.ts)
 * runs its baseline skip reasons through this before writing the artifact:
 * a real error message — a failed `pnpm add` mentioning `pkg@version`, or a
 * registry URL from a network failure — would otherwise trip the
 * consumer-side allowlist and suppress the entire comment instead of
 * skipping that one baseline. The consumer keeps rejecting non-conforming
 * reasons (a hostile artifact still fails closed); this only guarantees our
 * own artifacts never produce one.
 */
export function sanitizeSkippedReason(raw: string): string {
  const cleaned = raw
    .replace(/https?:\/\/\S+/gi, "url")
    .replace(/@/g, " at ")
    .replace(/[^\w :.,_'()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200)
    .trim();
  return cleaned.length > 0 ? cleaned : "unavailable";
}

export interface Task {
  name: string;
  hz: number;
  mean: number;
  rme: number;
  samples: number;
}

export interface Implementation {
  label: string;
  version: string;
  tasks?: Task[];
  skipped?: string;
}

export interface BenchmarkResult {
  schemaVersion: number;
  package: string;
  node: string;
  os: string;
  commit: string;
  timestamp: string;
  implementations: Implementation[];
}

function fail(message: string): never {
  throw new Error(`benchmark artifact validation failed: ${message}`);
}

function assertString(
  value: unknown,
  field: string,
  pattern?: RegExp,
  maxLength = MAX_STRING,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    fail(`"${field}" must be a non-empty string of at most ${maxLength} chars`);
  }
  if (pattern && !pattern.test(value)) {
    fail(`"${field}" has an unexpected format`);
  }
  return value;
}

function assertCanonicalTimestamp(value: unknown, field: string): string {
  const timestamp = assertString(value, field, CANONICAL_TIMESTAMP, 30);
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    fail(`"${field}" is not a valid date`);
  }
  if (parsed.toISOString() !== timestamp) {
    fail(`"${field}" must be a canonical UTC instant`);
  }
  return timestamp;
}

function assertFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail(`"${field}" must be a finite, non-negative number`);
  }
  return value;
}

function assertExactKeys(value: unknown, allowed: string[], context: string) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${context} must be an object`);
  }
  const keys = Object.keys(value as object);
  for (const key of keys) {
    if (!allowed.includes(key)) fail(`${context} has unexpected key "${key}"`);
  }
}

function validateTask(raw: unknown): Task {
  assertExactKeys(raw, ["name", "hz", "mean", "rme", "samples"], "task");
  const task = raw as Record<string, unknown>;
  const name = assertString(
    task.name,
    "task.name",
    SAFE_TASK_NAME,
    MAX_TASK_NAME,
  );
  const hz = assertFiniteNumber(task.hz, "task.hz");
  const mean = assertFiniteNumber(task.mean, "task.mean");
  const rme = assertFiniteNumber(task.rme, "task.rme");
  const samples = assertFiniteNumber(task.samples, "task.samples");
  if (!Number.isInteger(samples)) fail('"task.samples" must be an integer');
  return { name, hz, mean, rme, samples };
}

function validateImplementation(raw: unknown): Implementation {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail("implementation must be an object");
  }
  const impl = raw as Record<string, unknown>;
  const hasTasks = "tasks" in impl;
  const hasSkipped = "skipped" in impl;
  if (hasTasks === hasSkipped) {
    fail('implementation must have exactly one of "tasks" or "skipped"');
  }

  assertExactKeys(
    impl,
    hasTasks ? ["label", "version", "tasks"] : ["label", "version", "skipped"],
    "implementation",
  );

  const label = assertString(impl.label, "implementation.label", undefined, 32);
  if (!ALLOWED_LABELS.has(label))
    fail(`unexpected implementation label "${label}"`);
  const version = assertString(
    impl.version,
    "implementation.version",
    SAFE_VERSION,
  );

  if (hasSkipped) {
    const skipped = assertSkippedReason(impl.skipped);
    return { label, version, skipped };
  }

  if (
    !Array.isArray(impl.tasks) ||
    impl.tasks.length === 0 ||
    impl.tasks.length > MAX_TASKS
  ) {
    fail(`"tasks" must be a non-empty array of at most ${MAX_TASKS} entries`);
  }
  return { label, version, tasks: impl.tasks.map(validateTask) };
}

export function validateResult(
  raw: unknown,
  expectedPackage: string,
): BenchmarkResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail("root value must be an object");
  }
  assertExactKeys(
    raw,
    [
      "schemaVersion",
      "package",
      "node",
      "os",
      "commit",
      "timestamp",
      "implementations",
    ],
    "root",
  );
  const data = raw as Record<string, unknown>;

  if (data.schemaVersion !== 1)
    fail(`unsupported schemaVersion "${data.schemaVersion}"`);
  const pkg = assertString(data.package, "package");
  if (pkg !== expectedPackage) {
    fail(
      `"package" (${pkg}) does not match filename-derived package (${expectedPackage})`,
    );
  }
  const node = assertString(data.node, "node", SAFE_SHORT, 64);
  const os = assertString(data.os, "os", SAFE_SHORT, 64);
  const commit = assertString(data.commit, "commit", SAFE_COMMIT, 40);
  const timestamp = assertCanonicalTimestamp(data.timestamp, "timestamp");

  if (
    !Array.isArray(data.implementations) ||
    data.implementations.length === 0
  ) {
    fail('"implementations" must be a non-empty array');
  }
  if (data.implementations.length > MAX_IMPLEMENTATIONS) {
    fail(
      `"implementations" exceeds the maximum of ${MAX_IMPLEMENTATIONS} entries`,
    );
  }

  return {
    schemaVersion: 1,
    package: pkg,
    node,
    os,
    commit,
    timestamp,
    implementations: data.implementations.map(validateImplementation),
  };
}

/**
 * Reads and validates every `benchmark-<package>.json` file present in
 * `dir`. Only the exact allowlisted filenames are read — anything else in
 * the directory (however named) is ignored, not walked or globbed.
 */
export function validateResults(dir: string): BenchmarkResult[] {
  const entries = readdirSync(dir);
  const results: BenchmarkResult[] = [];

  for (const filename of entries) {
    const expectedPackage = ALLOWED_FILENAMES[filename];
    if (!expectedPackage) continue;

    const filePath = path.join(dir, filename);
    const stats = statSync(filePath);
    if (!stats.isFile()) continue;
    if (stats.size > MAX_FILE_BYTES) {
      fail(`${filename} exceeds the ${MAX_FILE_BYTES}-byte cap`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      fail(`${filename} is not valid JSON (${(error as Error).message})`);
    }

    results.push(validateResult(parsed, expectedPackage));
  }

  if (results.length === 0) {
    fail(`no benchmark result files found in ${dir}`);
  }

  return results;
}

/* Rendering
  ============================================ */

function escapeInlineCode(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/`/g, "'");
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "\\|")
    .replace(/`/g, "'")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")");
}

function formatOps(hz: number, rme: number): string {
  const ops = Math.round(hz).toLocaleString("en-US");
  return `${ops} ops/s ±${rme.toFixed(2)}%`;
}

const NOISE_THRESHOLD_PERCENT = 5;

function formatDelta(local: number, baseline: number): string {
  const delta = ((local - baseline) / baseline) * 100;
  const sign = delta >= 0 ? "+" : "";
  const formatted = `${sign}${delta.toFixed(1)}%`;
  if (delta > NOISE_THRESHOLD_PERCENT) return `🟢 ${formatted}`;
  if (delta < -NOISE_THRESHOLD_PERCENT) return `🔴 ${formatted}`;
  return formatted;
}

function renderPackageSection(result: BenchmarkResult): string {
  const local = result.implementations.find((impl) => impl.label === "local");
  const baselines = result.implementations.filter(
    (impl) => impl.label !== "local",
  );

  const lines: string[] = [];
  lines.push(`### \`${escapeMarkdown(result.package)}\``);
  lines.push("");

  const header = [
    "Task",
    "This PR",
    ...baselines.flatMap((b) => [
      `\`${escapeMarkdown(b.version)}\` (${b.label})`,
      "Δ",
    ]),
  ];
  const alignment = header.map((_, i) => (i === 0 ? "---" : "---:"));
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${alignment.join(" | ")} |`);

  // Union across every implementation (local first), not just local — with
  // local missing, baseline columns must still render their rows instead
  // of silently dropping the whole table body.
  const taskNames = [
    ...new Set(
      result.implementations.flatMap(
        (impl) => impl.tasks?.map((t) => t.name) ?? [],
      ),
    ),
  ];
  for (const name of taskNames) {
    const localTask = local?.tasks?.find((t) => t.name === name);
    const row: string[] = [
      escapeMarkdown(name),
      localTask ? formatOps(localTask.hz, localTask.rme) : "—",
    ];

    for (const baseline of baselines) {
      const baselineTask = baseline.tasks?.find((t) => t.name === name);
      if (!baselineTask) {
        row.push("—", "—");
        continue;
      }
      row.push(formatOps(baselineTask.hz, baselineTask.rme));
      row.push(
        localTask && baselineTask.hz > 0
          ? formatDelta(localTask.hz, baselineTask.hz)
          : "—",
      );
    }

    lines.push(`| ${row.join(" | ")} |`);
  }

  lines.push("");

  for (const baseline of baselines) {
    if (baseline.skipped) {
      lines.push(
        `_\`${escapeMarkdown(result.package)}@${escapeMarkdown(baseline.version)}\` (${baseline.label}) — \`${escapeInlineCode(baseline.skipped)}\`._`,
      );
    }
  }
  if (!local?.tasks) {
    lines.push(
      `_No local benchmark results for \`${escapeMarkdown(result.package)}\`._`,
    );
  }

  return lines.join("\n").trimEnd();
}

export function renderMarkdown(results: BenchmarkResult[]): string {
  const sections = [...results]
    .sort((a, b) => a.package.localeCompare(b.package))
    .map(renderPackageSection);

  const first = results[0];
  const footer = `<sub>Commit \`${escapeMarkdown(first.commit.slice(0, 7))}\` · Node ${escapeMarkdown(first.node)} · ${escapeMarkdown(first.os)} · ${escapeMarkdown(first.timestamp)}</sub>`;

  return [
    "## Benchmarks",
    "",
    "Comparing this PR's local benchmark run against the published npm versions (baselines resolved from each package's npm dist-tags — `beta` for `cva`, `latest` for `class-variance-authority`). Higher ops/s is better. Shared CI runners are noisy — treat deltas within ±5% as noise. Moves beyond that band are marked 🟢 (faster than the baseline) or 🔴 (slower).",
    "",
    sections.join("\n\n"),
    "",
    footer,
    "",
    "<sub>Metrics are produced by the untrusted PR benchmark job and validated for shape only — they are not authenticated. Treat large swings as a signal to investigate locally, not as proof of a regression.</sub>",
  ].join("\n");
}

/* CLI
  ============================================ */

function parseArgs(argv: string[]) {
  let dir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../test/bench/.output",
  );
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir" && argv[i + 1]) dir = argv[++i];
  }
  return { dir };
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  const { dir } = parseArgs(process.argv.slice(2));
  try {
    const results = validateResults(dir);
    console.log(renderMarkdown(results));
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
