import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans' });
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
  themeColor: '#04080a',
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
        className={`${sans.variable} ${jetbrainsMono.variable} bg-void text-ink font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
