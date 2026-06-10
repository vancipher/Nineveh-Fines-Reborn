'use client';

import { forwardRef } from 'react';
import { toArabicNumerals } from '@/lib/numerals';

export interface SummaryPreviewRow {
  index: number;
  reportName: string;
  count: number;
  vehicles: number;
  bikes: number;
}

export interface SummaryPreviewData {
  introText: string;
  footerText: string;
  sectors: SummaryPreviewRow[];
  grandCount: number;
  grandVehicles: number;
  grandBikes: number;
}

interface SummaryPreviewTableProps {
  data: SummaryPreviewData;
}

export const SummaryPreviewTable = forwardRef<HTMLDivElement, SummaryPreviewTableProps>(
  function SummaryPreviewTable({ data }, ref) {
    const fmt = (n: number) => toArabicNumerals(n);

    return (
      <div
        ref={ref}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-slate-900"
        dir="rtl"
      >
        <h2 className="mb-2 text-center text-lg font-bold underline">مديرية مرور محافظة نينوى</h2>
        <p className="mb-4 text-center text-sm leading-relaxed">{data.introText}</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-slate-400 px-2 py-2">ت</th>
              <th className="border border-slate-400 px-2 py-2">اسم القاطع</th>
              <th className="border border-slate-400 px-2 py-2">عدد المخالفات المضبوطة</th>
              <th className="border border-slate-400 px-2 py-2">حجز مركبات</th>
              <th className="border border-slate-400 px-2 py-2">حجز دراجات</th>
            </tr>
          </thead>
          <tbody>
            {data.sectors.map((s) => (
              <tr key={s.index}>
                <td className="border border-slate-300 px-2 py-2 text-center">{fmt(s.index)}</td>
                <td className="border border-slate-300 px-2 py-2 text-right">{s.reportName}</td>
                <td className="border border-slate-300 px-2 py-2 text-center">
                  {s.count > 0 ? fmt(s.count) : '—'}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center">
                  {s.vehicles > 0 ? fmt(s.vehicles) : '—'}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center">
                  {s.bikes > 0 ? fmt(s.bikes) : '—'}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-200 font-bold">
              <td className="border border-slate-400 px-2 py-2" />
              <td className="border border-slate-400 px-2 py-2 text-center">المجموع الكلي لكافة القواطع</td>
              <td className="border border-slate-400 px-2 py-2 text-center">{fmt(data.grandCount)}</td>
              <td className="border border-slate-400 px-2 py-2 text-center">
                {data.grandVehicles > 0 ? fmt(data.grandVehicles) : '—'}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-center">
                {data.grandBikes > 0 ? fmt(data.grandBikes) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 text-center text-sm font-bold leading-relaxed">{data.footerText}</p>
      </div>
    );
  },
);
