import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import './genesis.css';

const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});
const qaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-qa-sans' });

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f5ff' },
    { media: '(prefers-color-scheme: dark)', color: '#04080a' },
  ],
  robots: { index: true, follow: true },
};

/**
 * No-flash theme script — the FIRST child of <html>. Runs before paint and
 * before React hydration: reads the stored theme, falls back to the OS
 * preference, and stamps `data-theme` on <html> so the correct CSS custom
 * properties win from the first frame. Keep tiny and dependency-free.
 */
const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('genesis-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <script
        dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
      />
      <body
        className={`${sans.variable} ${jetbrainsMono.variable} ${qaSans.variable} bg-void text-ink font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
