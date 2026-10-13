'use client';

import { useState } from 'react';
import { calc, daysBetween, dueDateOf, EPS, fmtDate, num, PAY_METHODS, statusOf, today } from '@/lib/calc';
import { api } from '@/lib/client';
import type { DocDTO, PaymentDTO, Status } from '@/lib/types';
import { useApp } from './AppContext';

export function StatusBadge({ st }: { st: Status | null }) {
  const { t } = useApp();
  return st ? <span className={`badge st-${st}`}>{t('status.' + st)}</span> : null;
}

type Form = Partial<PaymentDTO> & { editing: boolean };

export function PaymentsPanel({ doc: d, onDoc, ensureSaved }: {
  doc: DocDTO;
  onDoc: (d: DocDTO) => void;
  ensureSaved: () => Promise<DocDTO | null>;
}) {
  const { t, money, toast } = useApp();
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const c = calc(d), st = statusOf(d);
  const pct = c.total > 0 ? Math.min(100, Math.round((c.paid / c.total) * 100)) : 0;
  const due = dueDateOf(d), late = st === 'overdue' ? daysBetween(due, today()) : 0;

  // All payment changes go through the API, which re-checks the rules and saves immediately.
  async function run<R extends { doc: DocDTO }>(fn: (id: string) => Promise<R>, msg: (r: R) => string) {
    setBusy(true); setErr('');
    try {
      const saved = await ensureSaved();
      if (!saved?.id) return;
      const r = await fn(saved.id);
      onDoc(r.doc); setForm(null); toast(msg(r));
    } catch (e) {
      setErr((e as Error).message);
      if (!form) toast(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const maxForForm = form ? c.balance + (form.editing ? num(d.payments.find((p) => p.id === form.id)?.amount) : 0) : 0;

  function submit() {
    if (!form) return;
    const maxAmt = maxForForm;
    const amount = num(form.amount);
    if (!(amount > 0)) return setErr(t('Enter an amount greater than 0.'));
    if (amount > maxAmt + EPS) return setErr(t('Amount is more than the balance due ({amt}).', { amt: money(maxAmt) }));
    if (!form.date) return setErr(t('Choose a payment date.'));
    if (form.date > today()) return setErr(t('Payment date cannot be in the future.'));
    const body = { amount, date: form.date, method: form.method || 'Cash', reference: form.reference || '', note: form.note || '' };
    if (form.editing) {
      run((id) => api<{ doc: DocDTO }>(`/api/docs/${id}/payments/${form.id}`, { method: 'PUT', body }), () => t('Payment updated'));
    } else {
      run((id) => api<{ doc: DocDTO; payment: { number: string } }>(`/api/docs/${id}/payments`, { method: 'POST', body }),
        (r) => t('{num} recorded · {amt}', { num: r.payment.number, amt: money(amount) }));
    }
  }

  return (
    <div className="section">
      <div className="pay-head"><h3>{t('Payments')}</h3><StatusBadge st={st} /></div>
      <div className="pay-sum">
        <div><small>{t('Total')}</small><b>{money(c.total)}</b></div>
        <div><small>{t('Paid')}</small><b style={{ color: 'var(--ok)' }}>{money(c.paid)}</b></div>
        <div><small>{t(st === 'overpaid' ? 'Credit' : 'Balance')}</small>
          <b style={{ color: c.balance > EPS ? 'var(--danger)' : 'inherit' }}>{money(Math.abs(c.balance))}</b></div>
      </div>
      <div className="pay-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="pay-empty" style={{ marginTop: -4 }}>
        {t('Due {date}', { date: fmtDate(due) })}
        {late > 0 && <> · <b style={{ color: 'var(--danger)' }}>{t(late === 1 ? '{n} day overdue' : '{n} days overdue', { n: late })}</b></>}
        {st === 'overpaid' && <> · <b>{t('Paid more than the total — edit a payment or the items.')}</b></>}
      </div>

      {d.payments.length ? (
        <div className="pay-list">
          {d.payments.map((p) => (
            <div className="pay-row" key={p.id}>
              <div className="meta">
                <b>{p.number || t('Earlier payment')}</b> · {fmtDate(p.date)}
                <span>{[p.method && t(p.method), p.reference, p.note].filter(Boolean).join(' · ') || '—'}</span>
              </div>
              <div className="amt">{money(p.amount)}</div>
              <button className="icon-btn" title={t('Edit')} onClick={() => { setErr(''); setForm({ ...p, editing: true }); }}>✎</button>
              <button className="icon-btn del" title={t('Delete')} onClick={() => {
                if (!confirm(t('Delete payment {num} of {amt}?', { num: p.number, amt: money(p.amount) }))) return;
                run((id) => api<{ doc: DocDTO }>(`/api/docs/${id}/payments/${p.id}`, { method: 'DELETE' }), () => t('Payment deleted'));
              }}>×</button>
            </div>
          ))}
        </div>
      ) : <div className="pay-empty">{t('No payments recorded yet.')}</div>}

      {d.void ? (
        <div className="pay-empty">{t('This invoice is void. Restore it to record payments.')}</div>
      ) : form ? (
        <div className="pay-form">
          <h3 style={{ marginBottom: 10 }}>{form.editing ? t('Edit {num}', { num: form.number || t('payment') }) : t('Record payment')}</h3>
          <div className="grid2">
            <label className="f">{t('Amount')}
              <input className="i" inputMode="decimal" autoFocus value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            </label>
            <label className="f">{t('Payment date')}<input className="i" type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <label className="f">{t('Method')}
              <select className="i" value={form.method || 'Cash'} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {PAY_METHODS.map((m) => <option key={m} value={m}>{t(m)}</option>)}
              </select>
            </label>
            <label className="f">{t('Reference / Txn ID')}<input className="i" placeholder={t('optional')} value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></label>
          </div>
          <label className="f" style={{ marginTop: 10 }}>{t('Note')}<input className="i" placeholder={t('optional')} value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn dark" disabled={busy} onClick={submit}>{t(form.editing ? 'Update payment' : 'Save payment')}</button>
            <button className="btn" onClick={() => { setForm(null); setErr(''); }}>{t('Cancel')}</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('Max {amt}', { amt: money(maxForForm) })}</span>
          </div>
          <div className="err">{err && t(err)}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn dark" disabled={c.balance <= EPS || busy} onClick={() => {
            setErr(''); setForm({ editing: false, amount: c.balance > 0 ? String(Math.round(c.balance * 100) / 100) : '', date: today(), method: 'Cash' });
          }}>{t('+ Record payment')}</button>
          {c.balance > EPS && (
            <button className="btn" disabled={busy} onClick={() => {
              if (!confirm(t('Record a payment of {amt} dated today and mark {num} as paid?', { amt: money(c.balance), num: d.number }))) return;
              run((id) => api<{ doc: DocDTO }>(`/api/docs/${id}/payments`, { method: 'POST', body: { amount: Math.round(c.balance * 100) / 100, date: today(), method: 'Cash' } }), () => t('Marked as paid'));
            }}>{t('Mark as fully paid')}</button>
          )}
        </div>
      )}
    </div>
  );
}
