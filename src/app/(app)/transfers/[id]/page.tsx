import { TransferView } from '@/components/Transfers';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TransferView id={(await params).id} />;
}
