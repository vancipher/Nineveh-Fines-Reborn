'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Download, Settings, Shield } from 'lucide-react';
import { useLang } from './LangProvider';
import { t } from '@/lib/i18n';
import { canAccessAdmin, canAccessNewEntry, canAccessSecurity } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  role?: string;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const { lang } = useLang();
  const pathname = usePathname();

  const items = [
    { href: '/dashboard', label: t(lang, 'dashboard'), icon: Home, primary: false },
    ...(canAccessNewEntry(role)
      ? [{ href: '/entries/new', label: t(lang, 'newEntry'), icon: Plus, primary: true }]
      : []),
    { href: '/export', label: t(lang, 'export'), icon: Download, primary: !canAccessNewEntry(role) },
    ...(canAccessAdmin(role) ? [{ href: '/admin', label: t(lang, 'admin'), icon: Settings, primary: false }] : []),
    ...(canAccessSecurity(role)
      ? [{ href: '/security', label: lang === 'ar' ? 'الأمن' : 'Security', icon: Shield, primary: false }]
      : []),
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-dark-border dark:bg-dark-surface/98 md:hidden"
      aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors',
                item.primary && !active && 'text-brand-600 dark:text-brand-400',
                active && 'text-brand-700 dark:text-slate-100',
                !active && !item.primary && 'text-slate-500 dark:text-slate-400',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                item.primary && 'bg-brand-600 text-white shadow-md dark:bg-dark-elevated-2 dark:ring-1 dark:ring-dark-border',
                active && !item.primary && 'bg-brand-100 dark:bg-dark-elevated',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="max-w-[72px] truncate text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

