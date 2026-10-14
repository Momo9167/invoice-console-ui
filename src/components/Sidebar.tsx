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
  pay: icon('M3 7h18v10H3zM3 11h18M7 15h3'),
  plus: icon('M12 5v14M5 12h14'),
  share: icon('M21 12a9 9 0 1 1-9-9v9zM12 3a9 9 0 0 1 9 9h-9'),
  expense: icon('M4 4h16v16H4zM8 9h8M8 13h8M8 17h5'),
  stock: icon('M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8'),
  cart: icon('M3 4h2l2.5 11h11L21 7H6.2M9 20a1 1 0 1 0 0-.01M18 20a1 1 0 1 0 0-.01'),
  truck: icon('M2 6h11v9H2zM13 9h4l4 4v2h-8M6 18a2 2 0 1 0 0-.01M17 18a2 2 0 1 0 0-.01'),
};

export function Sidebar() {
  const { t, navigate, confirmLeave, settings, me } = useApp();
  const path = usePathname();
  const [switching, setSwitching] = useState(false);

  const link = (href: string, label: string, ic: keyof typeof ICONS, active: boolean) => (
    <a href={href} title={t(label)} className={active ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate(href); }}>
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
        {link('/payments', 'Payments', 'pay', path === '/payments')}
        {link('/shares', 'Shares', 'share', path.startsWith('/shares'))}
        {link('/expenses', 'Expenses', 'expense', path === '/expenses')}
        <div className="side-label side-group">{t('Stock')}</div>
        {link('/stock', 'Stock', 'stock', path.startsWith('/stock'))}
        {link('/purchases', 'Purchase orders', 'cart', path.startsWith('/purchases'))}
        {link('/transfers', 'Transfers', 'truck', path.startsWith('/transfers'))}
        <div className="side-label side-group" />
        {link('/master/customers', 'Master Data', 'master', path.startsWith('/master'))}
        {link('/settings', 'Settings', 'settings', path === '/settings')}
      </nav>
      <div className="side-new">
        <button className="btn primary" title={t('+ Invoice')} onClick={() => navigate('/docs/new/invoice')}>{ICONS.plus}<span>{t('+ Invoice')}</span></button>
        <button className="btn ghost-light" title={t('+ Quotation')} onClick={() => navigate('/docs/new/quotation')}>{ICONS.plus}<span>{t('+ Quotation')}</span></button>
      </div>
      <div className="side-bottom">
        <div className="side-label">{t('Language')}</div>
        <div className="lang-toggle" role="group" aria-label={t('Language')}>
          <button className={settings.uiLang !== 'my' ? 'on' : ''} disabled={switching} onClick={() => setLang('en')}>EN</button>
          <button className={settings.uiLang === 'my' ? 'on' : ''} disabled={switching} onClick={() => setLang('my')} title="မြန်မာ">
            <span className="full">မြန်မာ</span><span className="short">MY</span>
          </button>
        </div>
        {me && <div className="side-user" title={`@${me.username} · ${t('Change my password')}`} style={{ cursor: 'pointer' }} onClick={() => navigate('/settings#password')}><span className="avatar">{me.name.slice(0, 1).toUpperCase()}</span><span>{me.name}</span></div>}
        <button className="side-out" onClick={async () => {
          if (!confirmLeave()) return;
          await api('/api/auth/logout', { method: 'POST' });
          location.href = '/login';
        }}>{ICONS.out}<span>{t('Sign out')}</span></button>
      </div>
    </aside>
  );
}
