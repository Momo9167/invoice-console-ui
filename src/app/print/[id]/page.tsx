import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Sheet } from '@/components/Sheet';
import { serverApi } from '@/lib/server-api';
import type { DocDTO, Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Public origin of this site (the QR must point at it, not at the backend).
async function siteOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3100';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// Bare A4 sheet that invoice-service renders to PDF with headless Chrome.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doc, settings] = await Promise.all([serverApi<DocDTO>(`/api/docs/${id}`), serverApi<Settings>('/api/settings')]);
  if (!doc || !settings) notFound();
  return (
    <div className="print-page">
      <Sheet doc={doc} settings={settings} verifyBase={await siteOrigin()} />
    </div>
  );
}
