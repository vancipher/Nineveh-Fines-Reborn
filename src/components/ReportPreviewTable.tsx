'use client';

import { forwardRef } from 'react';
import { formatArabicPeriod } from '@/lib/export/arabicDate';
import { toArabicNumerals } from '@/lib/numerals';

export interface ReportPreviewRow {
  index: number;
  nameAr: string;
  count: number;
  amount: number;
}

export interface ReportPreviewData {
  introText: string;
  fromDate: string;
  toDate: string;
  totalVehicles: number;
  totalBikes: number;
  grandCount: number;
  grandAmount: number;
  rows: ReportPreviewRow[];
}

interface Props {
  data: ReportPreviewData;
}

export const ReportPreviewTable = forwardRef<HTMLDivElement, Props>(function ReportPreviewTable(
  { data },
  ref,
) {
  const fmt = (n: number) => (n > 0 ? toArabicNumerals(n) : '—');

  const periodLabel = formatArabicPeriod(data.fromDate, data.toDate);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-slate-900"
      dir="rtl"
    >
      <h2 className="mb-1 text-center text-base font-bold underline">مديرية مرور محافظة نينوى</h2>
      <p className="mb-1 text-center text-xs">موقف المخالفات ومبالغها ({periodLabel})</p>
      {(data.totalVehicles > 0 || data.totalBikes > 0) && (
        <p className="mb-3 text-center text-xs">
          {data.totalVehicles > 0 && `حجز مركبات: ${toArabicNumerals(data.totalVehicles)}`}
          {data.totalVehicles > 0 && data.totalBikes > 0 && '  |  '}
          {data.totalBikes > 0 && `حجز دراجات: ${toArabicNumerals(data.totalBikes)}`}
        </p>
      )}

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-slate-400 px-1 py-1.5">ت</th>
            <th className="border border-slate-400 px-1 py-1.5 text-right">نوع المخالفة</th>
            <th className="border border-slate-400 px-1 py-1.5">العدد</th>
            <th className="border border-slate-400 px-1 py-1.5">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.index}>
              <td className="border border-slate-300 px-1 py-1 text-center">{toArabicNumerals(r.index)}</td>
              <td className="border border-slate-300 px-1 py-1">{r.nameAr}</td>
              <td className="border border-slate-300 px-1 py-1 text-center">{fmt(r.count)}</td>
              <td className="border border-slate-300 px-1 py-1 text-center">{fmt(r.amount)}</td>
            </tr>
          ))}
          <tr className="bg-slate-200 font-bold">
            <td className="border border-slate-400 px-1 py-1.5" />
            <td className="border border-slate-400 px-1 py-1.5 text-center">الإجمالي</td>
            <td className="border border-slate-400 px-1 py-1.5 text-center">{toArabicNumerals(data.grandCount)}</td>
            <td className="border border-slate-400 px-1 py-1.5 text-center">
              {data.grandAmount > 0 ? toArabicNumerals(data.grandAmount) : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
