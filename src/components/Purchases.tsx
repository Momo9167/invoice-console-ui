'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDate, num, today } from '@/lib/calc';
import type { PurchaseDTO, TransferStatus } from '@/lib/types';
import { useApp } from './AppContext';
import { RowLink } from './RowLink';
import { blankLine, LinesEditor, linesPayload, type Line } from './LinesEditor';
import { norm } from './Picker';
import { SerialInput } from './SerialInput';
import { Step, TransferBadge, when } from './Transfers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const orderTotal = (p: PurchaseDTO) => p.items.reduce((s, i) => s + num(i.qty) * num(i.unitCost), 0);
const STATUSES: TransferStatus[] = ['pending', 'delivering', 'received', 'cancelled'];

export function PurchasesList() {
  const { t, money, locations, navigate } = useApp();
  const [rows, setRows] = useState<PurchaseDTO[] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | TransferStatus>('');
  useEffect(() => { api<PurchaseDTO[]>('/api/purchases').then(setRows); }, []);
  if (!rows) return <div className="loading">{t('Loading…')}</div>;
  const loc = (id: string) => locations.find((l) => l.id === id)?.name || '—';
  const query = norm(q);
  const shown = rows.filter((r) => (!status || r.status === status) && (!query || [r.number, r.supplier, r.orderRef].some((x) => norm(x).includes(query))));

  return (
    <>
      <div className="list-head">
        <h2>{t('Purchase orders')}</h2>
        <div className="spacer" />
        <Button onClick={() => navigate('/purchases/new')}>{t('+ Purchase order')}</Button>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="seg">
            <button className={!status ? 'on' : ''} onClick={() => setStatus('')}>{t('All')}</button>
            {STATUSES.map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{t('tr.' + s)} <span className="cnt">{rows.filter((r) => r.status === s).length}</span></button>)}
          </div>
          <Input className="search" type="search" placeholder={t('Search order, supplier or online order no…')} aria-label={t('Search order, supplier or online order no…')} autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {shown.length ? (
          <table className="list cards">
            <thead><tr><th>{t('Date')}</th><th>{t('Number')}</th><th>{t('Supplier')}</th><th className="hide-sm">{t('Arrives at')}</th><th className="hide-md">{t('Transfers')}</th><th className="r">{t('Cost')}</th><th className="r">{t('Status')}</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr className="row" key={r.id} onClick={() => navigate(`/purchases/${r.id}`)}>
                  <td className="c-date">{fmtDate(r.date)}</td>
                  <td className="c-title"><RowLink href={`/purchases/${r.id}`}><b>{r.number}</b></RowLink>{r.orderRef && <span className="sub-note">{r.orderRef}</span>}</td>
                  <td className="c-sub">{r.supplier || '—'}</td>
                  <td className="hide-sm c-type">{loc(r.locationId)}</td>
                  <td className="hide-md">{r.transfers?.map((x) => <span key={x.id} className={`badge tr-${x.status}`} style={{ marginRight: 4 }}>{x.number}</span>)}</td>
                  <td className="r c-amt">{money(orderTotal(r))}</td>
                  <td className="r c-status"><TransferBadge s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{t(rows.length ? 'No matches' : 'No purchase orders yet')}</b>{t(rows.length ? 'Try a different search.' : 'When an online order is placed, record it here. Receive it when it arrives to add the stock.')}</div>}
      </div>
    </>
  );
}

const toLines = (po: PurchaseDTO, name: (id: string) => string): Line[] =>
  po.items.map((i) => ({ productId: i.productId, label: name(i.productId), qty: i.qty, unitCost: i.unitCost, serials: [...i.serials] }));

// New order, or edit one that hasn't been received yet.
function PurchaseForm({ initial }: { initial?: PurchaseDTO }) {
  const { t, money, toast, products, locations, navigate } = useApp();
  const active = locations.filter((l) => l.active || l.id === initial?.locationId);
  const defaultLoc = active.find((l) => l.name.toLowerCase() === 'myawaddy') || active[0];
  const name = (id: string) => products.find((p) => p.id === id)?.name || '';
  const [date, setDate] = useState(initial?.date || today());
  const [supplier, setSupplier] = useState(initial?.supplier || '');
  const [orderRef, setOrderRef] = useState(initial?.orderRef || '');
  const [locationId, setLocationId] = useState(initial?.locationId || defaultLoc?.id || '');
  const [lines, setLines] = useState<Line[]>(initial ? toLines(initial, name) : [blankLine()]);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const total = lines.reduce((s, l) => s + num(l.qty) * num(l.unitCost), 0);
  const locName = active.find((l) => l.id === locationId)?.name || '';

  async function save(receiveNow = false) {
    setErr('');
    if (lines.some((l) => l.label && !l.productId)) return setErr(t('Pick every item from the list'));
    setBusy(true);
    try {
      const body = { date, supplier, orderRef, locationId, notes, items: linesPayload(lines, true), receiveNow };
      const po = initial?.id
        ? await api<PurchaseDTO>(`/api/purchases/${initial.id}`, { method: 'PUT', body })
        : await api<PurchaseDTO>('/api/purchases', { method: 'POST', body });
      if (po.warning) toast(t('{num} saved as pending — {msg}', { num: po.number, msg: t(po.warning) }));
      else toast(t(po.status === 'received' ? '{num} received · stock added at {loc}' : '{num} saved', { num: po.number, loc: locName }));
      navigate(`/purchases/${po.id}`);
    } catch (e) { setErr(t((e as Error).message)); setBusy(false); }
  }

  return (
    <>
      <div className="ed-bar">
        <Button variant="outline" onClick={() => navigate(initial?.id ? `/purchases/${initial.id}` : '/purchases')}>{t('← Back')}</Button>
        <h2>{initial?.id ? t('Edit {num}', { num: initial.number }) : t('New purchase order')}</h2>
        <div className="spacer" />
        {!initial?.id && <Button variant="outline" disabled={busy} onClick={() => save(true)}>{t('Save & receive now')}</Button>}
        <Button disabled={busy} onClick={() => save(false)}>{initial?.id ? t('Save changes') : t('Save order')}</Button>
      </div>
      <div className="editor single">
        <div className="form">
          <div className="section">
            <h3>{t('Order')}</h3>
            <div className="grid2">
              <label className="f">{t('Order date')}<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="f">{t('Stock arrives at')}
                <select className="i" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {active.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <label className="f">{t('Supplier / website')}<Input value={supplier} placeholder={t('optional')} onChange={(e) => setSupplier(e.target.value)} /></label>
              <label className="f">{t('Online order no.')}<Input value={orderRef} placeholder={t('optional')} onChange={(e) => setOrderRef(e.target.value)} /></label>
            </div>
          </div>
          <div className="section">
            <h3>{t('Items')}</h3>
            <LinesEditor lines={lines} onChange={setLines} withCost serialsOptional />
            <div className="sum big" style={{ marginTop: 12 }}><span>{t('Total cost')}</span><span>{money(total)}</span></div>
          </div>
          <div className="section">
            <label className="f">{t('Note')}<Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <p className="pay-empty" style={{ marginTop: 10 }}>{t('Saving records the order as pending. Stock is added at {loc} when you press Receive.', { loc: locName })}</p>
            <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export const PurchaseNew = () => <PurchaseForm />;

export function PurchaseView({ id }: { id: string }) {
  const { t, money, toast, products, locations, navigate } = useApp();
  const [po, setPo] = useState<PurchaseDTO | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'receive'>('view');
  const [got, setGot] = useState<Record<string, { qty: string; serials: string[] }>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<PurchaseDTO>(`/api/purchases/${id}`).then(setPo); }, [id]);
  if (!po) return <div className="loading">{t('Loading…')}</div>;
  if (mode === 'edit') return <PurchaseForm initial={po} />;

  const loc = (lid: string) => locations.find((l) => l.id === lid)?.name || '—';
  const prod = (pid: string) => products.find((p) => p.id === pid);
  const open = po.status === 'pending' || po.status === 'delivering';

  const act = async (path: string, msg: string, body?: unknown) => {
    setBusy(true); setErr('');
    try { setPo(await api<PurchaseDTO>(`/api/purchases/${id}/${path}`, { method: 'POST', body })); setMode('view'); toast(msg); }
    catch (e) { const m = t((e as Error).message); if (mode === 'receive') setErr(m); else toast(m); }
    finally { setBusy(false); }
  };
  const startReceive = () => {
    setErr('');
    setGot(Object.fromEntries(po.items.map((i) => [i.id!, { qty: String(i.qty), serials: [...i.serials] }])));
    setMode('receive');
  };

  return (
    <>
      <div className="ed-bar">
        <Button variant="outline" onClick={() => navigate('/purchases')}>{t('← Back')}</Button>
        <h2>{t('Purchase order')} {po.number}</h2>
        <TransferBadge s={po.status} />
        <div className="spacer" />
        {mode === 'view' && open && <>
          <Button variant="destructive" disabled={busy} onClick={() => confirm(t('Cancel {num}?', { num: po.number })) && act('cancel', t('Order cancelled'))}>{t('Cancel order')}</Button>
          <Button variant="outline" onClick={() => setMode('edit')}>{t('Edit')}</Button>
          {po.status === 'pending' && <Button variant="outline" disabled={busy} onClick={() => act('ship', t('{num} marked as delivering', { num: po.number }))}>{t('Mark as delivering')}</Button>}
          <Button onClick={startReceive}>{t('Receive')}</Button>
        </>}
        {mode === 'view' && po.status === 'received' && <>
          <Button variant="destructive" disabled={busy} onClick={() => confirm(t('Cancel {num}? Its items are taken back out of stock at {loc}.', { num: po.number, loc: loc(po.locationId) })) && act('cancel', t('Order cancelled'))}>{t('Cancel order')}</Button>
          <Button onClick={() => navigate(`/transfers/new?po=${po.id}`)}>{t('Transfer to…')}</Button>
        </>}
      </div>

      <div className="route-banner">
        <div><small>{t('Supplier / website')}</small><b>{po.supplier || '—'}</b>{po.orderRef && <small style={{ textTransform: 'none', letterSpacing: 0 }}>{po.orderRef}</small>}</div>
        <span className="route-arrow">→</span>
        <div><small>{t('Stock arrives at')}</small><b>{loc(po.locationId)}</b></div>
        <div className="steps">
          <Step on label={t('tr.pending')} sub={[po.createdBy, when(po.createdAt)].filter(Boolean).join(' · ')} />
          <Step on={!!po.shippedAt} label={t('tr.delivering')} sub={[po.shippedBy, when(po.shippedAt)].filter(Boolean).join(' · ')} />
          {po.status === 'cancelled'
            ? <Step on cancelled label={t('tr.cancelled')} sub={[po.cancelledBy, when(po.cancelledAt)].filter(Boolean).join(' · ')} />
            : <Step on={!!po.receivedAt} label={t('tr.received')} sub={[po.receivedBy, when(po.receivedAt)].filter(Boolean).join(' · ')} />}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <table className="list cards">
          <thead><tr><th>{t('Item')}</th><th className="r">{t('Ordered')}</th><th className="r">{t('Received qty')}</th><th className="r hide-sm">{t('Unit cost')}</th><th className="r">{t('Line cost')}</th></tr></thead>
          <tbody>
            {po.items.map((i) => {
              const p = prod(i.productId), g = got[i.id!];
              const short = i.receivedQty != null ? num(i.qty) - i.receivedQty : 0;
              const serialsShown = i.receivedSerials ?? i.serials;
              return (
                <tr key={i.id}>
                  <td className="c-title">
                    <b>{p?.name || '—'}</b>
                    {mode !== 'receive' && serialsShown.length > 0 && <span className="sub-note">S/N: {serialsShown.join(' · ')}</span>}
                    {mode === 'receive' && (p?.serialTracked || i.serials.length > 0) && (
                      <SerialInput serials={g.serials} qty={g.qty} required={p?.serialTracked}
                        onChange={(serials) => setGot({ ...got, [i.id!]: { qty: p?.serialTracked ? String(serials.length) : g.qty, serials } })} />
                    )}
                  </td>
                  <td className="r c-sub">{i.qty}</td>
                  <td className="r c-amt">
                    {mode === 'receive'
                      ? <Input className="qty-in" inputMode="numeric" value={g.qty} onChange={(e) => setGot({ ...got, [i.id!]: { ...g, qty: e.target.value } })} />
                      : i.receivedQty ?? '—'}
                    {short > 0 && <span className="sub-note" style={{ color: 'var(--danger)' }}>{t('{n} short', { n: short })}</span>}
                  </td>
                  <td className="r hide-sm">{money(i.unitCost)}</td>
                  <td className="r c-type">{money(num(i.qty) * num(i.unitCost))}</td>
                </tr>
              );
            })}
            <tr><td className="c-title"><b>{t('Total cost')}</b></td><td className="hide-sm" /><td className="hide-sm" /><td className="hide-sm" /><td className="r c-amt"><b>{money(orderTotal(po))}</b></td></tr>
          </tbody>
        </table>
      </div>

      {mode === 'receive' && (
        <div className="section">
          <h3>{t('Receive at {loc}', { loc: loc(po.locationId) })}</h3>
          <p className="pay-empty">{t('Enter what actually arrived. Items with serial numbers need one serial per unit. Anything short is recorded.')}</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button disabled={busy} onClick={() => act('receive', t('{num} received · stock added at {loc}', { num: po.number, loc: loc(po.locationId) }), {
              items: po.items.map((i) => ({ id: i.id, receivedQty: Number(got[i.id!].qty), receivedSerials: got[i.id!].serials })),
            })}>{t('Confirm received')}</Button>
            <Button variant="outline" onClick={() => { setMode('view'); setErr(''); }}>{t('Cancel')}</Button>
            <span style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</span>
          </div>
        </div>
      )}
      {mode === 'view' && open && <p className="pay-empty">{t('Not in stock yet. Press Receive when the parcel arrives at {loc}.', { loc: loc(po.locationId) })}</p>}

      {(po.transfers?.length || 0) > 0 && (
        <div className="section">
          <h3>{t('Transfers')}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {po.transfers!.map((x) => (
              <Button key={x.id} variant="outline" onClick={() => navigate(`/transfers/${x.id}`)}>
                {x.number} → {loc(x.toId)} <TransferBadge s={x.status} />
              </Button>
            ))}
          </div>
        </div>
      )}
      {po.notes && <div className="section"><h3>{t('Note')}</h3><p>{po.notes}</p></div>}
    </>
  );
}
