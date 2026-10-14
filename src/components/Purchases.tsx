'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDate, num, today } from '@/lib/calc';
import type { PurchaseDTO } from '@/lib/types';
import { useApp } from './AppContext';
import { blankLine, LinesEditor, linesPayload, type Line } from './LinesEditor';
import { norm } from './Picker';

const orderTotal = (p: PurchaseDTO) => p.items.reduce((s, i) => s + num(i.qty) * num(i.unitCost), 0);

export function PurchasesList() {
  const { t, money, locations, navigate } = useApp();
  const [rows, setRows] = useState<PurchaseDTO[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { api<PurchaseDTO[]>('/api/purchases').then(setRows); }, []);
  if (!rows) return <div className="loading">{t('Loading…')}</div>;
  const loc = (id: string) => locations.find((l) => l.id === id)?.name || '—';
  const query = norm(q);
  const shown = rows.filter((r) => !query || [r.number, r.supplier, r.orderRef].some((x) => norm(x).includes(query)));

  return (
    <>
      <div className="list-head">
        <h2>{t('Purchase orders')}</h2>
        <div className="spacer" />
        <button className="btn primary" onClick={() => navigate('/purchases/new')}>{t('+ Purchase order')}</button>
      </div>
      <div className="card">
        <div className="toolbar"><input className="search" placeholder={t('Search order, supplier or online order no…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {shown.length ? (
          <table className="list cards">
            <thead><tr><th>{t('Date')}</th><th>{t('Number')}</th><th>{t('Supplier')}</th><th className="hide-sm">{t('Arrives at')}</th><th className="hide-md">{t('Transfers')}</th><th className="r">{t('Cost')}</th><th className="r">{t('Status')}</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr className="row" key={r.id} onClick={() => navigate(`/purchases/${r.id}`)}>
                  <td className="c-date">{fmtDate(r.date)}</td>
                  <td className="c-title"><b>{r.number}</b>{r.orderRef && <span className="sub-note">{r.orderRef}</span>}</td>
                  <td className="c-sub">{r.supplier || '—'}</td>
                  <td className="hide-sm c-type">{loc(r.locationId)}</td>
                  <td className="hide-md">{r.transfers?.map((x) => <span key={x.id} className={`badge tr-${x.status}`} style={{ marginRight: 4 }}>{x.number}</span>)}</td>
                  <td className="r c-amt">{money(orderTotal(r))}</td>
                  <td className="r c-status"><span className={`badge ${r.status === 'cancelled' ? 'st-void' : 'st-paid'}`}>{t(r.status === 'cancelled' ? 'Cancelled' : 'In stock')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{t(rows.length ? 'No matches' : 'No purchase orders yet')}</b>{t(rows.length ? 'Try a different search.' : 'When an online order is placed, record it here to add the stock.')}</div>}
      </div>
    </>
  );
}

export function PurchaseNew() {
  const { t, money, toast, locations, navigate } = useApp();
  const active = locations.filter((l) => l.active);
  const defaultLoc = active.find((l) => l.name.toLowerCase() === 'myawaddy') || active[0];
  const [date, setDate] = useState(today());
  const [supplier, setSupplier] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [locationId, setLocationId] = useState(defaultLoc?.id || '');
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const total = lines.reduce((s, l) => s + num(l.qty) * num(l.unitCost), 0);

  async function save() {
    setErr('');
    if (lines.some((l) => l.label && !l.productId)) return setErr(t('Pick every item from the list'));
    setBusy(true);
    try {
      const po = await api<PurchaseDTO>('/api/purchases', { method: 'POST', body: { date, supplier, orderRef, locationId, notes, items: linesPayload(lines, true) } });
      toast(t('{num} saved · stock added', { num: po.number }));
      navigate(`/purchases/${po.id}`);
    } catch (e) { setErr(t((e as Error).message)); setBusy(false); }
  }

  return (
    <>
      <div className="ed-bar">
        <button className="btn" onClick={() => navigate('/purchases')}>{t('← Back')}</button>
        <h2>{t('New purchase order')}</h2>
        <div className="spacer" />
        <button className="btn dark" disabled={busy} onClick={save}>{t('Save & add stock')}</button>
      </div>
      <div className="editor single">
        <div className="form">
          <div className="section">
            <h3>{t('Order')}</h3>
            <div className="grid2">
              <label className="f">{t('Order date')}<input className="i" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="f">{t('Stock arrives at')}
                <select className="i" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {active.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <label className="f">{t('Supplier / website')}<input className="i" value={supplier} placeholder={t('optional')} onChange={(e) => setSupplier(e.target.value)} /></label>
              <label className="f">{t('Online order no.')}<input className="i" value={orderRef} placeholder={t('optional')} onChange={(e) => setOrderRef(e.target.value)} /></label>
            </div>
          </div>
          <div className="section">
            <h3>{t('Items')}</h3>
            <LinesEditor lines={lines} onChange={setLines} withCost />
            <div className="sum big" style={{ marginTop: 12 }}><span>{t('Total cost')}</span><span>{money(total)}</span></div>
          </div>
          <div className="section">
            <label className="f">{t('Note')}<textarea className="i" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <p className="pay-empty" style={{ marginTop: 10 }}>{t('Saving adds these items to stock at {loc} straight away.', { loc: active.find((l) => l.id === locationId)?.name || '' })}</p>
            <div className="err" style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function PurchaseView({ id }: { id: string }) {
  const { t, money, toast, products, locations, navigate } = useApp();
  const [po, setPo] = useState<PurchaseDTO | null>(null);
  useEffect(() => { api<PurchaseDTO>(`/api/purchases/${id}`).then(setPo); }, [id]);
  if (!po) return <div className="loading">{t('Loading…')}</div>;
  const loc = (lid: string) => locations.find((l) => l.id === lid)?.name || '—';
  const pname = (pid: string) => products.find((p) => p.id === pid)?.name || '—';

  return (
    <>
      <div className="ed-bar">
        <button className="btn" onClick={() => navigate('/purchases')}>{t('← Back')}</button>
        <h2>{t('Purchase order')} {po.number}</h2>
        <span className={`badge ${po.status === 'cancelled' ? 'st-void' : 'st-paid'}`}>{t(po.status === 'cancelled' ? 'Cancelled' : 'In stock')}</span>
        <div className="spacer" />
        {po.status !== 'cancelled' && <>
          <button className="btn danger" onClick={async () => {
            if (!confirm(t('Cancel {num}? Its items are taken back out of stock at {loc}.', { num: po.number, loc: loc(po.locationId) }))) return;
            try { setPo(await api(`/api/purchases/${id}/cancel`, { method: 'POST' })); toast(t('Order cancelled')); } catch (e) { toast(t((e as Error).message)); }
          }}>{t('Cancel order')}</button>
          <button className="btn primary" onClick={() => navigate(`/transfers/new?po=${po.id}`)}>{t('Transfer to…')}</button>
        </>}
      </div>
      <div className="stats">
        <div className="stat"><div className="k">{t('Order date')}</div><div className="v sm">{fmtDate(po.date)}</div><div className="s">{t('by {name}', { name: po.createdBy })}</div></div>
        <div className="stat"><div className="k">{t('Supplier / website')}</div><div className="v sm">{po.supplier || '—'}</div><div className="s">{po.orderRef}</div></div>
        <div className="stat"><div className="k">{t('Stock arrives at')}</div><div className="v sm">{loc(po.locationId)}</div></div>
        <div className="stat"><div className="k">{t('Total cost')}</div><div className="v sm">{money(orderTotal(po))}</div></div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <table className="list cards">
          <thead><tr><th>{t('Item')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Unit cost')}</th><th className="r">{t('Line cost')}</th></tr></thead>
          <tbody>
            {po.items.map((i) => (
              <tr key={i.id}>
                <td className="c-title"><b>{pname(i.productId)}</b>{i.serials.length > 0 && <span className="sub-note">S/N: {i.serials.join(' · ')}</span>}</td>
                <td className="r c-sub">{i.qty}</td>
                <td className="r c-type">{money(i.unitCost)}</td>
                <td className="r c-amt">{money(num(i.qty) * num(i.unitCost))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(po.transfers?.length || 0) > 0 && (
        <div className="section">
          <h3>{t('Transfers')}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {po.transfers!.map((x) => (
              <button key={x.id} className="btn" onClick={() => navigate(`/transfers/${x.id}`)}>
                {x.number} → {loc(x.toId)} <span className={`badge tr-${x.status}`}>{t('tr.' + x.status)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {po.notes && <div className="section"><h3>{t('Note')}</h3><p>{po.notes}</p></div>}
      {po.status === 'cancelled' && <p className="pay-empty">{t('Cancelled by {name}', { name: po.cancelledBy || '—' })}</p>}
    </>
  );
}
