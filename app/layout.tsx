import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Genesis — Ask anything. Watch a world emerge.',
  description:
    'A cinematic knowledge universe of the AI ecosystem, generated live from web search. Explore companies, researchers, papers, products, and funding — through time.',
  metadataBase: new URL('https://genesis.vercel.app'),
  openGraph: {
    title: 'Genesis — Ask anything. Watch a world emerge.',
    description:
      'A living knowledge universe of the AI ecosystem. Every connection backed by evidence.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Genesis — Ask anything. Watch a world emerge.',
    description:
      'A living knowledge universe of the AI ecosystem. Every connection backed by evidence.',
  },
  themeColor: '#05070c',
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} bg-void text-ink font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
