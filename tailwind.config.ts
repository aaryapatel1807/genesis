import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        gold: 'var(--gold)',
        teal: 'var(--teal)',
        red: 'var(--red)',
        'n-company': 'var(--n-company)',
        'n-researcher': 'var(--n-researcher)',
        'n-university': 'var(--n-university)',
        'n-product': 'var(--n-product)',
        'n-startup': 'var(--n-startup)',
        'n-funder': 'var(--n-funder)',
        'n-patent': 'var(--n-patent)',
        'n-event': 'var(--n-event)',
        'n-technology': 'var(--n-technology)',
        'n-paper': 'var(--n-paper)',
        'n-job': 'var(--n-job)',
        'n-country': 'var(--n-country)',
        'n-government': 'var(--n-government)',
        'n-law': 'var(--n-law)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
