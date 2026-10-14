import { PurchaseView } from '@/components/Purchases';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PurchaseView id={(await params).id} />;
}
