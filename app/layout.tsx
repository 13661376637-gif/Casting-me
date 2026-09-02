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
  title: 'CASTING ME / 选角中的我',
  description: '一款关于好莱坞东亚女性类型化的两分钟 2D 立绘对话游戏 Demo。',
  openGraph: {
    title: 'CASTING ME / 选角中的我',
    description: '被看见，也可能意味着被固定。',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CASTING ME / 选角中的我',
    description: '被看见，也可能意味着被固定。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
