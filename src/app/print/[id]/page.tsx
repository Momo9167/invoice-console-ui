import { notFound } from 'next/navigation';
import { Sheet } from '@/components/Sheet';
import { serverApi } from '@/lib/server-api';
import type { DocDTO, Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Bare A4 sheet that invoice-service renders to PDF with headless Chrome.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doc, settings] = await Promise.all([serverApi<DocDTO>(`/api/docs/${id}`), serverApi<Settings>('/api/settings')]);
  if (!doc || !settings) notFound();
  return (
    <div className="print-page">
      <Sheet doc={doc} settings={settings} />
    </div>
  );
}
