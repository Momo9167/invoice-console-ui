'use client';

import { useEffect, useState } from 'react';
import { calc, daysBetween, dueDateOf, EPS, fmtDate, statusOf, STATUSES, today } from '@/lib/calc';
import type { DocType, Status } from '@/lib/types';
import { useApp } from './AppContext';
import { StatusBadge } from './PaymentsPanel';

const PLURAL = { quotation: 'Quotations', invoice: 'Invoices' } as const;
const LABEL = { quotation: 'Quotation', invoice: 'Invoice' } as const;

export function DocumentsList() {
  const { t, money, docs, reloadDocs, navigate } = useApp();
  const [filter, setFilter] = useState<'all' | DocType>('all');
  const [status, setStatus] = useState<'' | Status>('');
  const [q, setQ] = useState('');
  useEffect(() => { reloadDocs(); }, [reloadDocs]);

  const query = q.trim().toLowerCase();
  const shown = docs.filter((d) => (filter === 'all' || d.type === filter)
    && (!status || statusOf(d) === status)
    && (!query || [d.number, d.customer.name, d.customer.phone].some((x) => x.toLowerCase().includes(query))));
  const inv = docs.filter((d) => d.type === 'invoice' && !d.void);
  const sum = (list: typeof docs, f: (c: ReturnType<typeof calc>) => number) => list.reduce((s, d) => s + f(calc(d)), 0);
  const billed = sum(inv, (c) => c.total), received = sum(inv, (c) => c.paid);
  const outstanding = sum(inv, (c) => Math.max(0, c.balance));
  const overdue = inv.filter((d) => statusOf(d) === 'overdue');
  const overdueAmt = sum(overdue, (c) => Math.max(0, c.balance));
  const count = (n: number) => t(n === 1 ? '{n} invoice' : '{n} invoices', { n });

  return (
    <>
      <div className="list-head"><h2>{t('Documents')}</h2></div>
      <div className="stats">
        <div className="stat"><div className="k">{t('Invoiced')}</div><div className="v">{money(billed)}</div><div className="s">{count(inv.length)}</div></div>
        <div className="stat"><div className="k">{t('Received')}</div><div className="v">{money(received)}</div><div className="s">{t('{p}% collected', { p: billed ? Math.round((received / billed) * 100) : 0 })}</div></div>
        <div className="stat"><div className="k">{t('Outstanding')}</div><div className="v">{money(outstanding)}</div><div className="s">{t('{n} with balance', { n: inv.filter((d) => calc(d).balance > EPS).length })}</div></div>
        <div className="stat"><div className="k">{t('Overdue')}</div><div className={`v ${overdueAmt ? 'red' : ''}`}>{money(overdueAmt)}</div><div className="s">{count(overdue.length)}</div></div>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="seg">
            {(['all', 'quotation', 'invoice'] as const).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => { setFilter(f); if (f === 'quotation') setStatus(''); }}>
                {t(f === 'all' ? 'All' : PLURAL[f])}
              </button>
            ))}
          </div>
          {filter !== 'quotation' && (
            <select className="filter" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
              <option value="">{t('All statuses')}</option>
              {STATUSES.map((k) => <option key={k} value={k}>{t('status.' + k)}</option>)}
            </select>
          )}
          <input className="search" placeholder={t('Search number, customer or phone…')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {shown.length ? (
          <table className="list">
            <thead><tr>
              <th>{t('Type')}</th><th>{t('Number')}</th><th>{t('Customer')}</th><th className="hide-sm">{t('Date')}</th>
              <th className="hide-sm">{t('Due')}</th><th className="r">{t('Total')}</th><th className="r">{t('Balance')}</th><th className="r hide-sm">{t('Status')}</th>
            </tr></thead>
            <tbody>
              {shown.map((d) => {
                const c = calc(d), st = statusOf(d);
                const late = st === 'overdue' ? daysBetween(dueDateOf(d), today()) : 0;
                return (
                  <tr className="row" key={d.id} onClick={() => navigate(`/docs/${d.id}`)}>
                    <td><span className={`badge ${d.type}`}>{t(LABEL[d.type])}</span></td>
                    <td><b>{d.number}</b></td>
                    <td>{d.customer.name || '—'}</td>
                    <td className="hide-sm">{fmtDate(d.date)}</td>
                    <td className="hide-sm">{d.type === 'invoice' ? fmtDate(dueDateOf(d)) : ''}</td>
                    <td className="r">{money(c.total)}</td>
                    <td className="r">{d.type === 'invoice' && !d.void ? money(Math.max(0, c.balance)) : '—'}</td>
                    <td className="r hide-sm">
                      <StatusBadge st={st} />
                      {late > 0 && <span className="sub-note">{t(late === 1 ? '{n} day late' : '{n} days late', { n: late })}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <b>{t(docs.length ? 'No matches' : 'No documents yet')}</b>
            {t(docs.length ? 'Try a different search.' : 'Create your first quotation or invoice with the buttons above.')}
          </div>
        )}
      </div>
    </>
  );
}
