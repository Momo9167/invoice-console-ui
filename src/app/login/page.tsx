import { Suspense } from 'react';
import { serverApi } from '@/lib/server-api';
import type { Lang } from '@/lib/types';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const b = await serverApi<{ companyName: string; uiLang: Lang }>('/api/public/branding').catch(() => null);
  return <Suspense><LoginForm lang={b?.uiLang || 'en'} company={b?.companyName || 'Mooe Console'} /></Suspense>;
}
