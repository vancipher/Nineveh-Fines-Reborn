'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useLang } from '@/components/LangProvider';
import { t } from '@/lib/i18n';

export default function LoginPage() {
  const { lang } = useLang();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: login.trim(), password: password.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t(lang, 'error'));
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-sm flex-col justify-center px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="card space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t(lang, 'login')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(lang, 'appName')}</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t(lang, 'username')}
            </label>
            <input
              className="input text-start"
              dir="ltr"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t(lang, 'password')}
            </label>
            <div className="relative">
              <input
                className="input pe-10 text-start"
                dir="ltr"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                spellCheck={false}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? (lang === 'ar' ? 'إخفاء' : 'Hide') : lang === 'ar' ? 'إظهار' : 'Show'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <span className="opacity-70">...</span> : t(lang, 'login')}
          </button>
        </form>
      </div>
    </div>
  );
}
