'use client';

import { motion } from 'framer-motion';
import { useLang } from './LangProvider';
import { t, formatIqd } from '@/lib/i18n';

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <motion.span
      className={`spinner ${size === 'sm' ? 'spinner-sm' : 'spinner-md'}`}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
    />
  );
}

interface StatCardProps {
  label: string;
  count: number;
  amount: number;
  index?: number;
}

export function StatCard({ label, count, amount, index = 0 }: StatCardProps) {
  const { lang } = useLang();
  return (
    <motion.div
      className="card flex flex-col gap-1"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.10)' }}
    >
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {formatIqd(count, lang)}
      </p>
      <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
        {formatIqd(amount, lang)} IQD
      </p>
    </motion.div>
  );
}

interface SectorBarProps {
  name: string;
  count: number;
  amount?: number;
  max: number;
  index?: number;
}

export function SectorBar({ name, count, amount, max, index = 0 }: SectorBarProps) {
  const { lang } = useLang();
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
        <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
          {count}
          {amount !== undefined && amount > 0 && (
            <span className="ms-1.5 text-brand-600 dark:text-brand-400">
              · {formatIqd(amount, lang)}
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-dark-elevated-2">
        <motion.div
          className="h-1.5 rounded-full bg-brand-500 dark:bg-brand-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </motion.div>
  );
}

export function LoadingState() {
  const { lang } = useLang();
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Spinner />
      {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
    </div>
  );
}
