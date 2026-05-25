'use client';

import type { ReactNode } from 'react';

/** Lightweight markdown renderer (headings, lists, bold) — no extra deps. */
export function MarkdownBlock({ source, className = '' }: { source: string; className?: string }) {
  const lines = source.split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={key} className="md-list">
        {listItems.map((item, i) => (
          <li key={`${key}-${i}`}>{formatInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }
    flushList(`list-${i}`);
    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h5 key={`h-${i}`} className="md-h3">
          {formatInline(trimmed.slice(4))}
        </h5>,
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h4 key={`h-${i}`} className="md-h2">
          {formatInline(trimmed.slice(3))}
        </h4>,
      );
      return;
    }
    if (!trimmed) {
      nodes.push(<br key={`br-${i}`} />);
      return;
    }
    nodes.push(
      <p key={`p-${i}`} className="md-p">
        {formatInline(trimmed)}
      </p>,
    );
  });
  flushList('list-end');

  return <div className={`markdown-block ${className}`.trim()}>{nodes}</div>;
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
