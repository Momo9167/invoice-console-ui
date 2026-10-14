'use client';

import { today } from '@/lib/calc';
import { useApp } from './AppContext';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Month + year selects. `dates` = the dates that exist, to offer only years with data (plus this year).
export function PeriodFilter({ month, year, onMonth, onYear, dates }: {
  month: string; year: string; onMonth: (m: string) => void; onYear: (y: string) => void; dates: string[];
}) {
  const { t } = useApp();
  const years = [...new Set([today().slice(0, 4), ...dates.map((d) => d.slice(0, 4))])].sort().reverse();
  return (
    <div className="period">
      <select className="filter" value={month} onChange={(e) => onMonth(e.target.value)} aria-label={t('Month')}>
        <option value="">{t('All months')}</option>
        {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{t(m)}</option>)}
      </select>
      <select className="filter" value={year} onChange={(e) => onYear(e.target.value)} aria-label={t('Year')}>
        <option value="">{t('All years')}</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

export const periodLabel = (t: (s: string) => string, month: string, year: string) =>
  [month && t(MONTHS[+month - 1]), year].filter(Boolean).join(' ') || t('All time');
