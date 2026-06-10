import type { Metadata, Viewport } from 'next';
import { Tajawal, Almarai } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/components/LangProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { FontProvider } from '@/components/FontProvider';
import { AppShell } from '@/components/AppShell';
import { PwaRegister } from '@/components/PwaRegister';
import { getSessionUser } from '@/lib/auth/session';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

const almarai = Almarai({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-almarai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'نظام مخالفات مرور نينوى',
  description: 'نظام إدخال ومتابعة مخالفات مرور محافظة نينوى',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'مخالفات نينوى',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#1d1d1d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      data-font="almarai"
      className={`font-almarai ${tajawal.variable} ${almarai.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var f=localStorage.getItem('ui_font');var font=(f==='tajawal'||f==='almarai')?f:'almarai';var root=document.documentElement;root.dataset.font=font;root.classList.remove('font-tajawal','font-almarai');root.classList.add(font==='tajawal'?'font-tajawal':'font-almarai');}catch(e){document.documentElement.dataset.font='almarai';document.documentElement.classList.add('font-almarai');}})();`,
          }}
        />
      </head>
      <body className="font-almarai antialiased">
        <ThemeProvider>
          <LangProvider>
            <FontProvider>
              <PwaRegister />
              <AppShell user={user}>{children}</AppShell>
            </FontProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
