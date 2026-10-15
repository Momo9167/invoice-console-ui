'use client';

import { num } from '@/lib/calc';
import type { ProductDTO } from '@/lib/types';
import { useApp } from './AppContext';
import { norm, Picker } from './Picker';
import { SerialInput } from './SerialInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface Line { productId: string; label: string; qty: string | number; unitCost?: string | number; serials: string[] }
export const blankLine = (): Line => ({ productId: '', label: '', qty: 1, unitCost: '', serials: [] });

// Item lines for purchase orders (with cost) and transfers (with stock at the source).
export function LinesEditor({ lines, onChange, withCost, available, serialSuggestions, serialsOptional }: {
  lines: Line[];
  onChange: (l: Line[]) => void;
  withCost?: boolean;
  available?: (productId: string) => number; // stock at the source location
  serialSuggestions?: Record<string, string[]>;
  serialsOptional?: boolean; // purchase orders: serials can be entered now or when receiving
}) {
  const { t, money, products } = useApp();
  const set = (i: number, patch: Partial<Line>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const product = (id: string) => products.find((p) => p.id === id);

  return (
    <>
      {lines.map((l, i) => {
        const p = product(l.productId);
        const avail = p && available ? available(p.id) : null;
        return (
          <div className="item" key={i}>
            <div className="item-top">
              <span className="n">{i + 1}</span>
              <Picker<ProductDTO>
                value={l.label}
                onChange={(label) => set(i, { label, productId: '' })}
                search={(q) => products.filter((x) => !q || norm(x.name).includes(q) || norm(x.code).includes(q))}
                renderRow={(x) => <><span>{x.code && <span className="code">{x.code}</span>}{x.name}</span><small>{x.serialTracked ? t('has serials') : x.unit}</small></>}
                onPick={(x) => set(i, { productId: x.id, label: x.name, unitCost: l.unitCost || '' })}
                empty={products.length ? t('No saved item matches') : t('Add items in Master Data first')}
                inputProps={{ placeholder: t('Choose an item…') }}
              />
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" title={t('Remove')} aria-label={t('Remove')} onClick={() => onChange(lines.filter((_, j) => j !== i))}>×</Button>
            </div>
            {!l.productId && l.label && <div className="pay-empty" style={{ color: 'var(--danger)', margin: '0 0 6px' }}>{t('Pick the item from the list')}</div>}
            <div className="item-grid" style={{ gridTemplateColumns: withCost ? '80px 1fr 1fr' : '80px 1fr' }}>
              <label><span>{t('Qty')}</span><Input inputMode="numeric" value={l.qty} onChange={(e) => set(i, { qty: e.target.value })} /></label>
              {withCost && <label><span>{t('Unit cost')}</span><Input inputMode="decimal" placeholder="0" value={l.unitCost ?? ''} onChange={(e) => set(i, { unitCost: e.target.value })} /></label>}
              {withCost
                ? <label><span>{t('Line cost')}</span><Input readOnly value={money(num(l.qty) * num(l.unitCost))} /></label>
                : avail !== null && <div className={`avail${avail < num(l.qty) ? ' low' : ''}`}><span>{t('Available')}</span><b>{avail}</b></div>}
            </div>
            {p?.serialTracked && (
              <SerialInput serials={l.serials} qty={l.qty} required={!serialsOptional} onChange={(serials) => set(i, { serials })}
                suggestions={serialSuggestions?.[p.id]} />
            )}
          </div>
        );
      })}
      <Button variant="outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onChange([...lines, blankLine()])}>{t('+ Add item')}</Button>
    </>
  );
}

// Lines -> API payload
export const linesPayload = (lines: Line[], withCost = false) =>
  lines.filter((l) => l.productId).map((l) => ({
    productId: l.productId, qty: Number(l.qty), serials: l.serials, ...(withCost ? { unitCost: l.unitCost || 0 } : {}),
  }));
