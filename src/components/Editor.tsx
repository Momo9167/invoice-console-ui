'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { blankItem, calc, lineAmount, num } from '@/lib/calc';
import { api, ApiError } from '@/lib/client';
import type { DocDTO, LineItem, ProductDTO, CustomerDTO } from '@/lib/types';
import { useApp } from './AppContext';
import { norm, Picker } from './Picker';
import { SerialInput } from './SerialInput';
import { PaymentsPanel } from './PaymentsPanel';
import { Sheet } from './Sheet';

const LABEL = { quotation: 'Quotation', invoice: 'Invoice' } as const;
const DUE_LABEL = { quotation: 'Valid Until', invoice: 'Due Date' } as const;

export function Editor({ initial, startDirty = false }: { initial: DocDTO; startDirty?: boolean }) {
  const app = useApp();
  const { t, money, toast, settings, customers, products } = app;
  const router = useRouter();
  const [d, setD] = useState<DocDTO>(initial);
  const [dirty, setDirtyState] = useState(startDirty);
  const [busy, setBusy] = useState(false);
  const isInv = d.type === 'invoice';
  const c = calc(d);

  const setDirty = (v: boolean) => { setDirtyState(v); app.setDirty(v); };
  useEffect(() => { app.setDirty(startDirty); return () => app.setDirty(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (patch: Partial<DocDTO>) => { setD((x) => ({ ...x, ...patch })); setDirty(true); };
  const editCustomer = (patch: Partial<DocDTO['customer']>) =>
    setD((x) => {
      const customer = { ...x.customer, ...patch };
      const match = customers.find((k) => norm(k.name) === norm(customer.name) && norm(k.phone) === norm(customer.phone));
      setDirty(true);
      return { ...x, customer, customerId: match?.id ?? null };
    });
  const editItem = (i: number, patch: Partial<LineItem>) =>
    edit({ items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  // ---------- actions
  async function save(): Promise<DocDTO | null> {
    if (!d.number.trim()) { toast(t('Number is required')); return null; }
    setBusy(true);
    try {
      const saved = d.id
        ? await api<DocDTO>(`/api/docs/${d.id}`, { method: 'PUT', body: d })
        : await api<DocDTO>('/api/docs', { method: 'POST', body: d });
      setD(saved); setDirty(false);
      toast(t('{num} saved', { num: saved.number }));
      app.reloadDocs();
      if (!d.id) router.replace(`/docs/${saved.id}`);
      return saved;
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 409 ? t('{num} is already used. Choose another number.', { num: d.number }) : (e as Error).message;
      toast(msg);
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Payments are checked on the server against the saved invoice, so save edits first.
  async function ensureSaved() {
    if (d.id && !dirty) return d;
    return save();
  }

  async function del() {
    const n = d.payments.length;
    const msg = t('Delete {num}?', { num: d.number })
      + (n ? t(n > 1 ? ' Its {n} payment records will be deleted too.' : ' Its {n} payment record will be deleted too.', { n }) : '');
    if (!confirm(msg)) return;
    await api(`/api/docs/${d.id}`, { method: 'DELETE' });
    setDirty(false); toast(t('Deleted')); app.reloadDocs();
    router.push('/');
  }

  async function toggleVoid() {
    if (!d.void && d.payments.length) return toast(t('Delete the payments on this invoice before voiding it'));
    if (!confirm(t(d.void ? 'Restore {num}?' : 'Void {num}? It stays on file but no longer counts as money owed.', { num: d.number }))) return;
    if (!(await ensureSaved())) return;
    try {
      setD(await api<DocDTO>(`/api/docs/${d.id}/void`, { method: 'POST', body: { void: !d.void } }));
      app.reloadDocs();
    } catch (e) { toast((e as Error).message); }
  }

  function printDoc() {
    const prev = document.title;
    document.title = [d.number, d.customer.name].filter(Boolean).join(' - ');
    window.print();
    document.title = prev;
  }

  async function exportPdf() {
    const saved = await ensureSaved();
    if (!saved?.id) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/docs/${saved.id}/pdf`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await r.blob());
      a.download = [saved.number, saved.customer.name].filter(Boolean).join(' - ') + '.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast(t('PDF downloaded'));
    } catch (e) {
      toast(t('Export failed: {msg}', { msg: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  const openNew = (type: 'quotation' | 'invoice') => app.navigate(`/docs/new/${type}?from=${d.id}`);

  // keyboard shortcuts
  const saveRef = useRef(save); saveRef.current = save;
  const pdfRef = useRef(exportPdf); pdfRef.current = exportPdf;
  const printRef = useRef(printDoc); printRef.current = printDoc;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 's') { e.preventDefault(); saveRef.current(); }
      if (e.key === 'e') { e.preventDefault(); pdfRef.current(); }
      if (e.key === 'p') { e.preventDefault(); printRef.current(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  // ---------- preview scaling
  const pvRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = pvRef.current; if (!el) return;
    const fit = () => setZoom(Math.min(1, (el.clientWidth - 40) / (210 * 96 / 25.4)));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const custHint = () => {
    if (!d.customer.name.trim()) return null;
    if (d.customerId || customers.some((k) => norm(k.name) === norm(d.customer.name) && norm(k.phone) === norm(d.customer.phone)))
      return <span className="ok">{t('✓ In customer list')}</span>;
    return (
      <>
        <span>{t('New customer.')}</span>
        <button className="link-btn" onClick={async () => {
          const saved = await api<CustomerDTO>('/api/customers', { method: 'POST', body: d.customer });
          await app.reloadMaster();
          edit({ customerId: saved.id });
          toast(t('{name} added to customers', { name: saved.name }));
        }}>{t('Save to customer list')}</button>
      </>
    );
  };

  const itemHint = (it: LineItem, i: number) => {
    if (!it.description.trim()) return null;
    if (products.some((p) => norm(p.name) === norm(it.description))) return <span className="ok">{t('✓ In item list')}</span>;
    return (
      <>
        <span>{t('New item.')}</span>
        <button className="link-btn" onClick={async () => {
          const saved = await api<ProductDTO>('/api/products', { method: 'POST', body: { name: it.description, unit: it.unit, price: it.price } });
          await app.reloadMaster();
          editItem(i, { productId: saved.id });
          toast(t('{name} added to items', { name: saved.name }));
        }}>{t('Save to item list')}</button>
      </>
    );
  };

  return (
    <>
      <div className="ed-bar no-print">
        <button className="btn" onClick={() => app.navigate('/')}>{t('← Back')}</button>
        <h2>{t(LABEL[d.type])} <span>{d.number}</span></h2>
        <span className={`dirty${dirty ? ' on' : ''}`}>{dirty ? t('● Unsaved changes') : d.id ? t('Saved') : ''}</span>
        <div className="spacer" />
        {d.id && <>
          <button className="btn danger" onClick={del}>{t('Delete')}</button>
          <button className="btn" onClick={() => openNew(d.type)}>{t('Duplicate')}</button>
        </>}
        {d.id && d.type === 'quotation' && <button className="btn" onClick={() => openNew('invoice')}>{t('Convert to Invoice')}</button>}
        {d.id && isInv && <button className="btn" onClick={toggleVoid}>{t(d.void ? 'Restore' : 'Void')}</button>}
        <button className="btn" onClick={printDoc}>{t('Print')}</button>
        <button className="btn primary" onClick={exportPdf} disabled={busy}>{busy ? t('Exporting…') : t('Export PDF')}</button>
        <button className="btn dark" onClick={save} disabled={busy}>{t('Save')}</button>
      </div>

      <div className="editor">
        <div className="form no-print">
          <div className="section">
            <h3>{t('Document')}</h3>
            <div className="grid2">
              <label className="f">{t(LABEL[d.type])} #<input className="i" value={d.number} onChange={(e) => edit({ number: e.target.value })} /></label>
              <label className="f">{t('Date')}<input className="i" type="date" value={d.date} onChange={(e) => edit({ date: e.target.value })} /></label>
            </div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <label className="f">{t(DUE_LABEL[d.type])}<input className="i" list="due-opts" value={d.dueDate} onChange={(e) => edit({ dueDate: e.target.value })} /></label>
              <label className="f">{t('Reference')}<input className="i" value={d.ref} placeholder={t('optional')} onChange={(e) => edit({ ref: e.target.value })} /></label>
            </div>
            <datalist id="due-opts">
              <option value="On Receipt">{t('On Receipt')}</option>
              {[7, 15, 30].map((n) => <option key={n} value={`${n} days`}>{t('{n} days', { n })}</option>)}
            </datalist>
          </div>

          <div className="section">
            <h3>{t('Bill To')}</h3>
            <label className="f">{t('Customer name')}
              <Picker<CustomerDTO>
                value={d.customer.name}
                onChange={(name) => editCustomer({ name })}
                search={(q) => customers.filter((k) => !q || norm(k.name).includes(q) || norm(k.phone).replace(/\s/g, '').includes(q.replace(/\s/g, '')))}
                renderRow={(k) => <><span>{k.name}</span><small>{k.phone}</small></>}
                onPick={(k) => { edit({ customer: { name: k.name, phone: k.phone, address: k.address }, customerId: k.id }); }}
                empty={customers.length ? t('No saved customer matches') : ''}
                inputProps={{ placeholder: t('Type to search saved customers…') }}
              />
            </label>
            <label className="f">{t('Address')}<textarea className="i" rows={2} value={d.customer.address} onChange={(e) => editCustomer({ address: e.target.value })} /></label>
            <label className="f">{t('Phone')}<input className="i" value={d.customer.phone} placeholder="+95 9…" onChange={(e) => editCustomer({ phone: e.target.value })} /></label>
            <div className="cust-hint">{custHint()}</div>
          </div>

          <div className="section">
            <h3>{t('Items')}</h3>
            {d.items.map((it, i) => (
              <div className="item" key={i}>
                <div className="item-top">
                  <span className="n">{i + 1}</span>
                  <Picker<ProductDTO>
                    value={it.description}
                    onChange={(description) => editItem(i, { description, productId: undefined })}
                    search={(q) => products.filter((p) => !q || norm(p.name).includes(q) || norm(p.code).includes(q))}
                    renderRow={(p) => <><span>{p.code && <span className="code">{p.code}</span>}{p.name}</span><small>{money(p.price)}{p.unit ? ' / ' + p.unit : ''}</small></>}
                    onPick={(p) => editItem(i, { description: p.name, unit: p.unit, price: p.price, productId: p.id })}
                    empty={products.length ? t('No saved item matches') : ''}
                    inputProps={{ placeholder: t('Type to search saved items…') }}
                  />
                  <button className="icon-btn" title={t('Move up')} disabled={i === 0} onClick={() => {
                    const items = [...d.items]; [items[i - 1], items[i]] = [items[i], items[i - 1]]; edit({ items });
                  }}>↑</button>
                  <button className="icon-btn del" title={t('Remove')} onClick={() => edit({ items: d.items.filter((_, j) => j !== i) })}>×</button>
                </div>
                <div className="item-grid">
                  <label><span>{t('Qty')}</span><input className="i" inputMode="decimal" value={it.qty} onChange={(e) => editItem(i, { qty: e.target.value })} /></label>
                  <label><span>{t('Unit')}</span><input className="i" value={it.unit} onChange={(e) => editItem(i, { unit: e.target.value })} /></label>
                  <label><span>{t('Price')}</span><input className="i" inputMode="decimal" placeholder="0" value={it.price} onChange={(e) => editItem(i, { price: e.target.value })} /></label>
                  <label><span>{t('Discount')}</span><input className="i" inputMode="decimal" placeholder="0" value={it.discount} onChange={(e) => editItem(i, { discount: e.target.value })} /></label>
                </div>
                <SerialInput serials={it.serials || []} qty={it.qty} onChange={(serials) => editItem(i, { serials })} />
                <div className="item-amt"><span>{t('Amount')}</span><b>{money(lineAmount(it))}</b></div>
                <div className="cust-hint item-hint">{itemHint(it, i)}</div>
              </div>
            ))}
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => edit({ items: [...d.items, blankItem()] })}>{t('+ Add item')}</button>
          </div>

          <div className="section">
            <h3>{t('Charges & Notes')}</h3>
            <div className="grid2">
              <label className="f">{t('Delivery fee')} ({settings.currency})<input className="i" inputMode="decimal" placeholder="0" value={d.deliveryFee} onChange={(e) => edit({ deliveryFee: e.target.value })} /></label>
              <label className="f">{t('Service charge')} ({settings.currency})<input className="i" inputMode="decimal" placeholder="0" value={d.serviceCharge} onChange={(e) => edit({ serviceCharge: e.target.value })} /></label>
            </div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <div />
              <label className="f">{t('Service discount')} ({settings.currency})<input className="i" inputMode="decimal" placeholder="0" value={d.serviceDiscount} onChange={(e) => edit({ serviceDiscount: e.target.value })} /></label>
            </div>
            {c.serviceDiscount < num(d.serviceDiscount) && <div className="pay-empty" style={{ color: 'var(--danger)', marginTop: 6 }}>{t('Service discount can’t be more than the service charge.')}</div>}
            <label className="f" style={{ marginTop: 10 }}>{t('Notes / terms')}<textarea className="i" rows={3} placeholder={t('e.g. 1 year warranty on cameras')} value={d.notes} onChange={(e) => edit({ notes: e.target.value })} /></label>
            <div style={{ marginTop: 14 }}>
              <div className="sum"><span>{t('Subtotal')}</span><span>{money(c.subtotal)}</span></div>
              <div className="sum"><span>{t('Delivery fee')}</span><span>{money(c.delivery)}</span></div>
              <div className="sum"><span>{t('Service charge')}</span><span>{money(c.serviceGross)}</span></div>
              {c.serviceDiscount > 0 && <div className="sum"><span>{t('Service discount')}</span><span>-{money(c.serviceDiscount)}</span></div>}
              <div className="sum"><span>{t('Total')}</span><span>{money(c.total)}</span></div>
              {isInv && <>
                <div className="sum"><span>{t('Paid')}</span><span>{money(c.paid)}</span></div>
                <div className="sum big"><span>{t('Balance Due')}</span><span>{money(c.balance)}</span></div>
              </>}
            </div>
          </div>

          {isInv && <PaymentsPanel doc={d} onDoc={(doc) => { setD(doc); app.reloadDocs(); }} ensureSaved={ensureSaved} />}
        </div>

        <div className="preview-wrap" ref={pvRef}>
          <div className="hint no-print">{t('Live preview · A4')}</div>
          <Sheet doc={d} settings={settings} style={{ zoom }} />
        </div>
      </div>
    </>
  );
}
