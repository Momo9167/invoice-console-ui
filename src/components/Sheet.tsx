// The A4 document. Pure (no hooks) so it renders both in the live preview and on the /print page used for PDFs.
import type { CSSProperties } from 'react';
import { calc, dueDateOf, fmtDate, latinDigits, money as fmtMoney, num, statusOf } from '@/lib/calc';
import { translate } from '@/lib/i18n';
import type { DocDTO, Settings } from '@/lib/types';
import { QR } from './QR';

// verifyBase = public site origin; with the document's code it makes the QR link (/v/<code>).
export function Sheet({ doc: d, settings: s, style, verifyBase }: { doc: DocDTO; settings: Settings; style?: CSSProperties; verifyBase?: string }) {
  const td = (k: string, v?: Record<string, unknown>) => translate(s.docLang, k, v, true);
  const money = (n: unknown) => fmtMoney(n, s.currency || 'Ks');
  const c = calc(d);
  const isInv = d.type === 'invoice';
  const st = statusOf(d);
  const pays = isInv ? d.payments : [];
  const my = s.docLang === 'my';

  const dueLabel = () => {
    const raw = String(d.dueDate || '').trim(), x = latinDigits(raw);
    const m = x.match(/^(\d+)\s*(days?|ရက်)$/i);
    if (m) return `${fmtDate(dueDateOf(d))} (${td('{n} days', { n: m[1] })})`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return fmtDate(x);
    return td(raw);
  };

  return (
    <div className={`sheet${my ? ' my' : ''}`} id="sheet" lang={my ? 'my' : 'en'} style={style}>
      {(st === 'paid' || st === 'void') && <div className={`s-stamp ${st}`}>{td('stamp.' + st)}</div>}
      <div className="s-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="s-logo" src="/logo.jpg" alt="" width={100} height={100} />
        <div className="s-company">
          <h1>{s.companyName}</h1>
          <p>{s.address}</p>
          <p className="contact"><span>{s.phone}</span><span>{s.email}</span></p>
        </div>
        <div className="s-title">{td(isInv ? 'Invoice' : 'Quotation')}</div>
      </div>

      <div className="s-info">
        <div className="s-bill">
          <div className="s-eyebrow">{td('Bill To')}</div>
          <div className="name">{d.customer.name}</div>
          <p>{d.customer.address}</p>
          <p>{d.customer.phone}</p>
        </div>
        <div className="s-meta">
          <div className="s-eyebrow">{td('Details')}</div>
          <Meta k={td(isInv ? 'Invoice #' : 'Quotation #')} v={d.number} />
          <Meta k={td('Date')} v={fmtDate(d.date)} />
          <Meta k={td(isInv ? 'Due Date' : 'Valid Until')} v={dueLabel()} />
          {d.ref && <Meta k={td('Ref')} v={d.ref} />}
          {st && <Meta k={td('Status')} v={<span className={`s-pill badge st-${st}`}>{td('status.' + st)}</span>} />}
        </div>
      </div>

      <table className="s-items">
        <thead>
          <tr>
            <th className="c" style={{ width: '6%' }}>{td('#')}</th>
            <th className="l" style={{ width: '38%' }}>{td('Description')}</th>
            <th className="c" style={{ width: '9%' }}>{td('Qty')}</th>
            <th style={{ width: '16%' }}>{td('Price')}</th>
            <th style={{ width: '14%' }}>{td('Discount')}</th>
            <th style={{ width: '17%' }}>{td('Amount')}</th>
          </tr>
        </thead>
        <tbody>
          {c.lines.length ? c.lines.map((l, i) => (
            <tr key={i}>
              <td className="c num">{i + 1}</td>
              <td className="l">
                {l.description}
                {l.serials?.length > 0 && (
                  <div className="s-sn">S/N{l.serials.length > 1 ? ` (${l.serials.length})` : ''}: {l.serials.join(' · ')}</div>
                )}
              </td>
              <td className="c">{num(l.qty)}{l.unit}</td>
              <td>{money(l.price)}</td>
              <td className={num(l.discount) ? 'disc' : ''}>{num(l.discount) ? '-' + money(l.discount) : '--'}</td>
              <td>{money(l.amount)}</td>
            </tr>
          )) : (
            <tr><td colSpan={6} className="c" style={{ color: 'var(--muted)' }}>{td('No items')}</td></tr>
          )}
        </tbody>
      </table>

      <div className="s-bottom">
        <div className="s-notes">
          {d.notes && <><div className="s-eyebrow">{td('Notes / Terms')}</div><p>{d.notes}</p></>}
          {pays.length > 0 && (
            <>
              <div className="s-eyebrow" style={{ marginTop: d.notes ? 16 : 0 }}>{td('Payments Received')}</div>
              <table className="s-pay">
                <thead><tr><th>{td('Date')}</th><th>{td('Receipt')}</th><th>{td('Method')}</th><th className="r">{td('Amount')}</th></tr></thead>
                <tbody>
                  {pays.map((p) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.date)}</td>
                      <td>{p.number || '—'}</td>
                      <td>{[p.method && td(p.method), p.reference].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="r">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div className="s-totals">
          <Row k={td('Subtotal')} v={money(c.subtotal)} />
          {c.delivery > 0 && <Row k={td('Delivery Fee')} v={money(c.delivery)} />}
          {c.serviceGross > 0 && <Row k={td('Service Charge')} v={money(c.serviceGross)} />}
          {c.serviceDiscount > 0 && <Row k={td('Service Discount')} v={'-' + money(c.serviceDiscount)} cls="disc" />}
          <Row k={td('Total')} v={money(c.total)} cls="total" />
          {<Row k={td('Paid') + (pays.length > 1 ? td(' ({n} payments)', { n: pays.length }) : '')} v={(c.paid ? '(-) ' : '') + money(c.paid)} />}
          <Row k={td(st === 'overpaid' ? 'Credit' : 'Balance Due')} v={money(Math.abs(c.balance))} cls="due" />
        </div>
      </div>

      <div className="s-sign">
        <div>{td('Customer Signature')}</div>
        {d.verifyCode && verifyBase && (
          <figure className="s-qr">
            <QR value={`${verifyBase}/v/${d.verifyCode}`} size={78} />
            <figcaption>{td('Scan to verify')}<span>{d.verifyCode}</span></figcaption>
          </figure>
        )}
        <div>{td('Authorized Signature')}</div>
      </div>
      <div className="s-footer"><strong>{my && s.footerMy ? s.footerMy : s.footer}</strong> &nbsp;·&nbsp; {s.companyName}</div>
    </div>
  );
}

const Meta = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="s-meta-row"><span className="k">{k}</span><span className="v">{v}</span></div>
);
const Row = ({ k, v, cls = '' }: { k: string; v: string; cls?: string }) => (
  <div className={`row ${cls}`}><span>{k}</span><span>{v}</span></div>
);
