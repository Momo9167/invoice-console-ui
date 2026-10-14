'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Boxes, CreditCard, Database, FileText, LogOut, PieChart, Plus, Receipt, Settings as SettingsIcon, ShoppingCart, Truck,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/client';
import type { Lang, Settings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useApp } from './AppContext';

export function Sidebar() {
  const { t, navigate, confirmLeave, settings, me } = useApp();
  const path = usePathname();
  const [switching, setSwitching] = useState(false);

  const link = (href: string, label: string, Icon: LucideIcon, active: boolean) => (
    <a href={href} title={t(label)} className={active ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigate(href); }}>
      <Icon /><span>{t(label)}</span>
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
        {link('/', 'Documents', FileText, path === '/' || path.startsWith('/docs'))}
        {link('/payments', 'Payments', CreditCard, path === '/payments')}
        {link('/shares', 'Shares', PieChart, path.startsWith('/shares'))}
        {link('/expenses', 'Expenses', Receipt, path === '/expenses')}
        <div className="side-label side-group">{t('Stock')}</div>
        {link('/stock', 'Stock', Boxes, path.startsWith('/stock'))}
        {link('/purchases', 'Purchase orders', ShoppingCart, path.startsWith('/purchases'))}
        {link('/transfers', 'Transfers', Truck, path.startsWith('/transfers'))}
        <div className="side-group" />
        {link('/master/customers', 'Master Data', Database, path.startsWith('/master'))}
        {link('/settings', 'Settings', SettingsIcon, path === '/settings')}
      </nav>
      <div className="side-new">
        <Button className="brand-btn" title={t('+ Invoice')} onClick={() => navigate('/docs/new/invoice')}>
          <Plus className="btn-icon" /><span className="btn-label">{t('+ Invoice')}</span>
        </Button>
        <Button variant="outline" className="ghost-light" title={t('+ Quotation')} onClick={() => navigate('/docs/new/quotation')}>
          <Plus className="btn-icon" /><span className="btn-label">{t('+ Quotation')}</span>
        </Button>
      </div>
      <div className="side-bottom">
        <div className="side-label">{t('Language')}</div>
        <div className="lang-toggle" role="group" aria-label={t('Language')}>
          <button className={settings.uiLang !== 'my' ? 'on' : ''} disabled={switching} onClick={() => setLang('en')}>EN</button>
          <button className={settings.uiLang === 'my' ? 'on' : ''} disabled={switching} onClick={() => setLang('my')} title="မြန်မာ">
            <span className="full">မြန်မာ</span><span className="short">MY</span>
          </button>
        </div>
        {me && (
          <div className="side-user" title={`@${me.username} · ${t('Change my password')}`} style={{ cursor: 'pointer' }} onClick={() => navigate('/settings#password')}>
            <span className="avatar">{me.name.slice(0, 1).toUpperCase()}</span><span>{me.name}</span>
          </div>
        )}
        <button className="side-out" onClick={async () => {
          if (!confirmLeave()) return;
          await api('/api/auth/logout', { method: 'POST' });
          location.href = '/login';
        }}><LogOut /><span>{t('Sign out')}</span></button>
      </div>
    </aside>
  );
}
