'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Globe, LogOut, Moon, Settings, Shield, Sun, Terminal, Type } from 'lucide-react';
import { canUseCyberThemes } from '@/lib/auth/roles';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useLang } from './LangProvider';
import { useFont, type UiFont } from './FontProvider';
import { cn } from '@/lib/utils';

type ThemeId = 'light' | 'dark' | 'cyber' | 'soc';

interface Props {
  showLogout?: boolean;
  onLogout?: () => void;
  userRole?: string;
}

export function AppSettingsMenu({ showLogout, onLogout, userRole }: Props) {
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const { font, setFont } = useFont();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCyberThemes = canUseCyberThemes(userRole);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const sheet = document.getElementById('settings-mobile-sheet');
        if (sheet?.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const currentTheme = (mounted ? theme : 'light') as ThemeId;

  function selectLang(l: 'ar' | 'en') {
    setLang(l);
    setOpen(false);
  }

  function selectTheme(t: ThemeId) {
    setTheme(t);
    setOpen(false);
  }

  function selectFont(f: UiFont) {
    setFont(f);
    setOpen(false);
  }

  function handleLogout() {
    setOpen(false);
    onLogout?.();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={lang === 'ar' ? 'الإعدادات' : 'Settings'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl border transition-colors',
          open
            ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-dark-elevated dark:text-dark-text'
            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-dark-border dark:bg-dark-surface dark:text-slate-300 dark:hover:bg-dark-hover',
        )}
      >
        <Settings size={16} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile: portal bottom sheet so it is not clipped by header/layout */}
            {typeof document !== 'undefined' &&
              createPortal(
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm sm:hidden"
                    aria-hidden
                    onClick={() => setOpen(false)}
                  />
                  <motion.div
                    id="settings-mobile-sheet"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl dark:border-dark-border dark:bg-dark-surface sm:hidden"
                    role="menu"
                  >
                    <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-dark-elevated-2" />
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                      <SettingsContent
                        lang={lang}
                        currentTheme={currentTheme}
                        isCyberThemes={isCyberThemes}
                        font={font}
                        onLang={selectLang}
                        onTheme={selectTheme}
                        onFont={selectFont}
                      />
                    </div>
                  </motion.div>
                </>,
                document.body,
              )}

            {/* Desktop: dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute end-0 top-10 z-50 hidden w-52 origin-top-end rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-dark-border dark:bg-dark-surface sm:block"
              role="menu"
            >
              <SettingsContent
                lang={lang}
                currentTheme={currentTheme}
                isCyberThemes={isCyberThemes}
                font={font}
                onLang={selectLang}
                onTheme={selectTheme}
                onFont={selectFont}
                showLogout={showLogout}
                onLogout={handleLogout}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ContentProps {
  lang: 'ar' | 'en';
  currentTheme: ThemeId;
  isCyberThemes: boolean;
  font: UiFont;
  onLang: (l: 'ar' | 'en') => void;
  onTheme: (t: ThemeId) => void;
  onFont: (f: UiFont) => void;
  showLogout?: boolean;
  onLogout?: () => void;
}

function SettingsContent({
  lang,
  currentTheme,
  isCyberThemes,
  font,
  onLang,
  onTheme,
  onFont,
  showLogout,
  onLogout,
}: ContentProps) {
  return (
    <div className="space-y-0.5" role="group">
      <SectionLabel>{lang === 'ar' ? 'اللغة' : 'Language'}</SectionLabel>
      <MenuRow
        label="العربية"
        icon={<Globe size={15} aria-hidden />}
        active={lang === 'ar'}
        onClick={() => onLang('ar')}
      />
      <MenuRow
        label="English"
        icon={<Globe size={15} aria-hidden />}
        active={lang === 'en'}
        onClick={() => onLang('en')}
      />

      <Divider />

      <SectionLabel>{lang === 'ar' ? 'المظهر' : 'Theme'}</SectionLabel>
      <MenuRow
        label={lang === 'ar' ? 'فاتح' : 'Light'}
        icon={<Sun size={15} aria-hidden />}
        active={currentTheme === 'light'}
        onClick={() => onTheme('light')}
      />
      <MenuRow
        label={lang === 'ar' ? 'داكن' : 'Dark'}
        icon={<Moon size={15} aria-hidden />}
        active={currentTheme === 'dark'}
        onClick={() => onTheme('dark')}
      />
      {isCyberThemes && (
        <>
          <MenuRow
            label={lang === 'ar' ? 'كحلي' : 'Navy'}
            icon={<Shield size={15} aria-hidden />}
            active={currentTheme === 'cyber'}
            onClick={() => onTheme('cyber')}
          />
          <MenuRow
            label={lang === 'ar' ? 'SOC أخضر' : 'SOC Green'}
            icon={<Terminal size={15} aria-hidden />}
            active={currentTheme === 'soc'}
            onClick={() => onTheme('soc')}
          />
        </>
      )}

      <Divider />

      <SectionLabel>{lang === 'ar' ? 'الخط العربي' : 'Arabic font'}</SectionLabel>
      <MenuRow
        label={lang === 'ar' ? 'المراعي' : 'Almarai'}
        sublabel={lang === 'ar' ? 'الخط الأساسي' : 'Primary'}
        previewClassName="font-almarai"
        icon={<Type size={15} aria-hidden />}
        active={font === 'almarai'}
        onClick={() => onFont('almarai')}
      />
      <MenuRow
        label={lang === 'ar' ? 'تجوال' : 'Tajawal'}
        sublabel={lang === 'ar' ? 'الخط الثانوي' : 'Secondary'}
        previewClassName="font-tajawal"
        icon={<Type size={15} aria-hidden />}
        active={font === 'tajawal'}
        onClick={() => onFont('tajawal')}
      />

      {showLogout && onLogout && (
        <>
          <Divider />
          <MenuRow
            label={lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
            icon={<LogOut size={15} aria-hidden />}
            active={false}
            onClick={onLogout}
            variant="danger"
          />
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-1 border-t border-slate-100 dark:border-dark-border" />;
}

function MenuRow({
  label,
  sublabel,
  previewClassName,
  icon,
  active,
  onClick,
  variant = 'default',
}: {
  label: string;
  sublabel?: string;
  previewClassName?: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active &&
          variant === 'default' &&
          'bg-brand-50 text-brand-700 dark:bg-dark-elevated dark:text-slate-100',
        !active &&
          variant === 'default' &&
          'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-dark-hover',
        variant === 'danger' &&
          'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30',
      )}
    >
      {icon && <span className="shrink-0 text-current">{icon}</span>}
      <span className={cn('flex-1 text-start leading-tight', previewClassName)}>
        {label}
        {sublabel && (
          <span className={cn('block text-[10px] font-normal opacity-50', previewClassName)}>
            {sublabel}
          </span>
        )}
      </span>
      {active && variant === 'default' && (
        <Check size={14} className="shrink-0 text-brand-600 dark:text-slate-300" aria-hidden />
      )}
    </button>
  );
}
