'use client';

import { useState } from 'react';
import { useStock } from '@/lib/useStock';
import { useApp } from './AppContext';
import { norm } from './Picker';

export function StockPage() {
  const { t, money, navigate } = useApp();
  const { data } = useStock();
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [hideZero, setHideZero] = useState(true);
  if (!data) return <div className="loading">{t('Loading…')}</div>;

  const locs = data.locations.filter((l) => l.active || data.rows.some((r) => r.byLocation[l.id]));
  const qtyOf = (r: (typeof data.rows)[number]) => (loc ? r.byLocation[loc] || 0 : r.total);
  const query = norm(q);
  const rows = data.rows.filter((r) => (!query || norm(r.name).includes(query) || norm(r.code).includes(query))
    && (!hideZero || qtyOf(r) !== 0 || (!loc && r.transit > 0) || (loc && r.inTransit[loc] > 0)));
  const units = rows.reduce((s, r) => s + qtyOf(r), 0);
  const transit = rows.reduce((s, r) => s + (loc ? r.inTransit[loc] || 0 : r.transit), 0);
  const value = rows.reduce((s, r) => s + Math.max(0, qtyOf(r)) * r.avgCost, 0);
  const negative = rows.filter((r) => locs.some((l) => (r.byLocation[l.id] || 0) < 0)).length;

  return (
    <>
      <div className="list-head">
        <h2>{t('Stock')}</h2>
        <div className="spacer" />
        <button className="btn" onClick={() => navigate('/stock/adjust')}>{t('Adjust stock')}</button>
        <button className="btn" onClick={() => navigate('/transfers/new')}>{t('+ Transfer')}</button>
        <button className="btn primary" onClick={() => navigate('/purchases/new')}>{t('+ Purchase order')}</button>
      </div>
      <div className="stats">
        <div className="stat"><div className="k">{t('Units in stock')}</div><div className="v">{units}</div><div className="s">{loc ? locs.find((l) => l.id === loc)?.name : t('All locations')}</div></div>
        <div className="stat"><div className="k">{t('Stock value')}</div><div className="v">{money(value)}</div><div className="s">{t('at average cost')}</div></div>
        <div className="stat"><div className="k">{t('In transit')}</div><div className="v">{transit}</div><div className="s">{t('on the way')}</div></div>
        <div className="stat"><div className="k">{t('Below zero')}</div><div className={`v ${negative ? 'red' : ''}`}>{negative}</div><div className="s">{t('items to check')}</div></div>
      </div>
      <div className="card">
        <div className="toolbar">
          <select className="filter" value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="">{t('All locations')}</option>
            {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} /> {t('Hide items with no stock')}</label>
          <input className="search" placeholder={t('Search items…')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {rows.length ? (
          <table className="list cards stock">
            <thead><tr>
              <th>{t('Item')}</th>
              {locs.map((l) => <th key={l.id} className={`r ${loc && loc !== l.id ? 'hide-md' : ''}`}>{l.name}</th>)}
              <th className="r">{t('In transit')}</th><th className="r">{t('Total')}</th>
              <th className="r hide-md">{t('Avg cost')}</th><th className="r hide-sm">{t('Value')}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr className="row" key={r.id} onClick={() => navigate(`/stock/${r.id}`)}>
                  <td className="c-title"><b>{r.name}</b>{r.code && <span className="sub-note">{r.code}</span>}</td>
                  {locs.map((l) => {
                    const v = r.byLocation[l.id] || 0, tr = r.inTransit[l.id] || 0;
                    return (
                      <td key={l.id} className={`r num-cell ${loc && loc !== l.id ? 'hide-md' : ''} ${v < 0 ? 'neg' : v === 0 ? 'zero' : ''}`} data-label={l.name}>
                        {v}{tr > 0 && <span className="incoming" title={t('On the way here')}>+{tr}</span>}
                      </td>
                    );
                  })}
                  <td className="r hide-sm">{r.transit || '—'}</td>
                  <td className="r c-amt"><b>{r.total}</b> <span className="unit">{r.unit}</span></td>
                  <td className="r hide-md">{r.avgCost ? money(r.avgCost) : '—'}</td>
                  <td className="r hide-sm">{r.avgCost ? money(Math.max(0, r.total) * r.avgCost) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty"><b>{t('No stock yet')}</b>{t('Record a purchase order or enter opening stock to start.')}</div>
        )}
      </div>
    </>
  );
}
