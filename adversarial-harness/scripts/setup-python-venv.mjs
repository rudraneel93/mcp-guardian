#!/usr/bin/env node
/**
 * Create/use adversarial-harness/.venv and install Python deps (PEP 668 safe).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(__dir, '..');
const VENV = join(HARNESS, '.venv');
const PY = join(VENV, 'bin', 'python3');
const REQ = join(HARNESS, 'python', 'requirements.txt');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf-8', ...opts });
  return r;
}

function systemPythonOk() {
  const check = run('python3', [
    '-c',
    'import yaml; import policy_engine',
  ], { env: { ...process.env, PYTHONPATH: join(HARNESS, 'python') } });
  return check.status === 0;
}

if (!existsSync(PY)) {
  const v = run('python3', ['-m', 'venv', VENV]);
  if (v.status !== 0) {
    process.stderr.write(
      `[setup-python-venv] venv unavailable (${v.stderr || v.stdout || 'unknown'}); `,
    );
    if (systemPythonOk()) {
      process.stderr.write('using system python3 + PYTHONPATH\n');
      process.stdout.write('python3');
      process.exit(0);
    }
    console.error(v.stderr || v.stdout);
    process.exit(1);
  }
}

const pip = run(PY, ['-m', 'pip', 'install', '-q', '-r', REQ]);
if (pip.status !== 0) {
  process.stderr.write(`[setup-python-venv] pip install failed; `);
  if (systemPythonOk()) {
    process.stderr.write('using system python3 + PYTHONPATH\n');
    process.stdout.write('python3');
    process.exit(0);
  }
  console.error(pip.stderr || pip.stdout);
  process.exit(1);
}

process.stdout.write(PY);
