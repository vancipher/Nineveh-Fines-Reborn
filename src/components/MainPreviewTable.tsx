'use client';

import { forwardRef } from 'react';
import { toArabicNumerals } from '@/lib/numerals';

export interface MainPreviewSectorCol {
  id: string;
  label: string;
}

export interface MainPreviewRow {
  index: number;
  nameAr: string;
  counts: (number | null)[];
  amounts: (number | null)[];
}

export interface MainPreviewData {
  title: string;
  subtitle: string;
  reportDate: string;
  sectorColumns: MainPreviewSectorCol[];
  rows: MainPreviewRow[];
  sectorTotals: { count: number; amount: number }[];
  impoundVehicles: number;
  impoundBikes: number;
}

interface Props {
  data: MainPreviewData;
}

function fmt(n: number | null) {
  if (n === null || n === 0) return '—';
  return toArabicNumerals(n);
}

export const MainPreviewTable = forwardRef<HTMLDivElement, Props>(function MainPreviewTable(
  { data },
  ref,
) {
  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-slate-300 bg-white p-4 text-slate-900"
      dir="rtl"
      style={{ fontFamily: 'Arial, Tahoma, sans-serif' }}
    >
      <h2 className="mb-1 text-center text-sm font-bold">{data.title}</h2>
      <p className="mb-1 text-center text-[10px] leading-snug">{data.subtitle}</p>
      <p className="mb-3 text-center text-[10px]">{data.reportDate}</p>

      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-slate-400 px-1 py-1" rowSpan={2}>
              ت
            </th>
            <th className="border border-slate-400 px-1 py-1 text-right" rowSpan={2}>
              نوع المخالفة
            </th>
            {data.sectorColumns.map((col) => (
              <th key={col.id} className="border border-slate-400 px-1 py-1 text-center" colSpan={2}>
                {col.label}
              </th>
            ))}
          </tr>
          <tr className="bg-slate-100">
            {data.sectorColumns.flatMap((col) => [
              <th key={`${col.id}-c`} className="border border-slate-400 px-0.5 py-0.5 text-center">
                عدد
              </th>,
              <th key={`${col.id}-a`} className="border border-slate-400 px-0.5 py-0.5 text-center">
                مبلغ
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.index}>
              <td className="border border-slate-300 px-1 py-0.5 text-center">
                {toArabicNumerals(row.index)}
              </td>
              <td className="max-w-[160px] border border-slate-300 px-1 py-0.5 text-right leading-tight">
                {row.nameAr}
              </td>
              {data.sectorColumns.flatMap((_, i) => [
                <td
                  key={`c-${row.index}-${i}`}
                  className="border border-slate-300 px-0.5 py-0.5 text-center"
                >
                  {fmt(row.counts[i])}
                </td>,
                <td
                  key={`a-${row.index}-${i}`}
                  className="border border-slate-300 px-0.5 py-0.5 text-center"
                >
                  {fmt(row.amounts[i])}
                </td>,
              ])}
            </tr>
          ))}
          <tr className="bg-slate-200 font-bold">
            <td className="border border-slate-400 px-1 py-1" colSpan={2}>
              المجموع
            </td>
            {data.sectorTotals.flatMap((t, i) => [
              <td key={`tc-${i}`} className="border border-slate-400 px-0.5 py-0.5 text-center">
                {fmt(t.count)}
              </td>,
              <td key={`ta-${i}`} className="border border-slate-400 px-0.5 py-0.5 text-center">
                {fmt(t.amount)}
              </td>,
            ])}
          </tr>
        </tbody>
      </table>

      {(data.impoundVehicles > 0 || data.impoundBikes > 0) && (
        <p className="mt-2 text-center text-[10px]">
          {data.impoundVehicles > 0 && `حجز مركبات: ${toArabicNumerals(data.impoundVehicles)}`}
          {data.impoundVehicles > 0 && data.impoundBikes > 0 && ' | '}
          {data.impoundBikes > 0 && `حجز دراجات: ${toArabicNumerals(data.impoundBikes)}`}
        </p>
      )}
    </div>
  );
});
