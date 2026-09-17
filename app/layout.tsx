import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CASTING ME',
  description: 'A two-minute visual novel about an East Asian actress navigating typecasting in Hollywood.',
  openGraph: {
    title: 'CASTING ME',
    description: 'Being seen can also mean being typecast.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CASTING ME',
    description: 'Being seen can also mean being typecast.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
