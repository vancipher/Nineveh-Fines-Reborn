'use client';

import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { captureElementAsPng } from '@/lib/export/pngCapture';
import { logClientAudit } from '@/lib/auditClient';
import { AuditEvents } from '@/lib/auth/auditEvents';
import { exportPngSummary } from '@/lib/auth/auditMessages';
import { Spinner } from '@/components/ui';
import { useLang } from './LangProvider';
import { cn } from '@/lib/utils';

interface PngExportButtonProps {
  targetRef: React.RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function PngExportButton({
  targetRef,
  filename,
  label,
  className,
  disabled,
}: PngExportButtonProps) {
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function exportPng() {
    if (!targetRef.current) return;
    setBusy(true);
    setError('');
    try {
      await captureElementAsPng(targetRef.current, { filename });
      logClientAudit(
        AuditEvents.EXPORT_PNG,
        exportPngSummary([filename.replace(/\.[^.]+$/, '')], 'dashboard'),
        { filename, context: 'dashboard' },
      );
    } catch {
      setError(lang === 'ar' ? 'فشل تصدير الصورة' : 'Image export failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={cn('btn-secondary gap-2 text-sm', className)}
        disabled={disabled || busy}
        onClick={exportPng}
      >
        {busy ? <Spinner size="sm" /> : <ImageIcon size={15} aria-hidden />}
        {label ?? (lang === 'ar' ? 'تصدير PNG' : 'Export PNG')}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
