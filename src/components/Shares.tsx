'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDate, num, splitOf, today } from '@/lib/calc';
import { earnings, inPeriod, owedToAko } from '@/lib/earnings';
import type { DocDTO, ExpenseDTO, PayoutDTO } from '@/lib/types';
import { useApp } from './AppContext';
import { RowLink } from './RowLink';
import { periodLabel, PeriodFilter } from './PeriodFilter';
import { norm } from './Picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function useMoney() {
  const [expenses, setExpenses] = useState<ExpenseDTO[] | null>(null);
  const [payouts, setPayouts] = useState<PayoutDTO[] | null>(null);
  const reload = () => Promise.all([api<ExpenseDTO[]>('/api/expenses').then(setExpenses), api<PayoutDTO[]>('/api/payouts').then(setPayouts)]);
  useEffect(() => { reload(); }, []);
  return { expenses, payouts, reload };
}

export function SharesPage() {
  const { t, money, docs, reloadDocs, navigate, settings, toast } = useApp();
  const owner = settings.ownerName || 'Ako', partner = settings.partnerName || 'Bmm';
  const { expenses, payouts, reload } = useMoney();
  const [month, setMonth] = useState(today().slice(5, 7));
  const [year, setYear] = useState(today().slice(0, 4));
  const [status, setStatus] = useState<'new' | 'complete' | ''>('new');
  const [q, setQ] = useState('');
  const [pay, setPay] = useState<{ date: string; amount: string; note: string } | null>(null);
  useEffect(() => { reloadDocs(); }, [reloadDocs]);
  if (!expenses || !payouts) return <div className="loading">{t('Loading…')}</div>;

  const e = earnings(docs, expenses, payouts, year, month);
  const owed = owedToAko(docs, expenses, payouts);
  const query = norm(q);
  const inv = docs.filter((d) => d.type === 'invoice' && !d.void && inPeriod(d.date, year, month));
  const shown = inv.filter((d) => (!status || (d.splitStatus || 'new') === status)
    && (!query || [d.number, d.customer.name].some((x) => norm(x).includes(query))))
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
  const periodPayouts = payouts.filter((p) => inPeriod(p.date, year, month));

  async function savePayout() {
    try {
      await api('/api/payouts', { method: 'POST', body: pay });
      toast(t('Paid {amt} to {name}', { amt: money(pay!.amount), name: owner })); setPay(null); reload();
    } catch (err) { toast(t((err as Error).message)); }
  }

  return (
    <>
      <div className="list-head">
        <h2>{t('Shares')}</h2>
        <span className="period-note">· {periodLabel(t, month, year)}</span>
        <div className="spacer" />
        <PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} dates={docs.map((d) => d.date)} />
      </div>

      <div className="stats">
        <div className="stat"><div className="k">{t('{name} earned', { name: partner })}</div><div className="v">{money(e.bmm.total)}</div>
          <div className="s">{t('Items {a} · Delivery {b} · Service {c}', { a: money(e.bmm.items), b: money(e.bmm.delivery), c: money(e.bmm.service) })}</div></div>
        <div className="stat"><div className="k">{t('{name} earned', { name: owner })}</div><div className="v">{money(e.ako.total)}</div>
          <div className="s">{t('Items {a} − expenses {b}', { a: money(e.ako.items), b: money(e.ako.expenses) })}</div></div>
        <div className="stat"><div className="k">{t('Not split yet')}</div><div className={`v ${e.unsplitCount ? 'red' : ''}`}>{e.unsplitCount}</div>
          <div className="s">{t('{amt} in invoices', { amt: money(e.unsplitTotal) })}</div></div>
        <div className="stat"><div className="k">{t('{a} owes {b}', { a: partner, b: owner })}</div><div className="v">{money(owed.balance)}</div>
          <div className="s"><button className="link-btn" onClick={() => setPay({ date: today(), amount: owed.balance > 0 ? String(Math.round(owed.balance)) : '', note: '' })}>{t('Pay {name}', { name: owner })}</button>
          {owed.unsplitCash > 0 && <> · {t('+{amt} not split', { amt: money(owed.unsplitCash) })}</>}</div></div>
      </div>

      {pay && (
        <div className="section" style={{ marginBottom: 16 }}>
          <h3>{t('Pay {name}', { name: owner })}</h3>
          <div className="grid3">
            <label className="f">{t('Date')}<Input type="date" value={pay.date} onChange={(ev) => setPay({ ...pay, date: ev.target.value })} /></label>
            <label className="f">{t('Amount')}<Input inputMode="decimal" value={pay.amount} onChange={(ev) => setPay({ ...pay, amount: ev.target.value })} /></label>
            <label className="f">{t('Note')}<Input placeholder={t('optional')} value={pay.note} onChange={(ev) => setPay({ ...pay, note: ev.target.value })} /></label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button disabled={!(num(pay.amount) > 0)} onClick={savePayout}>{t('Save payment')}</Button>
            <Button variant="outline" onClick={() => setPay(null)}>{t('Cancel')}</Button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <div className="seg">
            {(['new', 'complete', ''] as const).map((s) => (
              <button key={s || 'all'} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
                {t(s === 'new' ? 'New' : s === 'complete' ? 'Complete' : 'All')}
                {s && <span className="cnt">{inv.filter((d) => (d.splitStatus || 'new') === s).length}</span>}
              </button>
            ))}
          </div>
          <Input className="search" type="search" placeholder={t('Search number or customer…')} aria-label={t('Search number or customer…')} autoComplete="off" value={q} onChange={(ev) => setQ(ev.target.value)} />
        </div>
        {shown.length ? (
          <table className="list cards">
            <thead><tr><th>{t('Date')}</th><th>{t('Number')}</th><th>{t('Customer')}</th><th className="r">{t('Total')}</th><th className="r hide-sm">{partner}</th><th className="r hide-sm">{owner}</th><th className="r">{t('Status')}</th></tr></thead>
            <tbody>
              {shown.map((d) => {
                const s = splitOf(d), done = d.splitStatus === 'complete';
                return (
                  <tr className="row" key={d.id} onClick={() => navigate(`/shares/${d.id}`)}>
                    <td className="c-date">{fmtDate(d.date)}</td>
                    <td className="c-title"><RowLink href={`/shares/${d.id}`}><b>{d.number}</b></RowLink></td>
                    <td className="c-sub">{d.customer.name || '—'}</td>
                    <td className="r c-amt">{money(s.total)}</td>
                    <td className="r hide-sm">{done ? money(s.bmm) : '—'}</td>
                    <td className="r hide-sm">{done ? money(s.ako) : '—'}</td>
                    <td className="r c-status"><span className={`badge ${done ? 'st-paid' : 'st-partial'}`}>{t(done ? 'Complete' : 'New')}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <div className="empty"><b>{t(status === 'new' ? 'Nothing to split' : 'No invoices')}</b>{t(status === 'new' ? 'Every invoice in this period is split.' : 'Try another month or status.')}</div>}
      </div>

      <div className="money-grid">
        <div className="section">
          <h3>{t('Cash {name} holds', { name: partner })} · {periodLabel(t, month, year)}</h3>
          <Row k={t('Collected from customers')} v={money(e.cash.collected)} />
          <Row k={t('{name}’s part', { name: partner })} v={'−' + money(e.cash.bmm)} />
          {e.cash.courier > 0 && <Row k={t('Courier (outsourced delivery)')} v={'−' + money(e.cash.courier)} />}
          {e.cash.unsplit > 0 && <Row k={t('Not split yet')} v={'−' + money(e.cash.unsplit)} warn />}
          <Row k={t('{name}’s part', { name: owner })} v={money(e.cash.ako)} strong />
          <Row k={t('Expenses paid from this cash')} v={'−' + money(e.cash.expensesFromCash)} />
          <Row k={t('Paid to {name}', { name: owner })} v={'−' + money(e.cash.paidToAko)} />
        </div>
        <div className="section">
          <h3>{t('Payments to {name}', { name: owner })}</h3>
          {periodPayouts.length ? periodPayouts.map((p) => (
            <div className="pay-row" key={p.id}>
              <div className="meta"><b>{fmtDate(p.date)}</b><span>{[p.note, p.createdBy].filter(Boolean).join(' · ') || '—'}</span></div>
              <div className="amt">{money(p.amount)}</div>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" title={t('Delete')} onClick={async () => {
                if (!confirm(t('Delete this payment of {amt}?', { amt: money(p.amount) }))) return;
                await api(`/api/payouts/${p.id}`, { method: 'DELETE' }); reload();
              }}>×</Button>
            </div>
          )) : <div className="pay-empty">{t('None in this period.')}</div>}
        </div>
      </div>
    </>
  );
}

const Row = ({ k, v, strong, warn }: { k: string; v: string; strong?: boolean; warn?: boolean }) => (
  <div className={`sum${strong ? ' big' : ''}`} style={warn ? { color: '#94600f' } : undefined}><span>{k}</span><span>{v}</span></div>
);

// Split one invoice between Bmm and Ako.
export function SplitEditor({ id }: { id: string }) {
  const { t, money, toast, navigate, settings, reloadDocs } = useApp();
  const owner = settings.ownerName || 'Ako', partner = settings.partnerName || 'Bmm';
  const [d, setD] = useState<DocDTO | null>(null);
  const [shares, setShares] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<'bmm' | 'outsourced'>('bmm');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<DocDTO>(`/api/docs/${id}`).then((doc) => {
      setD(doc);
      setShares(doc.items.map((_, i) => (doc.split?.shares?.[i] !== undefined ? String(doc.split.shares[i]) : '')));
      setDelivery(doc.split?.delivery || 'bmm');
    });
  }, [id]);
  if (!d) return <div className="loading">{t('Loading…')}</div>;

  const draft = { ...d, split: { shares: shares.map(num), delivery } };
  const s = splitOf(draft);
  const done = d.splitStatus === 'complete';
  const stale = !done && !!d.split;

  async function save() {
    setErr(''); setBusy(true);
    try {
      const saved = await api<DocDTO>(`/api/docs/${id}/split`, { method: 'PUT', body: { shares: shares.map(num), delivery } });
      setD(saved); reloadDocs(); toast(t('{num} split · complete', { num: d!.number }));
      navigate('/shares');
    } catch (e) { setErr(t((e as Error).message)); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="ed-bar">
        <Button variant="outline" onClick={() => navigate('/shares')}>{t('← Back')}</Button>
        <h2>{t('Split')} {d.number}</h2>
        <span className={`badge ${done ? 'st-paid' : 'st-partial'}`}>{t(done ? 'Complete' : 'New')}</span>
        <div className="spacer" />
        <Button variant="outline" onClick={() => navigate(`/docs/${d.id}`)}>{t('Open invoice')}</Button>
        {done && <Button variant="outline" disabled={busy} onClick={async () => { setD(await api(`/api/docs/${id}/split`, { method: 'DELETE' })); reloadDocs(); }}>{t('Reopen')}</Button>}
        <Button disabled={busy} onClick={save}>{t(done ? 'Save changes' : 'Save split')}</Button>
      </div>
      <p className="pay-empty">{d.customer.name} · {fmtDate(d.date)} · {t('Only visible here — never on the customer’s invoice.')}</p>
      {stale && <p className="pay-empty" style={{ color: '#94600f' }}>{t('The invoice items changed after it was split. Check the shares and save again.')}</p>}

      <div className="card" style={{ marginBottom: 16 }}>
        <table className="list split-table">
          <thead><tr><th>{t('Item')}</th><th className="r">{t('Qty')}</th><th className="r hide-sm">{t('Price')}</th><th className="r">{t('Amount')}</th><th className="r">{t('{name} share / unit', { name: partner })}</th><th className="r">{partner}</th><th className="r">{owner}</th></tr></thead>
          <tbody>
            {s.lines.map((l, i) => {
              const b = num(shares[i]) * num(l.qty);
              return (
                <tr key={i}>
                  <td><b>{l.description || '—'}</b>{num(l.discount) > 0 && <span className="sub-note">{t('Discount {amt} (from {name})', { amt: money(l.discount), name: owner })}</span>}</td>
                  <td className="r">{num(l.qty)}</td>
                  <td className="r hide-sm">{money(l.price)}</td>
                  <td className="r">{money(l.amount)}</td>
                  <td className="r"><Input className="share-in" inputMode="decimal" placeholder="0" aria-label={`${t('{name} share / unit', { name: partner })}: ${l.description || '—'}`} autoComplete="off" value={shares[i] ?? ''} onChange={(e) => setShares(shares.map((x, j) => (j === i ? e.target.value : x)))} /></td>
                  <td className={`r ${b > l.amount + 0.005 ? 'neg' : ''}`}><b>{money(b)}</b></td>
                  <td className="r">{money(l.amount - b)}</td>
                </tr>
              );
            })}
            {s.delivery > 0 && (
              <tr>
                <td colSpan={4}><b>{t('Delivery fee')}</b> {money(s.delivery)}
                  <div className="seg" style={{ marginTop: 6 }}>
                    <button className={delivery === 'bmm' ? 'on' : ''} onClick={() => setDelivery('bmm')}>{t('Delivered by {name}', { name: partner })}</button>
                    <button className={delivery === 'outsourced' ? 'on' : ''} onClick={() => setDelivery('outsourced')}>{t('Outsourced (courier)')}</button>
                  </div>
                </td>
                <td className="hide-sm" />
                <td className="r"><b>{money(s.bmmDelivery)}</b></td>
                <td className="r">{s.courier ? <span className="sub-note">{t('Courier {amt}', { amt: money(s.courier) })}</span> : '—'}</td>
              </tr>
            )}
            {s.service > 0 && (
              <tr><td colSpan={4}><b>{t('Service charge')}</b>{s.serviceDiscount > 0 && <span className="sub-note">{t('after discount {amt}', { amt: money(s.serviceDiscount) })}</span>}</td><td className="hide-sm" /><td className="r"><b>{money(s.service)}</b></td><td className="r">—</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr><td colSpan={4}><b>{t('Total')} {money(s.total)}</b></td><td className="hide-sm" /><td className="r"><b>{money(s.bmm)}</b></td><td className="r"><b>{money(s.ako)}</b></td></tr>
          </tfoot>
        </table>
      </div>
      <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>
      {d.split?.at && <p className="pay-empty">{t('Last split by {name} · {when}', { name: d.split.by || '—', when: new Date(d.split.at).toLocaleString('en-GB') })}</p>}
    </>
  );
}
