'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDate, num, today } from '@/lib/calc';
import { inPeriod } from '@/lib/earnings';
import type { ExpenseDTO } from '@/lib/types';
import { useApp } from './AppContext';
import { periodLabel, PeriodFilter } from './PeriodFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const EXPENSE_CATEGORIES = ['Courier', 'Transport between branches', 'Installation materials', 'Tools', 'Phone / internet', 'Rent', 'Other'];
const blank = (): ExpenseDTO => ({ date: today(), category: 'Courier', amount: '', paidFrom: 'cash', note: '' });

// Business expenses (always borne by Ako). Paid from the cash Bmm holds, or by Ako himself.
export function ExpensesPage() {
  const { t, money, toast, settings } = useApp();
  const owner = settings.ownerName || 'Ako', partner = settings.partnerName || 'Bmm';
  const [rows, setRows] = useState<ExpenseDTO[] | null>(null);
  const [month, setMonth] = useState(today().slice(5, 7));
  const [year, setYear] = useState(today().slice(0, 4));
  const [cat, setCat] = useState('');
  const [form, setForm] = useState<ExpenseDTO>(blank());
  const [err, setErr] = useState('');
  const load = () => api<ExpenseDTO[]>('/api/expenses').then(setRows);
  useEffect(() => { load(); }, []);
  if (!rows) return <div className="loading">{t('Loading…')}</div>;

  const inP = rows.filter((r) => inPeriod(r.date, year, month));
  const shown = inP.filter((r) => !cat || r.category === cat);
  const total = shown.reduce((s, r) => s + num(r.amount), 0);
  const byCat = Object.entries(inP.reduce<Record<string, number>>((a, r) => { a[r.category] = (a[r.category] || 0) + num(r.amount); return a; }, {})).sort((a, b) => b[1] - a[1]);
  const fromCash = inP.filter((r) => r.paidFrom !== 'owner').reduce((s, r) => s + num(r.amount), 0);

  async function save() {
    setErr('');
    try {
      if (form.id) await api(`/api/expenses/${form.id}`, { method: 'PUT', body: form });
      else await api('/api/expenses', { method: 'POST', body: form });
      toast(t(form.id ? 'Expense updated' : 'Expense added')); setForm(blank()); load();
    } catch (e) { setErr(t((e as Error).message)); }
  }

  return (
    <>
      <div className="list-head">
        <h2>{t('Expenses')}</h2>
        <span className="period-note">· {periodLabel(t, month, year)}</span>
        <div className="spacer" />
        <PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} dates={rows.map((r) => r.date)} />
      </div>
      <div className="stats">
        <div className="stat"><div className="k">{t('Total expenses')}</div><div className="v">{money(inP.reduce((s, r) => s + num(r.amount), 0))}</div><div className="s">{t('borne by {name}', { name: owner })}</div></div>
        <div className="stat"><div className="k">{t('Paid from {name}’s cash', { name: partner })}</div><div className="v">{money(fromCash)}</div><div className="s">{t('reduces what {a} owes {b}', { a: partner, b: owner })}</div></div>
        <div className="stat wide"><div className="k">{t('By category')}</div>
          <div className="method-chips">{byCat.length ? byCat.map(([c, v]) => (
            <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(cat === c ? '' : c)}><span>{t(c)}</span><b>{money(v)}</b></button>
          )) : <span className="s">—</span>}</div>
        </div>
      </div>
      <div className="cust-layout">
        <div className="section">
          <h3>{t(form.id ? 'Edit expense' : 'Add expense')}</h3>
          <div className="grid2">
            <label className="f">{t('Date')}<Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="f">{t('Amount')}<Input inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          </div>
          <label className="f" style={{ marginTop: 10 }}>{t('Category')}
            <select className="i" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </label>
          <div className="f" style={{ marginTop: 10 }}><span>{t('Paid from')}</span>
            <div className="seg">
              <button className={form.paidFrom !== 'owner' ? 'on' : ''} onClick={() => setForm({ ...form, paidFrom: 'cash' })}>{t('{name}’s cash', { name: partner })}</button>
              <button className={form.paidFrom === 'owner' ? 'on' : ''} onClick={() => setForm({ ...form, paidFrom: 'owner' })}>{t('{name} paid himself', { name: owner })}</button>
            </div>
          </div>
          <label className="f" style={{ marginTop: 10 }}>{t('Note')}<Input placeholder={t('e.g. bus fee Myawaddy → Bago, TR003')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            <Button disabled={!(num(form.amount) > 0)} onClick={save}>{t(form.id ? 'Update' : 'Add expense')}</Button>
            {form.id && <Button variant="outline" onClick={() => setForm(blank())}>{t('Cancel')}</Button>}
            <span style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</span>
          </div>
        </div>
        <div className="card">
          {shown.length ? (
            <table className="list cards">
              <thead><tr><th>{t('Date')}</th><th>{t('Category')}</th><th className="hide-sm">{t('Note')}</th><th className="hide-sm">{t('Paid from')}</th><th className="r">{t('Amount')}</th><th /></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="c-date">{fmtDate(r.date)}</td>
                    <td className="c-title"><b>{t(r.category)}</b></td>
                    <td className="c-sub hide-sm" style={{ color: 'var(--ink-2)' }}>{r.note || '—'}</td>
                    <td className="hide-sm c-type">{r.paidFrom === 'owner' ? owner : t('{name}’s cash', { name: partner })}</td>
                    <td className="r c-amt">{money(r.amount)}</td>
                    <td className="c-status"><div className="row-actions">
                      <Button variant="outline" onClick={() => { setForm({ ...r, amount: String(num(r.amount)) }); scrollTo(0, 0); }}>{t('Edit')}</Button>
                      <Button variant="destructive" onClick={async () => {
                        if (!confirm(t('Delete this expense of {amt}?', { amt: money(r.amount) }))) return;
                        await api(`/api/expenses/${r.id}`, { method: 'DELETE' }); load();
                      }}>{t('Delete')}</Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={2} className="c-title"><b>{t('Total')}</b></td><td className="hide-sm" /><td className="hide-sm" /><td className="r c-amt"><b>{money(total)}</b></td><td /></tr></tfoot>
            </table>
          ) : <div className="empty"><b>{t('No expenses')}</b>{t('Nothing recorded in this period.')}</div>}
        </div>
      </div>
    </>
  );
}
