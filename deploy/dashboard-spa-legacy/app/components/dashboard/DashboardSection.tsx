'use client';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardSection({
  title,
  subtitle,
  lastUpdated,
  actions,
  children,
  className = '',
}: Props) {
  return (
    <section className={`dash-section ${className}`.trim()}>
      <header className="dash-section-head">
        <div>
          <h2 className="dash-section-title">{title}</h2>
          {subtitle ? <p className="dash-section-sub">{subtitle}</p> : null}
          {lastUpdated ? <p className="dash-section-updated">Updated {lastUpdated}</p> : null}
        </div>
        {actions ? <div className="dash-section-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
