'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, fmtDate, num, PAY_METHODS, today } from '@/lib/calc';
import { useApp } from './AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Preset = 'today' | 'month' | 'lastMonth' | 'year' | 'all' | 'custom';

// Date range for each quick preset, as YYYY-MM-DD strings ('' = open-ended).
function rangeFor(p: Preset): [string, string] {
  const t = today(), y = t.slice(0, 4), m = t.slice(0, 7);
  if (p === 'today') return [t, t];
  if (p === 'month') return [`${m}-01`, t];
  if (p === 'lastMonth') {
    const firstThis = `${m}-01`;
    const lastPrev = addDays(firstThis, -1);
    return [`${lastPrev.slice(0, 7)}-01`, lastPrev];
  }
  if (p === 'year') return [`${y}-01-01`, t];
  return ['', ''];
}

export function PaymentsList() {
  const { t, money, docs, reloadDocs, navigate } = useApp();
  const [preset, setPreset] = useState<Preset>('month');
  const [[from, to], setRange] = useState<[string, string]>(rangeFor('month'));
  const [method, setMethod] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { reloadDocs(); }, [reloadDocs]);

  const choose = (p: Preset) => { setPreset(p); if (p !== 'custom') setRange(rangeFor(p)); };

  // Every payment, flattened with its invoice, newest first.
  const all = useMemo(() => docs.flatMap((d) => d.payments.map((p) => ({ ...p, doc: d })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)), [docs]);

  const query = q.trim().toLowerCase();
  const rows = all.filter((p) => (!from || p.date >= from) && (!to || p.date <= to)
    && (!method || p.method === method)
    && (!query || [p.number, p.doc.number, p.doc.customer.name, p.reference].some((x) => (x || '').toLowerCase().includes(query))));

  const total = rows.reduce((s, p) => s + num(p.amount), 0);
  const byMethod = Object.entries(rows.reduce<Record<string, number>>((acc, p) => {
    acc[p.method || 'Other'] = (acc[p.method || 'Other'] || 0) + num(p.amount);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const invoices = new Set(rows.map((p) => p.doc.id)).size;

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Date', 'Receipt', 'Invoice', 'Customer', 'Method', 'Reference', 'Note', 'Amount'].join(',')]
      .concat(rows.map((p) => [p.date, p.number, p.doc.number, p.doc.customer.name, p.method, p.reference, p.note, num(p.amount).toFixed(2)].map(esc).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }); // BOM so Excel reads Myanmar text
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payments ${from || 'start'} to ${to || today()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  const presets: [Preset, string][] = [['today', 'Today'], ['month', 'This month'], ['lastMonth', 'Last month'], ['year', 'This year'], ['all', 'All time']];

  return (
    <>
      <div className="list-head">
        <h2>{t('Payments')}</h2>
        <span className="period-note">· {from || to ? `${fmtDate(from) || '…'} – ${fmtDate(to) || '…'}` : t('All time')}</span>
      </div>

      <div className="range-bar">
        <div className="seg presets">
          {presets.map(([k, label]) => <button key={k} className={preset === k ? 'on' : ''} onClick={() => choose(k)}>{t(label)}</button>)}
        </div>
        <div className="range-dates">
          <label>{t('From')}<Input type="date" value={from} max={to || undefined} onChange={(e) => { setPreset('custom'); setRange([e.target.value, to]); }} /></label>
          <label>{t('To')}<Input type="date" value={to} min={from || undefined} onChange={(e) => { setPreset('custom'); setRange([from, e.target.value]); }} /></label>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="k">{t('Received')}</div><div className="v">{money(total)}</div><div className="s">{t(rows.length === 1 ? '{n} payment' : '{n} payments', { n: rows.length })}</div></div>
        <div className="stat"><div className="k">{t('Invoices paid into')}</div><div className="v">{invoices}</div><div className="s">{t('Average {amt}', { amt: money(rows.length ? total / rows.length : 0) })}</div></div>
        <div className="stat wide">
          <div className="k">{t('By method')}</div>
          <div className="method-chips">
            {byMethod.length ? byMethod.map(([m, v]) => (
              <button key={m} className={`chip${method === m ? ' on' : ''}`} onClick={() => setMethod(method === m ? '' : m)}>
                <span>{t(m)}</span><b>{money(v)}</b>
              </button>
            )) : <span className="s">—</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <select className="filter" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">{t('All methods')}</option>
            {PAY_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </select>
          <Input className="search" placeholder={t('Search receipt, invoice, customer or reference…')} value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>{t('Export CSV')}</Button>
        </div>
        {rows.length ? (
          <table className="list cards">
            <thead><tr>
              <th>{t('Date')}</th><th>{t('Receipt')}</th><th>{t('Invoice')}</th><th>{t('Customer')}</th>
              <th>{t('Method')}</th><th className="hide-md">{t('Reference')}</th><th className="r">{t('Amount')}</th>
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr className="row" key={p.id} onClick={() => navigate(`/docs/${p.doc.id}`)}>
                  <td className="c-date">{fmtDate(p.date)}</td>
                  <td className="c-title"><b>{p.number}</b></td>
                  <td className="c-type">{p.doc.number}</td>
                  <td className="c-sub">{p.doc.customer.name || '—'}</td>
                  <td className="c-status">{t(p.method)}</td>
                  <td className="hide-md" style={{ color: 'var(--ink-2)' }}>{[p.reference, p.note].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="r c-amt"><b style={{ color: 'var(--ok)' }}>{money(p.amount)}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="c-title"><b>{t('Total')}</b></td>
                <td className="hide-md" />
                <td className="r c-amt"><b>{money(total)}</b></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="empty">
            <b>{t(all.length ? 'No payments in this range' : 'No payments yet')}</b>
            {t(all.length ? 'Try a wider date range or clear the filters.' : 'Payments recorded on invoices appear here.')}
          </div>
        )}
      </div>
    </>
  );
}

