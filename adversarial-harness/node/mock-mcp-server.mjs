#!/usr/bin/env node
/**
 * Minimal MCP stdio mock server — JSON-RPC 2.0 over newline-delimited stdin/stdout.
 * Supports initialize, tools/list, tools/call (echo + policy probe).
 */
import { createInterface } from 'node:readline';

const TOOLS = [
  {
    name: 'echo',
    description: 'Echo arguments back',
    inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
  },
  {
    name: 'search',
    description: 'Search (harness probe)',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function handle(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'harness-mock-mcp', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    return;
  }

  if (method === 'tools/call') {
    const name = params?.name ?? 'echo';
    const args = params?.arguments ?? {};
    send({
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify({ tool: name, args }) }],
        isError: false,
      },
    });
    return;
  }

  if (id !== undefined) {
    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    handle(JSON.parse(trimmed));
  } catch (err) {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: String(err) },
    });
  }
});

process.stdin.resume();
