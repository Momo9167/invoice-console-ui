import { AppProvider } from '@/components/AppContext';
import { Sidebar } from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="shell">
        <Sidebar />
        <main>{children}</main>
      </div>
    </AppProvider>
  );
}
