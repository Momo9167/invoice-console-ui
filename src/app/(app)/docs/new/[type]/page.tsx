'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Editor } from '@/components/Editor';
import { useApp } from '@/components/AppContext';
import { blankItem, today } from '@/lib/calc';
import { api } from '@/lib/client';
import type { CustomerDTO, DocDTO, DocType } from '@/lib/types';

// New document. ?from=<id> copies another document (Duplicate / Convert to Invoice);
// ?customer=<id> pre-fills a saved customer.
export default function Page({ params }: { params: Promise<{ type: string }> }) {
  const { type: raw } = use(params);
  const type: DocType = raw === 'invoice' ? 'invoice' : 'quotation';
  const search = useSearchParams();
  const from = search.get('from'), customerId = search.get('customer');
  const { t } = useApp();
  const [doc, setDoc] = useState<DocDTO | null>(null);

  useEffect(() => {
    (async () => {
      const { number } = await api<{ number: string }>(`/api/next-number?type=${type}`);
      const src = from ? await api<DocDTO>(`/api/docs/${from}`) : null;
      const cust = customerId ? (await api<CustomerDTO[]>('/api/customers')).find((c) => c.id === customerId) : null;
      setDoc({
        type, number, date: today(), dueDate: 'On Receipt',
        ref: src && src.type !== type ? src.number : '',
        customer: src ? { ...src.customer } : cust ? { name: cust.name, phone: cust.phone, address: cust.address } : { name: '', phone: '', address: '' },
        customerId: src?.customerId ?? cust?.id ?? null,
        items: src ? src.items.map((i) => ({ ...i, serials: [...(i.serials || [])] })) : [blankItem()],
        deliveryFee: src?.deliveryFee && src.deliveryFee !== '0' ? src.deliveryFee : '',
        serviceCharge: src?.serviceCharge && src.serviceCharge !== '0' ? src.serviceCharge : '',
        notes: src?.notes ?? '',
        void: false,
        payments: [], // never copied
      });
    })();
  }, [type, from, customerId]);

  if (!doc) return <div className="loading">{t('Loading…')}</div>;
  return <Editor key={`${type}-${from}-${customerId}`} initial={doc} startDirty={!!(from || customerId)} />;
}
