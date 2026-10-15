'use client';

import { useState } from 'react';
import { num, splitSerials } from '@/lib/calc';
import { useApp } from './AppContext';

// Tag-style input for several serial numbers on one line item. Works with barcode scanners (they press Enter).
export function SerialInput({ serials, qty, onChange, suggestions, required }: {
  serials: string[]; qty: unknown; onChange: (s: string[]) => void;
  suggestions?: string[]; // serials in stock at the chosen location, shown as quick picks
  required?: boolean;
}) {
  const { t, toast } = useApp();
  const [text, setText] = useState('');

  const add = (raw: string) => {
    const parts = splitSerials(raw);
    const fresh = parts.filter((x, i) => !serials.includes(x) && parts.indexOf(x) === i);
    const dupes = parts.length - fresh.length;
    if (dupes) toast(t(dupes > 1 ? '{n} duplicate serials skipped' : '{n} duplicate serial skipped', { n: dupes }));
    if (fresh.length) onChange([...serials, ...fresh]);
    setText('');
  };

  const n = serials.length, q = num(qty);
  return (
    <div className="sn">
      <div className="sn-head">
        <span>{t('Serial Nos.')}</span>
        {(n > 0 || required) && <span className={n === q ? 'full' : 'warn'}>{n} / {q}{n === q ? ' ✓' : ''}</span>}
      </div>
      <div className="sn-box" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus(); }}>
        {serials.map((x, j) => (
          <span className="sn-tag" key={x}>
            {x}
            <button type="button" title={t('Remove')} aria-label={`${t('Remove')} ${x}`} onClick={() => onChange(serials.filter((_, k) => k !== j))}>×</button>
          </span>
        ))}
        <input
          value={text}
          aria-label={t('Serial Nos.')}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          placeholder={t(n ? 'Add another…' : 'Type or scan, press Enter')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && text.trim()) { e.preventDefault(); add(text); }
            else if (e.key === 'Enter') e.preventDefault();
            else if (e.key === 'Backspace' && !text && n) onChange(serials.slice(0, -1));
          }}
          onPaste={(e) => { e.preventDefault(); add(e.clipboardData.getData('text')); }}
          onBlur={() => { if (text.trim()) add(text); }}
        />
      </div>
      {suggestions && suggestions.filter((x) => !serials.includes(x)).length > 0 && (
        <div className="sn-suggest">
          <span>{t('In stock here:')}</span>
          {suggestions.filter((x) => !serials.includes(x)).slice(0, 40).map((x) => (
            <button type="button" key={x} onClick={() => onChange([...serials, x])}>+ {x}</button>
          ))}
        </div>
      )}
    </div>
  );
}
