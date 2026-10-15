'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useApp } from './AppContext';

// Lets a plain click open the page in the app. Ctrl/Cmd/Shift-click and middle-click keep the browser's
// own behaviour, such as opening a new tab.
export function useLinkClick() {
  const { navigate } = useApp();
  return (e: MouseEvent, href: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
}

// A real link inside a clickable table row, so keyboard users can Tab to it and open it with Enter.
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  const onClick = useLinkClick();
  return (
    <a href={href} className="row-link" onClick={(e) => { e.stopPropagation(); onClick(e, href); }}>
      {children}
    </a>
  );
}
