'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLang } from './LangProvider';
import { AppSettingsMenu } from './AppSettingsMenu';
import { UserAccountMenu } from './UserAccountMenu';
import { MobileBottomNav } from './MobileBottomNav';
import { t } from '@/lib/i18n';
import { navItemsForRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  user?: { username: string; role: string } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';

  useEffect(() => {
    if (!user || isLogin) return;
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => null);
  }, [pathname, user, isLogin]);

  const nav = navItemsForRole(user?.role, {
    dashboard: t(lang, 'dashboard'),
    newEntry: t(lang, 'newEntry'),
    export: t(lang, 'export'),
    admin: t(lang, 'admin'),
    security: lang === 'ar' ? 'الأمن' : 'Security',
  });

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-dark-bg cyber:bg-[var(--background)] soc:bg-[var(--background)]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-dark-border dark:bg-dark-surface/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/icons/icon.svg"
              alt=""
              width={36}
              height={36}
              className="shrink-0 rounded-xl shadow-sm ring-1 ring-slate-200/80 dark:ring-dark-border"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
                {t(lang, 'appName')}
              </p>
              {user && (
                <>
                  <UserAccountMenu
                    username={user.username}
                    role={user.role}
                    onLogout={logout}
                  />
                  <p className="hidden truncate text-sm font-semibold text-slate-800 dark:text-slate-100 md:block">
                    {user.username}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <AppSettingsMenu showLogout={!!user} onLogout={logout} userRole={user?.role} />
          </div>
        </div>

        {user && (
          <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-3 md:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className="relative">
                  <span
                    className={cn(
                      'flex items-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-dark-muted dark:hover:bg-dark-hover',
                    )}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-brand-600 dark:bg-dark-elevated dark:ring-1 dark:ring-dark-border"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={cn(
          'mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6',
          user && !isLogin && 'pb-28 md:pb-6',
        )}
      >
        {children}
      </motion.main>

      {user && !isLogin && <MobileBottomNav role={user.role} />}
    </div>
  );
}
