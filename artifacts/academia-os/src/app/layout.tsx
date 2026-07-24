import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: {
    default: 'AcademiaOS',
    template: '%s | AcademiaOS'
  },
  description: 'Secure school management software for Ghanaian primary and secondary schools.',
  applicationName: 'AcademiaOS',
  manifest: '/manifest.webmanifest',
  icons: [{ rel: 'icon', url: '/icon.svg' }]
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f5b45'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
