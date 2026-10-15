'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Boxes, CreditCard, Database, FileText, LogOut, Menu, PieChart, Plus, Receipt, Settings as SettingsIcon, ShoppingCart, Truck, X,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/client';
import type { Lang, Settings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useApp } from './AppContext';
import { useLinkClick } from './RowLink';

export function Sidebar() {
  const { t, navigate, confirmLeave, settings, me } = useApp();
  const path = usePathname();
  const [switching, setSwitching] = useState(false);
  // Phones: the same sidebar slides in as a drawer.
  const [open, setOpen] = useState(false);
  // On phones the closed drawer is off-screen; `inert` keeps Tab and screen readers out of it.
  const [phone, setPhone] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const mq = matchMedia('(max-width: 767px)');
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    const back = menuBtn.current;
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = ''; back?.focus(); };
  }, [open]);
  const linkClick = useLinkClick();
  const go = (href: string) => { setOpen(false); navigate(href); };
  const follow = (e: React.MouseEvent, href: string) => { setOpen(false); linkClick(e, href); };

  const link = (href: string, label: string, Icon: LucideIcon, active: boolean) => (
    <a href={href} title={t(label)} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={(e) => follow(e, href)}>
      <Icon aria-hidden="true" /><span>{t(label)}</span>
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
    <>
    {/* phone top bar (hidden on tablet/laptop) */}
    <header className="mobile-bar no-print">
      <button ref={menuBtn} className="mb-menu" aria-label={t('Menu')} aria-expanded={open} onClick={() => setOpen(true)}><Menu aria-hidden="true" /></button>
      <a href="/" className="brand" onClick={(e) => follow(e, '/')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" width={30} height={30} /> Mooe <span>Console</span>
      </a>
      <Button className="brand-btn mb-new" size="sm" onClick={() => go('/docs/new/invoice')}><Plus aria-hidden="true" />{t('Invoice')}</Button>
    </header>
    <div className={`side-backdrop${open ? ' open' : ''}`} aria-hidden="true" onClick={() => setOpen(false)} />
    <aside className={`sidebar no-print${open ? ' open' : ''}`} inert={phone && !open} aria-label={t('Menu')}>
      <div className="brand">
        <a href="/" className="brand-home" onClick={(e) => follow(e, '/')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" width={32} height={32} /> Mooe <span>Console</span>
        </a>
        <button ref={closeBtn} className="side-close" aria-label={t('Close')} onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
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
        <Button className="brand-btn" title={t('+ Invoice')} onClick={() => go('/docs/new/invoice')}>
          <Plus className="btn-icon" aria-hidden="true" /><span className="btn-label">{t('+ Invoice')}</span>
        </Button>
        <Button variant="outline" className="ghost-light" title={t('+ Quotation')} onClick={() => go('/docs/new/quotation')}>
          <Plus className="btn-icon" aria-hidden="true" /><span className="btn-label">{t('+ Quotation')}</span>
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
          <a href="/settings#password" className="side-user" title={`@${me.username} · ${t('Change my password')}`} onClick={(e) => follow(e, '/settings#password')}>
            <span className="avatar" aria-hidden="true">{me.name.slice(0, 1).toUpperCase()}</span><span>{me.name}</span>
          </a>
        )}
        <button className="side-out" onClick={async () => {
          if (!confirmLeave()) return;
          await api('/api/auth/logout', { method: 'POST' });
          location.href = '/login';
        }}><LogOut aria-hidden="true" /><span>{t('Sign out')}</span></button>
      </div>
    </aside>
    </>
  );
}
