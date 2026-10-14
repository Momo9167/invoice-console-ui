import { Suspense } from 'react';
import { StockAdjust } from '@/components/StockAdjust';

export default function Page() {
  return <Suspense><StockAdjust /></Suspense>;
}
