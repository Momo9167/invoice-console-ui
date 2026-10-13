'use client';

import { use, useEffect, useState } from 'react';
import { Editor } from '@/components/Editor';
import { useApp } from '@/components/AppContext';
import { api } from '@/lib/client';
import type { DocDTO } from '@/lib/types';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useApp();
  const [doc, setDoc] = useState<DocDTO | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<DocDTO>(`/api/docs/${id}`).then(setDoc).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="empty"><b>{t('Something went wrong')}</b>{err}</div>;
  if (!doc) return <div className="loading">{t('Loading…')}</div>;
  return <Editor key={doc.id} initial={doc} />;
}
