import { AppProvider } from '@/components/AppContext';
import { TopBar } from '@/components/TopBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <TopBar />
      <main>{children}</main>
    </AppProvider>
  );
}
