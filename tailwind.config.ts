import type { Config } from 'tailwindcss';

/** Dark palette centered on #1D1D1D — all shades derived from charcoal gray, not slate blue */
const dark = {
  bg: '#1d1d1d',
  'bg-2': '#222222',
  surface: '#242424',
  elevated: '#2b2b2b',
  'elevated-2': '#333333',
  border: '#383838',
  'border-strong': '#454545',
  hover: '#333333',
  muted: '#b5b5b5',
  subtle: '#8a8a8a',
  text: '#f5f5f5',
} as const;

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-almarai)', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
        almarai: ['var(--font-almarai)', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
        tajawal: ['var(--font-tajawal)', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
      },
      colors: {
        dark,
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
