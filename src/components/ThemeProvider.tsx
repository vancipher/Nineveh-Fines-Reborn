'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={['light', 'dark', 'cyber', 'soc']}
    >
      {children}
    </NextThemesProvider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="h-8 w-14 rounded-full" />;
  }

  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      aria-label="Toggle dark mode"
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-8 items-center rounded-full border border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition-colors duration-300
                 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
    >
      {isDark ? 'Dark' : 'Light'}
    </motion.button>
  );
}
