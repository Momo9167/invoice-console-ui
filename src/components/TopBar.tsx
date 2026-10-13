'use client';

import { usePathname } from 'next/navigation';
import { api } from '@/lib/client';
import { useApp } from './AppContext';

export function TopBar() {
  const { t, navigate, confirmLeave } = useApp();
  const path = usePathname();
  const link = (href: string, label: string, active: boolean) => (
    <a href={href} className={active ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate(href); }}>{t(label)}</a>
  );
  return (
    <header className="topbar no-print">
      <div className="brand" onClick={() => navigate('/')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" /> Mooe <span>Console</span>
      </div>
      <nav className="nav">
        {link('/', 'Documents', path === '/' || path.startsWith('/docs'))}
        {link('/master/customers', 'Master Data', path.startsWith('/master'))}
        {link('/settings', 'Settings', path === '/settings')}
        <button className="linkish" onClick={async () => {
          if (!confirmLeave()) return;
          await api('/api/auth/logout', { method: 'POST' });
          location.href = '/login';
        }}>{t('Sign out')}</button>
      </nav>
      <div className="spacer" />
      <button className="btn ghost-light" onClick={() => navigate('/docs/new/quotation')}>{t('+ Quotation')}</button>
      <button className="btn primary" onClick={() => navigate('/docs/new/invoice')}>{t('+ Invoice')}</button>
    </header>
  );
}
