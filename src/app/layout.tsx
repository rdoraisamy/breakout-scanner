import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Breakout Scanner — 52-Week Multi-Bagger Detector',
  description: 'Real-time scanner for US stocks near 52-week highs with multi-bagger scoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
