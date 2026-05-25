# MCP Guardian

**A security layer that sits between your AI agent and its tools — so nothing bad gets through.**

[![npm version](https://img.shields.io/npm/v/@mcp-guardian/server)](https://www.npmjs.com/package/@mcp-guardian/server)
[![npm downloads](https://img.shields.io/npm/dm/@mcp-guardian/server)](https://www.npmjs.com/package/@mcp-guardian/server)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![CI](https://github.com/rudraneel93/mcp-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/rudraneel93/mcp-guardian/actions/workflows/ci.yml)

**[Website](https://mcp-guardian-cloud.vercel.app) · [npm](https://www.npmjs.com/package/@mcp-guardian/server) · [Changelog](CHANGELOG.md)**

---

## What is it?

When you use an AI assistant (like Claude, Cursor, or Cline), it connects to tool servers — things like GitHub, a database, your filesystem, or Slack. These connections use a standard called **MCP (Model Context Protocol)**.

The problem: there's nothing stopping the AI from making dangerous tool calls, leaking secrets, running commands it shouldn't, or burning through your API budget without you knowing.

**MCP Guardian** sits in the middle. Every tool call the AI makes passes through Guardian first. Guardian checks it against your rules and either lets it through, blocks it, or flags it for review — before anything happens.

```
Your AI assistant
       │
       ▼
  MCP Guardian  ◄── checks every call against your rules
       │
       ▼
  Your tool servers (GitHub, filesystem, database...)
```

---

## Features

### 🛡️ Security — blocks dangerous calls before they happen

- **Dangerous command detection** — blocks things like `bash`, `exec`, `curl`, `rm -rf`, and other shell commands the AI should never run
- **Path protection** — stops the AI from reading sensitive files like `/etc/passwd`, `.ssh/`, `.env`, and Kubernetes secrets
- **SQL injection prevention** — catches bulk data dumps, `DROP TABLE`, `UNION SELECT`, and other database attacks inside tool arguments
- **Secret detection** — scans for exposed API keys, tokens, and passwords in tool arguments before they leave your system
- **URL protection** — blocks SSRF attacks where the AI tries to reach internal services like `localhost`, `169.254.x.x` (cloud metadata), or private IP ranges
- **Unicode attack detection** — catches invisible characters and lookalike Unicode used to hide malicious instructions
- **CVE scanning** — checks your MCP server packages against known vulnerability databases
- **Typo-squat detection** — warns if a package name looks suspiciously similar to a well-known one

### 💰 Cost tracking — see exactly what your AI is spending

- **Per-call cost tracking** — records the USD cost and token count of every tool call, using real provider rates
- **Burn rate monitoring** — shows how much you're spending per hour and projects your monthly bill
- **Budget alerts** — set a daily budget and get alerted when you're getting close
- **Per-tool breakdown** — see which tools and servers cost the most
- **Cost history** — view spending over the last 7, 14, or 30 days

### 📊 Health monitoring — know when something is wrong

- **Latency tracking** — measures how fast each MCP server responds
- **Success rate** — tracks how often each server succeeds vs fails
- **Circuit breaker** — automatically marks a server as unhealthy if it keeps failing
- **Overload detection** — warns if a server is exposing too many tools (which confuses agents)
- **Tool inventory** — shows how many tools each server exposes

### 📋 Policy rules — you decide what's allowed

- Write rules in plain YAML to control exactly what the AI can and can't do
- Block specific tools entirely
- Allow only certain tools (allowlist mode)
- Match patterns in arguments — e.g. block any SQL that contains `DROP TABLE`
- Set rate limits — e.g. no more than 120 tool calls per minute
- Set token budgets — e.g. block calls that would use more than 50,000 tokens
- Hot-reload rules without restarting anything

### 📡 Live SOC Dashboard — see everything in real time

A security operations dashboard that shows you everything that's happening:

- **Live metrics** — total requests, blocked calls, pass rate, cost — refreshes automatically
- **Audit log** — every single tool call with its result (blocked or passed), reason, cost, and timestamp
- **Security posture** — CVE findings, auth status, secrets detected, scores per server
- **Health panel** — latency, success rates, circuit breaker states
- **Cost governance** — spending charts, burn rate, projections, budget utilization
- **Heatmap** — which rules are blocking which tools, visualized as a grid
- **Policy editor** — edit and save your policy rules from inside the dashboard
- **Insights** — plain-English summaries of what's happening ("3 servers healthy, GitHub is slow, 2 blocks from path-traversal rule today")

---

## How it works

1. You install MCP Guardian
2. Guardian wraps your existing MCP server configs (it finds them automatically in Cline, Claude Desktop, Cursor, etc.)
3. Every tool call now goes through Guardian first
4. Guardian checks the call against your policy rules
5. If it passes: the call goes to the real server and the response comes back
6. If it's blocked: the AI gets told the call was denied — nothing reaches the real server
7. Everything is logged to a local SQLite database
8. The SOC dashboard reads from that database and shows you live data

---

## Quick Setup

### Install

```bash
npm install -g @mcp-guardian/server
```

### Onboard (one command — sets everything up)

```bash
mcp-guardian onboard
```

This finds your MCP configs (Cline, Claude Desktop, Cursor, Windsurf), wraps the servers, and sets up Guardian as the proxy. Takes about 30 seconds.

### Or run manually

```bash
# Start the proxy with the default policy
mcp-guardian proxy --policy default-policy.yaml
```

### Open the SOC Dashboard

**Terminal 1 — API backend:**
```bash
pnpm soc:api:dev
```

**Terminal 2 — Dashboard:**
```bash
pnpm dashboard:dev
```

Then open **http://localhost:3000** in your browser.

> The dashboard connects to the live backend automatically and shows real data from your actual traffic.

---

## The Policy File

Your rules live in `default-policy.yaml`. Here's a simple example:

```yaml
version: '1.0'
policy:
  mode: block           # block anything not explicitly allowed
  default_action: block

  rules:
    - name: allow-safe-tools
      description: Only allow read-only tools
      action: block
      tools:
        allow:
          - read_file
          - list_directory
          - search

    - name: block-shell-commands
      description: Never let the AI run shell commands
      action: block
      tools:
        deny:
          - bash
          - execute_command
          - eval

    - name: rate-limit
      description: Max 60 tool calls per minute
      action: block
      maxCallsPerMinute: 60
```

The default policy already blocks ~300 known attack patterns. You can extend it or write your own from scratch.

---

## Environment Variables

You only need these if you want to override defaults:

| Variable | What it does |
|---|---|
| `MCP_GUARDIAN_POLICY` | Path to your policy YAML file |
| `MCP_GUARDIAN_DB_PATH` | Where to save the call history database |
| `GUARDIAN_DAILY_BUDGET_USD` | Set a daily cost budget (triggers alerts) |
| `SOC_API_PORT` | Port for the dashboard API backend (default: 4040) |
| `ANTHROPIC_API_KEY` | Required for AI-powered features (semantic audit, threat lab) |

---

## What's in the box

| Component | What it is |
|---|---|
| `mcp-guardian proxy` | The main proxy that intercepts tool calls |
| `mcp-guardian onboard` | One-command setup that finds and wraps your configs |
| `mcp-guardian tui` | Terminal UI for watching live traffic |
| `mcp-guardian doctor` | Health check for your setup |
| `src/soc-api-server.ts` | Backend API server (serves real data to the dashboard) |
| `deploy/dashboard-spa/` | SOC Dashboard — the visual interface |
| `default-policy.yaml` | Default rules (blocks ~300 attack patterns) |
| `policy-templates/` | Ready-made policy templates for different use cases |

---

## SOC Dashboard API

The dashboard talks to a backend API server that reads from your real data. See **[SOC-API.md](SOC-API.md)** for the full API reference and deployment guide.

---

## How the advanced features work (diagrams)

### The Security Swarm — continuous red-teaming

![Security Swarm architecture](docs/assets/security-swarm-architecture.png)

Think of the Security Swarm as a team of AI agents working around the clock to find weaknesses in your setup before attackers do.

There are two tracks running in parallel:

- **The testing track (top)** — Scout agents generate attack attempts, test them against your policy, check if any slip through, and write up a report. This runs automatically and keeps a library of 300+ known attacks up to date.
- **The learning track (bottom)** — Every time the live proxy blocks a real tool call, a learning agent looks at it, compares it to known patterns, and teaches the system to recognize similar attacks faster next time.

The two tracks feed each other: real-world blocks strengthen the test library, and new test discoveries improve live detection. It's a self-improving loop that never stops.

> **Pro feature** — requires a license key. Run with `pnpm security-swarm`.

---

### Threat Lab — AI discovers new attack patterns

![LLM Threat Discovery architecture](docs/assets/llm-threat-discovery-architecture.png)

The Threat Lab uses a local AI model (Ollama/Qwen) to invent new attack patterns that haven't been seen before.

Here's how it works step by step:

1. **Gather signals** — it looks at recent blocks from the proxy, semantic flags, CVE databases, and the swarm's bypass findings
2. **Generate attacks** — the LLM proposes new attack fixtures and potential YAML rule additions based on those signals
3. **Validate** — automated gates check if the proposals are valid and don't break anything
4. **Human review** — before anything is added to your policy, **you review and approve it**. Nothing applies automatically.

This means the system gets smarter over time, but you stay in control of every change.

> **Pro feature** — requires a license key + local Ollama with `qwen3:8b`. Run with `pnpm security-swarm:threat-lab`.

---

### Auto Threat Research — autonomous attack library building

![Self-Sustaining Threat Research architecture](docs/assets/auto-threat-research-architecture.png)

While the Threat Lab requires you to trigger it, Auto Threat Research runs in the background automatically whenever something interesting happens.

The flow:

1. **Watch for signals** — the proxy detects a semantic flag, a repeat block, or a CVE hit
2. **Queue it** — these signals are batched up (it waits a few seconds to group related events)
3. **Research it** — the LLM investigates: what attack class is this? What variations exist?
4. **Classify and write** — the finding is classified by type and written to the attack corpus

Importantly: **nothing is auto-applied to your policy**. This is an audit-only research loop. It just builds your library of known attacks for future reference and rule suggestions.

> **Pro feature** — runs automatically when `GUARDIAN_THREAT_RESEARCH_AUTO=true` is set.

---

## Pro Features

- **Security Swarm** — autonomous AI agents that continuously red-team your setup and discover new attack patterns
- **Threat Lab** — LLM-powered threat discovery (uses local Ollama or cloud LLM)
- **Fleet management** — manage multiple Guardian instances across servers
- **Enterprise deployment** — Kubernetes Helm chart, PostgreSQL backend, multi-tenancy, SSO

Get a Pro license at **[mcp-guardian-cloud.vercel.app](https://mcp-guardian-cloud.vercel.app)** ($4.99 lifetime).

Community features (everything in this README) are free and MIT licensed.

---

## Supported AI Clients

MCP Guardian auto-discovers config files from:

- **Cline** (VS Code extension)
- **Claude Desktop**
- **Cursor**
- **Windsurf**

Or point it at any MCP config file with `--config path/to/config.json`.

---

## License

MIT for all community features. See [LICENSE](LICENSE) and [COMMUNITY_SCOPE.md](COMMUNITY_SCOPE.md) for details.
Pro features are covered by [LICENSE-PRO](LICENSE-PRO).
