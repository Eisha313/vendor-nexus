import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vendor Nexus - Multi-Vendor Marketplace Platform',
  description:
    'Launch and manage sophisticated multi-vendor e-commerce marketplaces with automated commission handling, vendor onboarding, and unified checkout.',
  keywords: [
    'marketplace',
    'multi-vendor',
    'e-commerce',
    'stripe connect',
    'vendor management',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
