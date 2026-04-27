import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Find Toronto Events | Dating, Activities & Things to Do This Weekend',
  description: 'Find Toronto events including dating, singles meetups, speed dating, activities, and things to do this weekend in Toronto. Curated and refreshed daily.',
  alternates: {
    canonical: 'https://findtorontoevents.ca/',
  },
  openGraph: {
    title: 'Find Toronto Events | Dating, Activities & Things to Do This Weekend',
    description: 'Find Toronto events including dating, singles meetups, speed dating, activities, and things to do this weekend in Toronto.',
    url: 'https://findtorontoevents.ca/',
    siteName: 'Find Toronto Events',
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find Toronto Events | Dating, Activities & Things to Do This Weekend',
    description: 'Find Toronto events including dating, singles meetups, speed dating, activities, and things to do this weekend in Toronto.',
  },
};

import { SettingsProvider } from '../context/SettingsContext';
import SettingsManager from '../components/SettingsManager';
import QuickNav from '../components/QuickNav';
import AppShell from '../components/AppShell';
import GlobalFooter from '../components/GlobalFooter';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="google" content="notranslate" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Load AdSense asynchronously with error handling
              (function() {
                try {
                  var script = document.createElement('script');
                  script.async = true;
                  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7893721225790912';
                  script.crossOrigin = 'anonymous';
                  script.onerror = function() {
                    // Silently handle AdSense load errors - ads are optional
                    console.warn('AdSense script failed to load (this is OK if ads are disabled or network is restricted)');
                  };
                  document.head.appendChild(script);
                } catch (e) {
                  console.warn('AdSense script initialization failed:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <SettingsProvider>
          <AppShell
            nav={<QuickNav />}
            settingsModal={<SettingsManager />}
          >
            {children}
            <GlobalFooter />
          </AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
