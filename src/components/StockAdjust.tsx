'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client';
import { useSerials, useStock } from '@/lib/useStock';
import type { ProductDTO } from '@/lib/types';
import { useApp } from './AppContext';
import { norm, Picker } from './Picker';
import { SerialInput } from './SerialInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Opening stock (first count) or a correction at one location.
export function StockAdjust() {
  const { t, toast, products, locations, navigate } = useApp();
  const search = useSearchParams();
  const pre = products.find((p) => p.id === search.get('product'));
  const active = locations.filter((l) => l.active);
  const [productId, setProductId] = useState(pre?.id || '');
  const [label, setLabel] = useState(pre?.name || '');
  const [locationId, setLocationId] = useState(active[0]?.id || '');
  const [kind, setKind] = useState<'opening' | 'adjust'>('opening');
  const [dir, setDir] = useState<'add' | 'remove'>('add');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { qty: have } = useStock();
  const inStock = useSerials(dir === 'remove' ? locationId : null);
  const p = products.find((x) => x.id === productId);

  async function save() {
    setErr('');
    const n = Number(qty);
    if (!p) return setErr(t('Choose an item'));
    if (!Number.isInteger(n) || n <= 0) return setErr(t('Quantity must be a whole number above 0'));
    setBusy(true);
    try {
      await api('/api/stock/adjust', { method: 'POST', body: {
        productId, locationId, kind: dir === 'add' ? kind : 'adjust', qty: dir === 'add' ? n : -n,
        unitCost: dir === 'add' ? unitCost : undefined, serials, note,
      } });
      toast(t('Stock updated'));
      navigate(`/stock/${productId}`);
    } catch (e) { setErr(t((e as Error).message)); } finally { setBusy(false); }
  }

  return (
    <div className="settings">
      <div className="ed-bar">
        <Button variant="outline" onClick={() => navigate('/stock')}>{t('← Back')}</Button>
        <h2>{t('Adjust stock')}</h2>
      </div>
      <div className="form">
        <div className="section">
          <h3>{t('Item & location')}</h3>
          <label className="f">{t('Item')}
            <Picker<ProductDTO> value={label} onChange={(v) => { setLabel(v); setProductId(''); }}
              search={(q) => products.filter((x) => !q || norm(x.name).includes(q) || norm(x.code).includes(q))}
              renderRow={(x) => <><span>{x.name}</span><small>{x.code}</small></>}
              onPick={(x) => { setProductId(x.id); setLabel(x.name); setSerials([]); }}
              empty={t('No saved item matches')} inputProps={{ placeholder: t('Choose an item…') }} />
          </label>
          <div className="grid2" style={{ marginTop: 10 }}>
            <label className="f">{t('Location')}
              <select className="i" value={locationId} onChange={(e) => { setLocationId(e.target.value); setSerials([]); }}>
                {active.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <div className="f"><span>{t('Now in stock')}</span><b style={{ fontSize: 18, paddingTop: 6 }}>{p ? have(p.id, locationId) : '—'}</b></div>
          </div>
        </div>
        <div className="section">
          <h3>{t('Change')}</h3>
          <div className="seg" style={{ marginBottom: 12 }}>
            <button className={dir === 'add' ? 'on' : ''} onClick={() => { setDir('add'); setSerials([]); }}>{t('Add stock')}</button>
            <button className={dir === 'remove' ? 'on' : ''} onClick={() => { setDir('remove'); setSerials([]); }}>{t('Remove stock')}</button>
          </div>
          {dir === 'add' && (
            <div className="seg" style={{ marginBottom: 12, marginLeft: 8 }}>
              <button className={kind === 'opening' ? 'on' : ''} onClick={() => setKind('opening')}>{t('Opening stock')}</button>
              <button className={kind === 'adjust' ? 'on' : ''} onClick={() => setKind('adjust')}>{t('Correction')}</button>
            </div>
          )}
          <div className="grid2">
            <label className="f">{t('Quantity')}<Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
            {dir === 'add' && <label className="f">{t('Unit cost')} ({t('optional')})<Input inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></label>}
          </div>
          {p?.serialTracked && (
            <SerialInput serials={serials} qty={qty} onChange={setSerials} suggestions={dir === 'remove' ? inStock[p.id] : undefined} />
          )}
          <label className="f" style={{ marginTop: 10 }}>{t('Note')}<Input placeholder={t('e.g. counted on 14 Oct, 1 damaged')} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button disabled={busy} onClick={save}>{t('Save')}</Button>
          </div>
          <div className="err" style={{ color: 'var(--danger)', marginTop: 8, fontSize: 13 }}>{err}</div>
        </div>
      </div>
    </div>
  );
}
