'use client';

import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

// Text input with a dropdown of saved records (customers, items). Arrow keys + Enter to pick.
export function Picker<T>({
  value, onChange, search, renderRow, onPick, empty, inputProps,
}: {
  value: string;
  onChange: (v: string) => void;
  search: (q: string) => T[];
  renderRow: (x: T) => ReactNode;
  onPick: (x: T) => void;
  empty?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const matches = open ? search(norm(value)).slice(0, 8) : [];
  const show = open && (matches.length > 0 || !!empty);

  const pick = (x: T) => { setOpen(false); onPick(x); };

  return (
    <div className="ac-wrap" style={{ flex: 1 }}>
      <Input
        autoComplete="off"
        spellCheck={false}
        {...inputProps}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={show ? listId : undefined}
        aria-activedescendant={show && matches.length ? `${listId}-${active}` : undefined}
        value={value}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 100); }}
        onKeyDown={(e) => {
          if (!show || !matches.length) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
          } else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {show && (
        <div className="ac" id={listId} role="listbox">
          {matches.length ? matches.map((x, i) => (
            <div key={i} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(x); }}>
              {renderRow(x)}
            </div>
          )) : <div className="none" role="status">{empty}</div>}
        </div>
      )}
    </div>
  );
}

export { norm };
