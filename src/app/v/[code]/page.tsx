import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { fmtDate, money } from '@/lib/calc';
import { translate } from '@/lib/i18n';
import type { VerifyDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify document · Mooe', robots: { index: false } };

const API_URL = process.env.API_URL || 'http://localhost:3200';

// Public page opened from the QR printed on a quotation or invoice.
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const h = await headers();
  const r = await fetch(`${API_URL}/api/public/verify/${encodeURIComponent(code)}`, {
    cache: 'no-store', headers: { 'x-forwarded-for': h.get('x-forwarded-for') || '' },
  }).catch(() => null);
  const v: VerifyDTO | null = r?.ok ? await r.json() : null;
  const busy = r?.status === 429;
  const t = (s: string, x?: Record<string, unknown>) => translate(v?.docLang || 'en', s, x, true);
  const label = v ? t(v.type === 'invoice' ? 'Invoice' : 'Quotation') : '';

  return (
    <div className="verify-wrap" lang={v?.docLang === 'my' ? 'my' : 'en'}>
      <div className="verify-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" width={56} height={56} className="verify-logo" />
        {v ? (
          <>
            <div className={`verify-badge ${v.void ? 'bad' : 'ok'}`}>
              {v.void ? <TriangleAlert /> : <CircleCheck />}
              <div>
                <b>{t(v.void ? 'Genuine but VOID' : 'Genuine document')}</b>
                <span>{t('Issued by {name}', { name: v.company })}</span>
              </div>
            </div>
            <dl className="verify-rows">
              <div><dt>{label} #</dt><dd>{v.number}</dd></div>
              <div><dt>{t('Date')}</dt><dd>{fmtDate(v.date)}</dd></div>
              <div><dt>{t('Bill To')}</dt><dd>{v.customer || '—'}</dd></div>
              <div><dt>{t('Total')}</dt><dd><b>{money(v.total)}</b></dd></div>
              {v.type === 'invoice' && !v.void && <>
                <div><dt>{t('Paid')}</dt><dd>{money(v.paid)}</dd></div>
                <div><dt>{t('Balance Due')}</dt><dd>{money(v.balance)}</dd></div>
                <div><dt>{t('Status')}</dt><dd><span className={`badge st-${v.status}`}>{t('status.' + v.status)}</span></dd></div>
              </>}
            </dl>
            <p className="verify-note">{t('If the amounts on your copy are different from these, the copy has been changed. Contact {name}.', { name: v.company })}</p>
          </>
        ) : (
          <>
            <div className="verify-badge bad">
              <CircleX />
              <div>
                <b>{busy ? 'Too many checks' : 'Not a genuine document'}</b>
                <span>{busy ? 'Please try again in a minute.' : 'This code does not match any document we issued. Treat the document as fake and contact us.'}</span>
              </div>
            </div>
            <p className="verify-note">မှန်ကန်သော စာရွက် မဟုတ်ပါ — ကျွန်ုပ်တို့ ထုတ်ပေးထားသော စာရွက်နှင့် မကိုက်ညီပါ။</p>
          </>
        )}
        <p className="verify-code">{code}</p>
      </div>
    </div>
  );
}
