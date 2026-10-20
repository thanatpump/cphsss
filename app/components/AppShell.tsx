'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AppShell({
  title,
  subtitle,
  eyebrow = 'Social Security Office · Chaiyaphum',
  actions,
  children,
  maxWidthClass = 'max-w-7xl',
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <div className="app-shell relative min-h-screen text-[#15202b]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b3d4a]">
        <div className={`${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 sm:py-0 sm:h-[4.25rem]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 shrink-0 rounded-md bg-[#1a7a6d] flex items-center justify-center">
                <span
                  className="text-white text-sm font-semibold tracking-[0.14em]"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  SSO
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-[11px] uppercase tracking-[0.18em] text-white/55"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  {eyebrow}
                </p>
                <h1
                  className="text-base sm:text-lg font-semibold text-white truncate leading-tight"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  {title}
                </h1>
                {subtitle && <p className="text-xs text-white/65 truncate">{subtitle}</p>}
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
        </div>
      </header>
      <main className={`relative z-[1] ${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8`}>
        {children}
      </main>
    </div>
  );
}
