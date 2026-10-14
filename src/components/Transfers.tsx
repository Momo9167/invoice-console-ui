'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client';
import { fmtDate, num, today } from '@/lib/calc';
import { useSerials, useStock } from '@/lib/useStock';
import type { PurchaseDTO, TransferDTO, TransferStatus } from '@/lib/types';
import { useApp } from './AppContext';
import { blankLine, LinesEditor, linesPayload, type Line } from './LinesEditor';
import { norm } from './Picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const STATUSES: TransferStatus[] = ['pending', 'delivering', 'received', 'cancelled'];
export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export function TransferBadge({ s }: { s: TransferStatus }) {
  const { t } = useApp();
  return <span className={`badge tr-${s}`}>{t('tr.' + s)}</span>;
}

export function TransfersList() {
  const { t, locations, products, navigate } = useApp();
  const [rows, setRows] = useState<TransferDTO[] | null>(null);
  const [status, setStatus] = useState<'' | TransferStatus>('');
  const [q, setQ] = useState('');
  useEffect(() => { api<TransferDTO[]>('/api/transfers').then(setRows); }, []);
  if (!rows) return <div className="loading">{t('Loading…')}</div>;
  const loc = (id: string) => locations.find((l) => l.id === id)?.name || '—';
  const pname = (id: string) => products.find((p) => p.id === id)?.name || '';
  const query = norm(q);
  const shown = rows.filter((r) => (!status || r.status === status)
    && (!query || norm(r.number).includes(query) || r.items.some((i) => norm(pname(i.productId)).includes(query))));
  const count = (s: TransferStatus) => rows.filter((r) => r.status === s).length;

  return (
    <>
      <div className="list-head">
        <h2>{t('Transfers')}</h2>
        <div className="spacer" />
        <Button onClick={() => navigate('/transfers/new')}>{t('+ Transfer')}</Button>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="seg">
            <button className={!status ? 'on' : ''} onClick={() => setStatus('')}>{t('All')}</button>
            {STATUSES.map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{t('tr.' + s)} <span className="cnt">{count(s)}</span></button>)}
          </div>
          <Input className="search" placeholder={t('Search transfer no. or item…')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {shown.length ? (
          <table className="list cards">
            <thead><tr><th>{t('Date')}</th><th>{t('Number')}</th><th>{t('Route')}</th><th className="hide-md">{t('Items')}</th><th className="r">{t('Qty')}</th><th className="r">{t('Status')}</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr className="row" key={r.id} onClick={() => navigate(`/transfers/${r.id}`)}>
                  <td className="c-date">{fmtDate(r.date)}</td>
                  <td className="c-title"><b>{r.number}</b></td>
                  <td className="c-sub">{loc(r.fromId)} → {loc(r.toId)}</td>
                  <td className="hide-md" style={{ color: 'var(--ink-2)' }}>{r.items.map((i) => pname(i.productId)).join(', ')}</td>
                  <td className="r c-amt">{r.items.reduce((s, i) => s + num(i.qty), 0)}</td>
                  <td className="r c-status"><TransferBadge s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{t(rows.length ? 'No matches' : 'No transfers yet')}</b>{t(rows.length ? 'Try a different search.' : 'Move stock between locations with “+ Transfer”.')}</div>}
      </div>
    </>
  );
}

// Form used for a new transfer and for editing a pending one.
function TransferForm({ initial, onSaved }: { initial: Partial<TransferDTO> & { lines: Line[] }; onSaved: (t: TransferDTO) => void }) {
  const { t, toast, locations, navigate } = useApp();
  const active = locations.filter((l) => l.active);
  const [date, setDate] = useState(initial.date || today());
  const [fromId, setFromId] = useState(initial.fromId || active[0]?.id || '');
  const [toId, setToId] = useState(initial.toId || active.find((l) => l.id !== (initial.fromId || active[0]?.id))?.id || '');
  const [lines, setLines] = useState<Line[]>(initial.lines.length ? initial.lines : [blankLine()]);
  const [notes, setNotes] = useState(initial.notes || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { qty } = useStock();
  const serials = useSerials(fromId);

  async function save(andSend: boolean) {
    setErr('');
    if (lines.some((l) => l.label && !l.productId)) return setErr(t('Pick every item from the list'));
    setBusy(true);
    try {
      const body = { date, fromId, toId, notes, items: linesPayload(lines), purchaseOrderId: initial.purchaseOrderId, previousId: initial.previousId };
      let tr = initial.id
        ? await api<TransferDTO>(`/api/transfers/${initial.id}`, { method: 'PUT', body })
        : await api<TransferDTO>('/api/transfers', { method: 'POST', body });
      if (andSend) {
        try { tr = await api<TransferDTO>(`/api/transfers/${tr.id}/send`, { method: 'POST' }); }
        catch (e) { toast(t('{num} saved as pending', { num: tr.number })); onSaved(tr); setErr(t((e as Error).message)); setBusy(false); return; }
      }
      toast(t(andSend ? '{num} sent · stock on the way' : '{num} saved', { num: tr.number }));
      onSaved(tr);
    } catch (e) { setErr(t((e as Error).message)); setBusy(false); }
  }

  return (
    <>
      <div className="ed-bar">
        <Button variant="outline" onClick={() => navigate(initial.id ? `/transfers/${initial.id}` : '/transfers')}>{t('← Back')}</Button>
        <h2>{initial.id ? t('Edit {num}', { num: initial.number }) : t('New transfer')}</h2>
        <div className="spacer" />
        <Button variant="outline" disabled={busy} onClick={() => save(false)}>{t('Save as pending')}</Button>
        <Button disabled={busy} onClick={() => save(true)}>{t('Save & send')}</Button>
      </div>
      <div className="editor single">
        <div className="form">
          <div className="section">
            <h3>{t('Route')}</h3>
            <div className="route-pick">
              <label className="f">{t('From')}
                <select className="i" value={fromId} onChange={(e) => { setFromId(e.target.value); setLines(lines.map((l) => ({ ...l, serials: [] }))); }}>
                  {active.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <span className="route-arrow">→</span>
              <label className="f">{t('To')}
                <select className="i" value={toId} onChange={(e) => setToId(e.target.value)}>
                  {active.filter((l) => l.id !== fromId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <label className="f">{t('Date')}<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            </div>
          </div>
          <div className="section">
            <h3>{t('Items')}</h3>
            <LinesEditor lines={lines} onChange={setLines} available={(pid) => qty(pid, fromId)} serialSuggestions={serials} />
          </div>
          <div className="section">
            <label className="f">{t('Note')}<Textarea rows={2} placeholder={t('e.g. car / bus / driver')} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <p className="pay-empty" style={{ marginTop: 10 }}>{t('Pending changes nothing. Sending takes the stock out of the From location; receiving adds it at the To location.')}</p>
            <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>
          </div>
        </div>
      </div>
    </>
  );
}

const toLines = (items: { productId: string; qty: number | string; serials: string[] }[], name: (id: string) => string): Line[] =>
  items.map((i) => ({ productId: i.productId, label: name(i.productId), qty: i.qty, serials: [...i.serials] }));

// New transfer. ?po=<purchase id> starts from an order; ?prev=<transfer id> forwards what arrived.
export function TransferNew() {
  const { t, products, locations, navigate } = useApp();
  const search = useSearchParams();
  const poId = search.get('po'), prevId = search.get('prev');
  const [initial, setInitial] = useState<(Partial<TransferDTO> & { lines: Line[] }) | null>(null);
  const name = (id: string) => products.find((p) => p.id === id)?.name || '';

  useEffect(() => {
    const byName = (n: string) => locations.find((l) => l.active && l.name.toLowerCase() === n)?.id;
    (async () => {
      if (poId) {
        const po = await api<PurchaseDTO>(`/api/purchases/${poId}`);
        setInitial({ fromId: po.locationId, toId: byName('bago') !== po.locationId ? byName('bago') : undefined, purchaseOrderId: po.id, notes: `${po.number}`, lines: toLines(po.items, name) });
      } else if (prevId) {
        const prev = await api<TransferDTO>(`/api/transfers/${prevId}`);
        const got = prev.items.map((i) => ({ productId: i.productId, qty: i.receivedQty ?? i.qty, serials: i.receivedSerials ?? i.serials })).filter((i) => num(i.qty) > 0);
        setInitial({ fromId: prev.toId, toId: byName('yangon') !== prev.toId ? byName('yangon') : undefined, previousId: prev.id, notes: prev.notes, lines: toLines(got, name) });
      } else setInitial({ lines: [] });
    })();
  }, [poId, prevId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!initial) return <div className="loading">{t('Loading…')}</div>;
  return <TransferForm initial={initial} onSaved={(tr) => navigate(`/transfers/${tr.id}`)} />;
}

export function TransferView({ id }: { id: string }) {
  const { t, toast, products, locations, navigate } = useApp();
  const [tr, setTr] = useState<TransferDTO | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'receive'>('view');
  const [got, setGot] = useState<Record<string, { qty: string; serials: string[] }>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<TransferDTO>(`/api/transfers/${id}`).then(setTr); }, [id]);
  if (!tr) return <div className="loading">{t('Loading…')}</div>;
  const loc = (lid: string) => locations.find((l) => l.id === lid)?.name || '—';
  const pname = (pid: string) => products.find((p) => p.id === pid)?.name || '—';

  if (mode === 'edit') {
    return <TransferForm initial={{ ...tr, lines: toLines(tr.items, pname) }} onSaved={(x) => { setTr(x); setMode('view'); }} />;
  }

  const act = async (path: string, msg: string, body?: unknown) => {
    setBusy(true);
    try { setTr(await api<TransferDTO>(`/api/transfers/${id}/${path}`, { method: 'POST', body })); setMode('view'); toast(msg); }
    catch (e) { toast(t((e as Error).message)); }
    finally { setBusy(false); }
  };
  const startReceive = () => {
    setGot(Object.fromEntries(tr.items.map((i) => [i.id!, { qty: String(i.qty), serials: [...i.serials] }])));
    setMode('receive');
  };

  return (
    <>
      <div className="ed-bar">
        <Button variant="outline" onClick={() => navigate('/transfers')}>{t('← Back')}</Button>
        <h2>{t('Transfer')} {tr.number}</h2>
        <TransferBadge s={tr.status} />
        <div className="spacer" />
        {tr.status === 'pending' && <>
          <Button variant="destructive" disabled={busy} onClick={async () => {
            if (!confirm(t('Delete {num}?', { num: tr.number }))) return;
            await api(`/api/transfers/${id}`, { method: 'DELETE' }); toast(t('Deleted')); navigate('/transfers');
          }}>{t('Delete')}</Button>
          <Button variant="outline" onClick={() => setMode('edit')}>{t('Edit')}</Button>
          <Button disabled={busy} onClick={() => act('send', t('{num} sent · stock on the way', { num: tr.number }))}>{t('Send')}</Button>
        </>}
        {tr.status === 'delivering' && mode === 'view' && <>
          <Button variant="destructive" disabled={busy} onClick={() => confirm(t('Cancel {num}? The stock goes back to {loc}.', { num: tr.number, loc: loc(tr.fromId) })) && act('cancel', t('Transfer cancelled'))}>{t('Cancel transfer')}</Button>
          <Button onClick={startReceive}>{t('Receive')}</Button>
        </>}
        {tr.status === 'received' && <Button onClick={() => navigate(`/transfers/new?prev=${tr.id}`)}>{t('Forward to…')}</Button>}
      </div>

      <div className="route-banner">
        <div><small>{t('From')}</small><b>{loc(tr.fromId)}</b></div>
        <span className="route-arrow">→</span>
        <div><small>{t('To')}</small><b>{loc(tr.toId)}</b></div>
        <div className="steps">
          <Step on label={t('tr.pending')} sub={[tr.createdBy, when(tr.createdAt)].filter(Boolean).join(' · ')} />
          <Step on={!!tr.sentAt} label={t('tr.delivering')} sub={[tr.sentBy, when(tr.sentAt)].filter(Boolean).join(' · ')} />
          {tr.status === 'cancelled'
            ? <Step on cancelled label={t('tr.cancelled')} sub={[tr.cancelledBy, when(tr.cancelledAt)].filter(Boolean).join(' · ')} />
            : <Step on={!!tr.receivedAt} label={t('tr.received')} sub={[tr.receivedBy, when(tr.receivedAt)].filter(Boolean).join(' · ')} />}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <table className="list cards">
          <thead><tr><th>{t('Item')}</th><th className="r">{t('Sent')}</th><th className="r">{t('Received qty')}</th></tr></thead>
          <tbody>
            {tr.items.map((i) => {
              const g = got[i.id!];
              const short = i.receivedQty != null ? i.qty as number - i.receivedQty : 0;
              return (
                <tr key={i.id}>
                  <td className="c-title">
                    <b>{pname(i.productId)}</b>
                    {i.serials.length > 0 && mode !== 'receive' && <span className="sub-note">S/N: {i.serials.map((s) => (i.receivedSerials && !i.receivedSerials.includes(s) ? `${s} ✗` : s)).join(' · ')}</span>}
                    {mode === 'receive' && i.serials.length > 0 && (
                      <div className="tick-serials">
                        {i.serials.map((s) => (
                          <label key={s}><input type="checkbox" checked={g.serials.includes(s)} onChange={(e) => {
                            const serials = e.target.checked ? [...g.serials, s] : g.serials.filter((x) => x !== s);
                            setGot({ ...got, [i.id!]: { qty: String(serials.length), serials } });
                          }} /> {s}</label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="r c-sub">{i.qty}</td>
                  <td className="r c-amt">
                    {mode === 'receive'
                      ? <Input className="qty-in" inputMode="numeric" value={g.qty} disabled={i.serials.length > 0} onChange={(e) => setGot({ ...got, [i.id!]: { ...g, qty: e.target.value } })} />
                      : i.receivedQty ?? '—'}
                    {short > 0 && <span className="sub-note" style={{ color: 'var(--danger)' }}>{t('{n} short', { n: short })}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mode === 'receive' && (
        <div className="section">
          <p className="pay-empty">{t('Check what actually arrived at {loc}. Untick any serial that is missing; anything short is recorded.', { loc: loc(tr.toId) })}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button disabled={busy} onClick={() => act('receive', t('{num} received at {loc}', { num: tr.number, loc: loc(tr.toId) }), {
              items: tr.items.map((i) => ({ id: i.id, receivedQty: Number(got[i.id!].qty), receivedSerials: i.serials.length ? got[i.id!].serials : undefined })),
            })}>{t('Confirm received')}</Button>
            <Button variant="outline" onClick={() => setMode('view')}>{t('Cancel')}</Button>
          </div>
        </div>
      )}
      {tr.status === 'pending' && (
        <div className="section"><Button variant="destructive" disabled={busy} onClick={() => confirm(t('Cancel {num}?', { num: tr.number })) && act('cancel', t('Transfer cancelled'))}>{t('Cancel transfer')}</Button></div>
      )}
      {tr.notes && <div className="section"><h3>{t('Note')}</h3><p>{tr.notes}</p></div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tr.purchaseOrderId && <Button variant="outline" onClick={() => navigate(`/purchases/${tr.purchaseOrderId}`)}>{t('Open purchase order')}</Button>}
        {tr.previousId && <Button variant="outline" onClick={() => navigate(`/transfers/${tr.previousId}`)}>{t('Previous transfer')}</Button>}
      </div>
    </>
  );
}

export function Step({ on, label, sub, cancelled }: { on: boolean; label: string; sub?: string; cancelled?: boolean }) {
  return (
    <div className={`step${on ? ' on' : ''}${cancelled ? ' cancelled' : ''}`}>
      <i />
      <div><b>{label}</b>{on && sub && <small>{sub}</small>}</div>
    </div>
  );
}
