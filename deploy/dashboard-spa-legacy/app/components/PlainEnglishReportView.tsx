'use client';

import type { PlainEnglishReport } from '@/lib/guardian-api';
import { MarkdownBlock } from './MarkdownBlock';

type Section = NonNullable<PlainEnglishReport['sections']>[number];

export function PlainEnglishReportView({ report }: { report: PlainEnglishReport }) {
  const sections = report.sections ?? [];

  return (
    <article className="plain-english-report" aria-label="Plain English security report">
      {report.headline ? (
        <header className={`verdict-banner ${verdictClass(report.verdict)}`}>
          <span className="verdict-label">{report.verdict || 'REVIEW'}</span>
          <p className="verdict-headline">{report.headline}</p>
        </header>
      ) : null}

      {sections.map((section) => (
        <ReportSection key={section.id} section={section} />
      ))}

      {report.generatedAt ? (
        <p className="hint report-generated">
          Generated {new Date(String(report.generatedAt)).toLocaleString()}
        </p>
      ) : null}
    </article>
  );
}

function ReportSection({ section }: { section: Section }) {
  if (section.markdown) {
    return (
      <div className="plain-english-block">
        <h4>{section.title}</h4>
        <MarkdownBlock source={section.markdown} />
      </div>
    );
  }

  if (section.bullets?.length) {
    return (
      <div className="plain-english-block">
        <h4>{section.title}</h4>
        <ul className="report-bullets">
          {section.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (section.items?.length) {
    return (
      <div className="actions-block">
        <h4>{section.title}</h4>
        <ol className="action-list">
          {section.items.map((item, i) => (
            <li key={i}>{item.text}</li>
          ))}
        </ol>
      </div>
    );
  }

  return null;
}

function verdictClass(verdict?: string): string {
  const v = (verdict || '').toUpperCase();
  if (v === 'PASS') return 'verdict-pass';
  if (v === 'FAIL') return 'verdict-fail';
  return 'verdict-review';
}
