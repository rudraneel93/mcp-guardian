'use client';

import { Fragment, useMemo, useState } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  expandable?: (row: T) => React.ReactNode;
  pageSize?: number;
  exportFilename?: string;
};

export function DataTablePro<T>({
  columns,
  rows,
  rowKey,
  expandable,
  pageSize = 25,
  exportFilename,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const slice = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const onExport = () => {
    if (!exportFilename) return;
    const header = columns.map((c) => c.header).join(',');
    const lines = sorted.map((row) =>
      columns
        .map((c) => {
          const v = c.sortValue ? String(c.sortValue(row)) : '';
          return `"${v.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-table-pro">
      {exportFilename ? (
        <div className="data-table-pro-toolbar">
          <button type="button" className="secondary btn-sm" onClick={onExport}>
            Export CSV
          </button>
          <span className="muted">
            {sorted.length} rows · page {page + 1}/{pageCount}
          </span>
        </div>
      ) : null}
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>
                {c.sortValue ? (
                  <button type="button" className="th-sort" onClick={() => onSort(c.key)}>
                    {c.header}
                    {sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
            {expandable ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {slice.map((row, i) => {
            const key = rowKey(row, page * pageSize + i);
            return (
              <Fragment key={key}>
                <tr>
                  {columns.map((c) => (
                    <td key={c.key} className={c.className}>
                      {c.render(row)}
                    </td>
                  ))}
                  {expandable ? (
                    <td>
                      <button
                        type="button"
                        className="secondary btn-sm"
                        onClick={() => setExpanded(expanded === key ? null : key)}
                      >
                        {expanded === key ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  ) : null}
                </tr>
                {expandable && expanded === key ? (
                  <tr className="row-expand">
                    <td colSpan={columns.length + 1}>{expandable(row)}</td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {pageCount > 1 ? (
        <div className="data-table-pro-pager">
          <button
            type="button"
            className="secondary btn-sm"
            disabled={page <= 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="secondary btn-sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
