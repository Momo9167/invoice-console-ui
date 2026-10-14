import { StockItem } from '@/components/StockItem';

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  return <StockItem productId={(await params).productId} />;
}
