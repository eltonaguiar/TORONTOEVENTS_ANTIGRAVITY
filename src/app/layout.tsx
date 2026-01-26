import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Toronto Events Aggregator',
  description: 'The best events in Toronto, curated and refreshed daily.',
};

import { SettingsProvider } from '../context/SettingsContext';
import SettingsManager from '../components/SettingsManager';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7893721225790912"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={inter.className}>
        <SettingsProvider>
          {children}
          <SettingsManager />
        </SettingsProvider>
      </body>
    </html>
  );
}
