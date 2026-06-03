import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from 'react-hot-toast';
import { PageTracker } from '@/components/PageTracker';
import { ChatWidget } from '@/components/chat/ChatWidget';

// M4a.2: self-host fonts via next/font/google. Eliminates the @import FOUT
// and preloads with display=swap. The dynamic FONT_FAMILY setting from
// SettingsProvider still wins via a CSS variable cascade (see globals.css).
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "TotalStore — Africa's #1 Online Marketplace",
    template: '%s | TotalStore',
  },
  description: 'Shop millions of products. Fast delivery across Africa. Pay with MTN MoMo, Airtel Money, Visa, and more.',
  keywords: ['online shopping', 'Africa', 'East Africa', 'West Africa', 'ecommerce', 'marketplace', 'MTN MoMo', 'mobile money'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_UG',
    url: 'https://totalstore.ug',
    siteName: 'TotalStore',
  },
};

// M4a.2: themeColor moved out of `metadata` per Next.js 14 deprecation.
export const viewport: Viewport = {
  themeColor: '#0ea5e9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <PageTracker />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <ChatWidget />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </Providers>
      </body>
    </html>
  );
}
