'use client';

import type { ReactNode } from 'react';

export function ReportSidebarNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: ReadonlyArray<{ key: T; label: string }>;
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <nav className="report-side-nav" aria-label="เมนูรายงาน">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`report-side-link ${active === item.key ? 'is-active' : ''}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function ReportActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="report-action-btn">
      {children}
    </button>
  );
}

export function ReportPageHeader({
  id,
  title,
  description,
  controls,
  kpis,
}: {
  id?: string;
  title: string;
  description?: string;
  controls?: ReactNode;
  kpis?: ReactNode;
}) {
  return (
    <header id={id} className="report-page-header">
      <div className="report-page-header__main">
        <div className="min-w-0">
          <h2 className="report-page-title">{title}</h2>
          {description ? <p className="report-page-desc">{description}</p> : null}
          {controls ? <div className="report-page-controls">{controls}</div> : null}
        </div>
        {kpis ? <div className="report-kpi-row">{kpis}</div> : null}
      </div>
    </header>
  );
}

export function ReportKpi({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'blue' | 'green' | 'red';
}) {
  return (
    <div className={`report-kpi report-kpi--${tone}`}>
      <p className="report-kpi__label">{label}</p>
      <p className="report-kpi__value">{value}</p>
    </div>
  );
}

export function ReportPanel({
  title,
  description,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`report-panel ${className}`.trim()}>
      {(title || description) && (
        <div className="report-panel__head">
          {title ? <h3 className="report-panel__title">{title}</h3> : null}
          {description ? <p className="report-panel__desc">{description}</p> : null}
        </div>
      )}
      <div className="report-panel__body">{children}</div>
    </section>
  );
}

export function ReportTable({ children }: { children: ReactNode }) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">{children}</table>
    </div>
  );
}

export function ReportEmpty({ children }: { children: ReactNode }) {
  return <div className="report-empty">{children}</div>;
}

export function ReportMeta({ children }: { children: ReactNode }) {
  return <p className="report-meta">{children}</p>;
}

export function ReportAlert({ children }: { children: ReactNode }) {
  return <div className="report-alert">{children}</div>;
}

export function ReportLoading({ children = 'กำลังโหลดรายงาน...' }: { children?: ReactNode }) {
  return <div className="report-loading">{children}</div>;
}

export function ReportYearSelect({
  year,
  years,
  onChange,
  label = 'ปี',
}: {
  year: number | '';
  years: number[];
  onChange: (year: number) => void;
  label?: string;
}) {
  return (
    <label className="report-year">
      <span>{label}</span>
      <select
        className="report-year__select"
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {years.map((item) => (
          <option key={item} value={item}>
            {item + 543}
          </option>
        ))}
      </select>
    </label>
  );
}
