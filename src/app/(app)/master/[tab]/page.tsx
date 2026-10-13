import { notFound } from 'next/navigation';
import { MasterData } from '@/components/MasterData';

export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (tab !== 'customers' && tab !== 'products') notFound();
  return <MasterData tab={tab} />;
}
