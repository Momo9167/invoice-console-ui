import { SplitEditor } from '@/components/Shares';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SplitEditor id={(await params).id} />;
}
