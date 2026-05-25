#!/usr/bin/env node
/**
 * Create/use adversarial-harness/.venv and install Python deps (PEP 668 safe).
 * Prints the python executable path to stdout (venv or system fallback).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(__dir, '..');
const VENV = join(HARNESS, '.venv');
const PY = join(VENV, 'bin', 'python3');
const REQ = join(HARNESS, 'python', 'requirements.txt');
const PYTHONPATH = join(HARNESS, 'python');

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf-8', ...opts });
}

function pythonCanImportYaml(bin) {
  const check = run(bin, ['-c', 'import yaml'], {
    env: { ...process.env, PYTHONPATH },
  });
  return check.status === 0;
}

function ensurePip(bin) {
  const pipCheck = run(bin, ['-m', 'pip', '--version']);
  if (pipCheck.status === 0) return true;
  const boot = run(bin, ['-m', 'ensurepip', '--upgrade'], { stdio: 'pipe' });
  if (boot.status === 0) return true;
  const getPip = run(bin, ['-m', 'ensurepip', '--default-pip'], { stdio: 'pipe' });
  return getPip.status === 0;
}

function pipInstall(bin) {
  if (!ensurePip(bin)) return false;
  const pip = run(bin, ['-m', 'pip', 'install', '-q', '-r', REQ]);
  return pip.status === 0;
}

function installSystemPyyaml() {
  const pip = run('python3', ['-m', 'pip', 'install', '-q', 'pyyaml>=6.0.1'], {
    env: { ...process.env, PIP_BREAK_SYSTEM_PACKAGES: '1' },
  });
  return pip.status === 0 && pythonCanImportYaml('python3');
}

function recreateVenv() {
  if (existsSync(VENV)) {
    try {
      rmSync(VENV, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
  const v = run('python3', ['-m', 'venv', VENV]);
  return v.status === 0 && existsSync(PY);
}

let chosen = 'python3';

if (!existsSync(PY)) {
  if (!recreateVenv()) {
    process.stderr.write('[setup-python-venv] venv create failed; trying system python3\n');
  }
}

if (existsSync(PY)) {
  if (!pythonCanImportYaml(PY)) {
    if (!pipInstall(PY)) {
      process.stderr.write('[setup-python-venv] venv pip install failed; recreating venv\n');
      if (recreateVenv() && pipInstall(PY) && pythonCanImportYaml(PY)) {
        chosen = PY;
      }
    } else if (pythonCanImportYaml(PY)) {
      chosen = PY;
    }
  } else {
    chosen = PY;
  }
}

if (chosen !== PY || !pythonCanImportYaml(chosen)) {
  if (!pythonCanImportYaml('python3')) {
    installSystemPyyaml();
  }
  if (pythonCanImportYaml('python3')) {
    process.stderr.write('[setup-python-venv] using system python3 + PYTHONPATH\n');
    chosen = 'python3';
  } else {
    console.error('[setup-python-venv] could not install pyyaml for venv or system python3');
    process.exit(1);
  }
}

process.stdout.write(chosen);
