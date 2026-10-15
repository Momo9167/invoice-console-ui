'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useStock } from '@/lib/useStock';
import { useApp } from './AppContext';
import { RowLink } from './RowLink';
import { Button } from '@/components/ui/button';

type Move = { id: string; locationId: string; qty: number; kind: string; unitCost: string | null; refType: string; refId: string; refNumber: string; note: string; createdBy: string; createdAt: string };
type Unit = { id: string; serial: string; status: string; locationId: string | null; refNumber: string };

const KIND: Record<string, string> = {
  opening: 'Opening stock', adjust: 'Adjustment', purchase: 'Purchase', purchase_cancel: 'Purchase cancelled',
  transfer_out: 'Transfer out', transfer_in: 'Transfer in', transfer_cancel: 'Transfer cancelled', sale: 'Sale',
};

// One item: stock per location, serial numbers, and full history.
export function StockItem({ productId }: { productId: string }) {
  const { t, money, locations, navigate } = useApp();
  const { data: stock } = useStock();
  const [d, setD] = useState<{ product: { name: string; code: string; unit: string; serialTracked: boolean }; moves: Move[]; serials: Unit[] } | null>(null);
  const [serialFilter, setSerialFilter] = useState('in_stock');
  useEffect(() => { api<typeof d>(`/api/stock/${productId}`).then(setD); }, [productId]);
  if (!d || !stock) return <div className="loading">{t('Loading…')}</div>;

  const row = stock.rows.find((r) => r.id === productId);
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name || '—';
  const PAGE: Record<string, string> = { invoice: '/docs', purchase: '/purchases', transfer: '/transfers' };
  const hrefOf = (m: Move) => (m.refId && PAGE[m.refType || ''] ? `${PAGE[m.refType || '']}/${m.refId}` : '');
  const serials = d.serials.filter((s) => !serialFilter || s.status === serialFilter);

  return (
    <>
      <div className="ed-bar">
        <Button variant="outline" onClick={() => navigate('/stock')}>{t('← Back')}</Button>
        <h2>{d.product.name}</h2>
        <div className="spacer" />
        <Button variant="outline" onClick={() => navigate(`/stock/adjust?product=${productId}`)}>{t('Adjust stock')}</Button>
      </div>
      <div className="stats">
        {stock.locations.filter((l) => l.active).map((l) => (
          <div className="stat" key={l.id}>
            <div className="k">{l.name}</div>
            <div className={`v ${(row?.byLocation[l.id] || 0) < 0 ? 'red' : ''}`}>{row?.byLocation[l.id] || 0}</div>
            <div className="s">{row?.inTransit[l.id] ? t('+{n} on the way', { n: row.inTransit[l.id] }) : d.product.unit}</div>
          </div>
        ))}
        <div className="stat"><div className="k">{t('Total')}</div><div className="v">{row?.total ?? 0}</div><div className="s">{row?.avgCost ? t('Average {amt}', { amt: money(row.avgCost) }) : ''}</div></div>
      </div>

      {d.product.serialTracked && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="toolbar">
            <b style={{ alignSelf: 'center' }}>{t('Serial Nos.')}</b>
            <div className="seg">
              {[['in_stock', 'In stock'], ['in_transit', 'In transit'], ['sold', 'Sold'], ['lost', 'Lost'], ['', 'All']].map(([k, label]) => (
                <button key={k} className={serialFilter === k ? 'on' : ''} onClick={() => setSerialFilter(k)}>
                  {t(label)} {k && <span className="cnt">{d.serials.filter((s) => s.status === k).length}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="serial-grid">
            {serials.length ? serials.map((s) => (
              <div key={s.id} className={`serial-pill st-${s.status}`}>
                <b>{s.serial}</b><span>{s.status === 'in_stock' ? locName(s.locationId) : t(s.status === 'in_transit' ? 'In transit' : s.status === 'sold' ? 'Sold' : 'Lost')}{s.refNumber && ` · ${s.refNumber}`}</span>
              </div>
            )) : <div className="pay-empty">{t('None')}</div>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="toolbar"><b style={{ alignSelf: 'center' }}>{t('History')}</b></div>
        {d.moves.length ? (
          <table className="list cards">
            <thead><tr><th>{t('Date')}</th><th>{t('Type')}</th><th>{t('Reference')}</th><th>{t('Location')}</th><th className="r">{t('Qty')}</th><th className="hide-sm">{t('By')}</th></tr></thead>
            <tbody>
              {d.moves.map((m) => (
                <tr key={m.id} className={hrefOf(m) ? 'row' : ''} onClick={() => hrefOf(m) && navigate(hrefOf(m))}>
                  <td className="c-date">{new Date(m.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="c-title">{t(KIND[m.kind] || m.kind)}{m.note && <span className="sub-note">{m.note}</span>}</td>
                  <td className="c-type">{hrefOf(m) ? <RowLink href={hrefOf(m)}>{m.refNumber}</RowLink> : m.refNumber}</td>
                  <td className="c-sub">{locName(m.locationId)}</td>
                  <td className={`r c-amt ${m.qty < 0 ? 'neg' : 'pos'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                  <td className="hide-sm c-status">{m.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty"><b>{t('No history yet')}</b></div>}
      </div>
    </>
  );
}
