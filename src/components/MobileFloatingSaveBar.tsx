'use client';

import { Spinner } from '@/components/ui';
import { useLang } from './LangProvider';
import { t } from '@/lib/i18n';

interface MobileFloatingSaveBarProps {
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
  extra?: React.ReactNode;
}

/** Sticky bottom action bar for fast mobile entry (above bottom nav). */
export function MobileFloatingSaveBar({ onSave, saving, disabled, extra }: MobileFloatingSaveBarProps) {
  const { lang } = useLang();

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-dark-border dark:bg-dark-surface/98 md:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {extra && <div className="min-w-0 flex-1">{extra}</div>}
        <button
          type="button"
          className="btn-primary min-h-[48px] flex-1 gap-2 text-base shadow-lg"
          onClick={onSave}
          disabled={disabled || saving}
        >
          {saving && <Spinner size="sm" />}
          {saving ? '...' : t(lang, 'save')}
        </button>
      </div>
    </div>
  );
}
