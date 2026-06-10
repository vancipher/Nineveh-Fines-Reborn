'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from './LangProvider';
import { cn } from '@/lib/utils';

interface Props {
  username: string;
  role?: string;
  onLogout: () => void;
}

/** Mobile: tap username to open account menu with sign out. */
export function UserAccountMenu({ username, role, onLogout }: Props) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div className="relative min-w-0 md:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'max-w-[140px] truncate rounded-lg px-1 py-0.5 text-start text-sm font-semibold text-slate-800 transition-colors',
          'hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-dark-hover',
          open && 'bg-slate-100 dark:bg-dark-hover',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {username}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 sm:hidden"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute start-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-dark-border dark:bg-dark-surface"
              role="menu"
            >
              {role && (
                <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {role}
                </p>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut size={16} aria-hidden />
                {lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
