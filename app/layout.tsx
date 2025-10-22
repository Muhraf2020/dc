export const runtime = 'nodejs';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Derm Clinics Near Me | Find Dermatology Clinics in USA',
  description:
    'Comprehensive directory of dermatology clinics across the United States. Find skin care specialists, ratings, reviews, and contact information.',
  keywords: [
    'dermatology',
    'skin care clinic',
    'dermatologist',
    'skin doctor',
    'acne treatment',
    'skin cancer screening',
    'cosmetic dermatology',
  ],
  authors: [{ name: 'Derm Clinics Near Me' }],
  openGraph: {
    title: 'Derm Clinics Near Me',
    description: 'Find the best dermatology clinics across the USA',
    url: 'https://dermaclinicsnearme.com',
    siteName: 'Derm Clinics Near Me',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Derm Clinics Near Me',
    description: 'Find the best dermatology clinics across the USA',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={inter.className}>
        {children}
        
        {/* Google Analytics - Uncomment and add your GA ID */}
        {/* {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )} */}
      </body>
    </html>
  );
}
