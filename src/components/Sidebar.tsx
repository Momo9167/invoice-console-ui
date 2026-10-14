'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client';
import type { Lang, Settings } from '@/lib/types';
import { useApp } from './AppContext';

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const ICONS = {
  docs: icon('M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6'),
  master: icon('M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'),
  settings: icon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
  out: icon('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
};

export function Sidebar() {
  const { t, navigate, confirmLeave, settings } = useApp();
  const path = usePathname();
  const [switching, setSwitching] = useState(false);

  const link = (href: string, label: string, ic: keyof typeof ICONS, active: boolean) => (
    <a href={href} className={active ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate(href); }}>
      {ICONS[ic]}<span>{t(label)}</span>
    </a>
  );

  // Saves the app language, then reloads so every screen picks it up.
  async function setLang(uiLang: Lang) {
    if (uiLang === settings.uiLang || !confirmLeave()) return;
    setSwitching(true);
    await api<Settings>('/api/settings', { method: 'PUT', body: { uiLang } });
    location.reload();
  }

  return (
    <aside className="sidebar no-print">
      <div className="brand" onClick={() => navigate('/')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" /> Mooe <span>Console</span>
      </div>
      <nav className="side-nav">
        {link('/', 'Documents', 'docs', path === '/' || path.startsWith('/docs'))}
        {link('/master/customers', 'Master Data', 'master', path.startsWith('/master'))}
        {link('/settings', 'Settings', 'settings', path === '/settings')}
      </nav>
      <div className="side-new">
        <button className="btn primary" onClick={() => navigate('/docs/new/invoice')}>{t('+ Invoice')}</button>
        <button className="btn ghost-light" onClick={() => navigate('/docs/new/quotation')}>{t('+ Quotation')}</button>
      </div>
      <div className="side-bottom">
        <div className="side-label">{t('Language')}</div>
        <div className="lang-toggle" role="group" aria-label={t('Language')}>
          <button className={settings.uiLang !== 'my' ? 'on' : ''} disabled={switching} onClick={() => setLang('en')}>EN</button>
          <button className={settings.uiLang === 'my' ? 'on' : ''} disabled={switching} onClick={() => setLang('my')}>မြန်မာ</button>
        </div>
        <button className="side-out" onClick={async () => {
          if (!confirmLeave()) return;
          await api('/api/auth/logout', { method: 'POST' });
          location.href = '/login';
        }}>{ICONS.out}<span>{t('Sign out')}</span></button>
      </div>
    </aside>
  );
}
