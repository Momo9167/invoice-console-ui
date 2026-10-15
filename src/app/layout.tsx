import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter, Noto_Sans_Myanmar } from 'next/font/google';
import { cn } from '@/lib/utils';

// Self-hosted by next/font: no request to Google at runtime, and no layout shift while the fonts load.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const myanmar = Noto_Sans_Myanmar({ subsets: ['myanmar'], weight: ['400', '500', '600'], variable: '--font-myanmar', display: 'swap' });

export const metadata: Metadata = { title: 'Mooe Console', icons: { icon: '/logo.jpg' } };
// Matches the navy sidebar and phone top bar, so the browser bar blends in.
export const viewport: Viewport = { themeColor: '#141a24' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable, myanmar.variable)}>
      <body>{children}</body>
    </html>
  );
}
