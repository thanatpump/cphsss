'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { REPORT_MODULES, type ReportModuleKey } from '@/lib/report-modules';

export default function ReportModuleShell({
  active,
  title,
  subtitle,
  actions,
  sidebar,
  children,
}: {
  active: ReportModuleKey;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  const current = REPORT_MODULES.find((item) => item.key === active);

  return (
    <div className="app-shell relative min-h-screen text-[#15202b]">
      <header className="bg-[#0b3d4a] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 pt-3 pb-0">
          <div className="min-h-14 flex items-center justify-between gap-3 py-2">
            <div className="min-w-0 flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-md bg-[#1a7a6d] flex items-center justify-center">
                <span
                  className="text-white text-xs font-semibold tracking-[0.12em]"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  SSO
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-[11px] uppercase tracking-[0.16em] text-[#7dcdc0]"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  แดชบอร์ดรายงาน
                </p>
                <h1
                  className="text-lg font-bold text-white truncate"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  {title}
                </h1>
                {(subtitle || current?.description) && (
                  <p className="text-xs text-white/65 truncate">{subtitle || current?.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {actions}
              <Link
                href="/"
                className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15"
              >
                หน้าหลัก
              </Link>
            </div>
          </div>

          <nav className="mt-1 flex items-end gap-1 overflow-x-auto -mb-px">
            {REPORT_MODULES.map((item) => {
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#7dcdc0] text-white'
                      : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                  }`}
                  style={{ fontFamily: 'var(--font-sarabun)' }}
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="relative z-[1] max-w-[1400px] mx-auto px-4 py-6 flex gap-4 items-start">
        {sidebar && (
          <aside className="w-64 shrink-0 bg-white rounded-xl border border-[#d8e0e5] p-3 sticky top-28 hidden md:block">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 min-w-0 space-y-4">
          {sidebar && (
            <div className="md:hidden bg-white rounded-xl border border-[#d8e0e5] p-2">{sidebar}</div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
