'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { translate } from '@/lib/i18n';
import type { CustomerDTO, DocDTO, ProductDTO, Settings } from '@/lib/types';

type T = (s: string, v?: Record<string, unknown>) => string;

interface Ctx {
  settings: Settings;
  setSettings: (s: Settings) => void;
  customers: CustomerDTO[];
  products: ProductDTO[];
  docs: DocDTO[];
  reloadMaster: () => Promise<void>;
  reloadDocs: () => Promise<DocDTO[]>;
  t: T;
  money: (n: unknown) => string;
  toast: (msg: string) => void;
  // unsaved-changes guard
  setDirty: (v: boolean) => void;
  confirmLeave: () => boolean;
  navigate: (href: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [docs, setDocs] = useState<DocDTO[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirtyRef = useRef(false);

  const reloadMaster = useCallback(async () => {
    const [c, p] = await Promise.all([api<CustomerDTO[]>('/api/customers'), api<ProductDTO[]>('/api/products')]);
    setCustomers(c); setProducts(p);
  }, []);
  const reloadDocs = useCallback(async () => {
    const d = await api<DocDTO[]>('/api/docs');
    setDocs(d);
    return d;
  }, []);

  useEffect(() => {
    api<Settings>('/api/settings').then(setSettings);
    reloadMaster(); reloadDocs();
  }, [reloadMaster, reloadDocs]);

  const lang = settings?.uiLang;
  useEffect(() => {
    document.documentElement.lang = lang === 'my' ? 'my' : 'en';
    document.documentElement.classList.toggle('lang-my', lang === 'my');
  }, [lang]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', onUnload);
    return () => removeEventListener('beforeunload', onUnload);
  }, []);

  const t: T = useCallback((s, v) => translate(lang, s, v), [lang]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg); setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 1800);
  }, []);

  const confirmLeave = useCallback(() => {
    if (!dirtyRef.current) return true;
    if (!confirm(t('You have unsaved changes. Discard them?'))) return false;
    dirtyRef.current = false;
    return true;
  }, [t]);

  const navigate = useCallback((href: string) => { if (confirmLeave()) router.push(href); }, [confirmLeave, router]);

  if (!settings) return <div className="loading">Loading…</div>;

  return (
    <AppCtx.Provider value={{
      settings, setSettings, customers, products, docs, reloadMaster, reloadDocs, t,
      money: (n) => {
        const v = Number(String(n ?? '').replace(/,/g, '')) || 0;
        return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (settings.currency || 'Ks');
      },
      toast, setDirty: (v) => { dirtyRef.current = v; }, confirmLeave, navigate,
    }}>
      {children}
      <div className={`toast${toastOn ? ' show' : ''}`}>{toastMsg}</div>
    </AppCtx.Provider>
  );
}
