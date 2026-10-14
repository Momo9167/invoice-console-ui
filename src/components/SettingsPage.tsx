'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import type { Settings } from '@/lib/types';
import { useApp } from './AppContext';
import { UsersPanel } from './UsersPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function SettingsPage() {
  const app = useApp();
  const { t, toast } = app;
  const [s, setS] = useState<Settings>(app.settings);
  const set = (k: keyof Settings, v: string) => setS({ ...s, [k]: v });
  const field = (k: keyof Settings, label: string, ta = false) => (
    <label className="f">{t(label)}
      {ta ? <Textarea rows={2} value={String(s[k] ?? '')} onChange={(e) => set(k, e.target.value)} />
        : <Input value={String(s[k] ?? '')} onChange={(e) => set(k, e.target.value)} />}
    </label>
  );
  const langSel = (k: 'docLang', label: string) => (
    <label className="f">{t(label)}
      <select className="i" value={s[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="en">English</option>
        <option value="my">မြန်မာ (Myanmar)</option>
      </select>
    </label>
  );
  const muted = { color: 'var(--muted)', fontSize: 12, marginTop: 8 } as const;

  return (
    <div className="settings">
      <div className="list-head"><h2>{t('Settings')}</h2></div>
      <div className="form">
        <div className="section"><h3>{t('Language')}</h3>
          <div className="grid2">{langSel('docLang', 'Document language (invoice, quotation, PDF)')}</div>
          <p style={muted}>{t('Switch the app language with the EN / မြန်မာ toggle in the sidebar.')}</p>
          <div style={{ marginTop: 10 }}>{field('footerMy', 'Footer message (Myanmar)')}</div>
          <p style={muted}>{t('Used on Myanmar documents. Leave empty to use the footer message above.')}</p>
        </div>
        <UsersPanel />
        <div className="section"><h3>{t('Shares')}</h3>
          <div className="grid2">{field('partnerName', 'Partner (sells, holds the cash)')}{field('ownerName', 'Owner (owns the stock)')}</div>
          <p style={muted}>{t('Names used on the Shares and Expenses pages.')}</p>
        </div>
        <div className="section"><h3>{t('Company')}</h3>
          {field('companyName', 'Company name')}{field('address', 'Address', true)}
          <div className="grid2" style={{ marginTop: 10 }}>{field('phone', 'Phone')}{field('email', 'Email')}</div>
        </div>
        <div className="section"><h3>{t('Numbering & format')}</h3>
          <div className="grid2">{field('invoicePrefix', 'Invoice prefix')}{field('invoiceStart', 'Invoice numbers start from')}</div>
          <div className="grid2" style={{ marginTop: 10 }}>{field('quotationPrefix', 'Quotation prefix')}{field('quotationStart', 'Quotation numbers start from')}</div>
          <p style={muted}>{t('New numbers continue after the highest saved number, but never go below the start number.')}</p>
          <div className="grid2" style={{ marginTop: 10 }}>{field('currency', 'Currency symbol')}{field('footer', 'Footer message')}</div>
        </div>
        <div className="section"><h3>{t('Logo')}</h3>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: t('To change the logo, replace <code>public/logo.jpg</code> in the app folder.') }} />
        </div>
        <div><Button onClick={async () => {
          const saved = await api<Settings>('/api/settings', { method: 'PUT', body: s });
          app.setSettings(saved); setS(saved);
          toast(t('Settings saved'));
        }}>{t('Save settings')}</Button></div>
      </div>
    </div>
  );
}
