'use client';

import { useState, type ReactNode } from 'react';
import { api } from '@/lib/client';
import type { CustomerDTO, DocDTO, ProductDTO } from '@/lib/types';
import { useApp } from './AppContext';
import { norm } from './Picker';

type Tab = 'customers' | 'products';
type Rec = Record<string, string> & { id?: string };
interface Field { k: string; label: string; ph?: string; ta?: boolean; half?: boolean; num?: boolean }
interface Col { h: string; cls?: string; v: (x: Rec) => ReactNode }

export function MasterData({ tab }: { tab: Tab }) {
  const app = useApp();
  const { t, money, toast, customers, products, docs, navigate } = app;
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Rec | null>(null);
  const [form, setForm] = useState<Rec>({});

  const used = (pred: (d: DocDTO) => boolean) => docs.filter(pred).length;
  const M = {
    customers: {
      title: 'Customers', one: 'customer', api: '/api/customers', list: customers as unknown as Rec[],
      fields: [
        { k: 'name', label: 'Name', ph: 'Customer name' },
        { k: 'phone', label: 'Phone', ph: '+95 9…' },
        { k: 'address', label: 'Address', ta: true },
      ] as Field[],
      cols: [
        { h: 'Name', v: (c) => <b>{c.name}</b> },
        { h: 'Phone', v: (c) => c.phone },
        { h: 'Address', cls: 'hide-sm', v: (c) => <span style={{ color: 'var(--ink-2)' }}>{c.address}</span> },
        { h: 'Docs', cls: 'r hide-sm', v: (c) => used((d) => d.customerId === c.id || (norm(d.customer.name) === norm(c.name) && norm(d.customer.phone) === norm(c.phone))) },
      ] as Col[],
      search: (c: Rec) => [c.name, c.phone, c.address],
      emptyHint: 'Add one with the form, or use “Save to customer list” while making a quotation or invoice.',
    },
    products: {
      title: 'Items', one: 'item', api: '/api/products', list: products as unknown as Rec[],
      fields: [
        { k: 'code', label: 'Code / SKU', ph: 'optional', half: true },
        { k: 'unit', label: 'Unit', ph: 'pcs', half: true },
        { k: 'name', label: 'Name / description', ph: 'e.g. Ezviz H8C Pro 3k' },
        { k: 'price', label: 'Default price', ph: '0', num: true },
      ] as Field[],
      cols: [
        { h: 'Code', v: (p) => <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', color: 'var(--muted)' }}>{p.code}</span> },
        { h: 'Name', v: (p) => <b>{p.name}</b> },
        { h: 'Unit', cls: 'hide-sm', v: (p) => p.unit },
        { h: 'Price', cls: 'r', v: (p) => money(p.price) },
        { h: 'Used', cls: 'r hide-sm', v: (p) => used((d) => d.items.some((it) => it.productId === p.id || norm(it.description) === norm(p.name))) },
      ] as Col[],
      search: (p: Rec) => [p.code, p.name],
      emptyHint: 'Add one with the form, or use “Save to item list” while making a quotation or invoice.',
    },
  }[tab];

  const my = app.settings.uiLang === 'my';
  const one = t(M.one), many = t(M.title);
  const query = norm(q);
  const shown = M.list.filter((x) => !query || M.search(x).some((v) => norm(v).includes(query)));

  const startEdit = (x: Rec | null) => { setEditing(x); setForm(x ? { ...x } : {}); scrollTo(0, 0); };
  const field = (f: Field) => (
    <label className="f" key={f.k}>{t(f.label)}
      {f.ta
        ? <textarea className="i" rows={3} value={form[f.k] || ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
        : <input className="i" value={form[f.k] || ''} placeholder={t(f.ph || '')} inputMode={f.num ? 'decimal' : undefined}
            onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />}
    </label>
  );

  async function save() {
    if (!(form.name || '').trim()) return toast(t('Name is required'));
    if (editing?.id) await api(`${M.api}/${editing.id}`, { method: 'PUT', body: form });
    else await api(M.api, { method: 'POST', body: form });
    await app.reloadMaster();
    toast(t(editing?.id ? '{x} updated' : '{x} added', { x: my ? one : one[0].toUpperCase() + one.slice(1) }));
    startEdit(null);
  }

  return (
    <>
      <div className="list-head"><h2>{t('Master Data')}</h2></div>
      <div className="tabs">
        {(['customers', 'products'] as Tab[]).map((k) => (
          <a key={k} href={`/master/${k}`} className={tab === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); navigate(`/master/${k}`); }}>
            {t(k === 'customers' ? 'Customers' : 'Items')}<span>{k === 'customers' ? customers.length : products.length}</span>
          </a>
        ))}
      </div>
      <div className="cust-layout">
        <div className="section">
          <h3>{t(editing?.id ? 'Edit {x}' : 'Add {x}', { x: one })}</h3>
          {M.fields.some((f) => f.half) && <div className="grid2" style={{ marginBottom: 10 }}>{M.fields.filter((f) => f.half).map(field)}</div>}
          {M.fields.filter((f) => !f.half).map(field)}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn dark" onClick={save}>{editing?.id ? t('Update') : t('Add {x}', { x: one })}</button>
            {editing?.id && <button className="btn" onClick={() => startEdit(null)}>{t('Cancel')}</button>}
          </div>
        </div>
        <div className="card">
          <div className="toolbar">
            <input className="search" placeholder={t('Search {x}…', { x: my ? many : many.toLowerCase() })} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {shown.length ? (
            <table className="list">
              <thead><tr>{M.cols.map((c) => <th key={c.h} className={c.cls || ''}>{t(c.h)}</th>)}<th /></tr></thead>
              <tbody>
                {shown.map((x) => (
                  <tr key={x.id}>
                    {M.cols.map((c) => <td key={c.h} className={c.cls || ''}>{c.v(x)}</td>)}
                    <td><div className="row-actions">
                      {tab === 'customers' && <>
                        <button className="btn" onClick={() => navigate(`/docs/new/quotation?customer=${x.id}`)}>{t('+ Quotation')}</button>
                        <button className="btn" onClick={() => navigate(`/docs/new/invoice?customer=${x.id}`)}>{t('+ Invoice')}</button>
                      </>}
                      <button className="btn" onClick={() => startEdit(x)}>{t('Edit')}</button>
                      <button className="btn danger" onClick={async () => {
                        if (!confirm(t('Delete {name} from the {x} list? Saved quotations and invoices are not affected.', { name: x.name, x: one }))) return;
                        await api(`${M.api}/${x.id}`, { method: 'DELETE' });
                        if (editing?.id === x.id) startEdit(null);
                        await app.reloadMaster();
                        toast(t('{name} deleted', { name: x.name }));
                      }}>{t('Delete')}</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <b>{M.list.length ? t('No matches') : t('No {x} yet', { x: my ? many : many.toLowerCase() })}</b>
              {t(M.list.length ? 'Try a different search.' : M.emptyHint)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export type { CustomerDTO, ProductDTO };
