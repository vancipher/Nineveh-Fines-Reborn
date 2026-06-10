import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { dateRangePresets } from '@/lib/dates';
import { todayIso } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const today = todayIso();
  const presets = dateRangePresets();
  const scope = request.nextUrl.searchParams.get('scope') === 'all' ? 'all' : 'today';

  const scopedEntryFilter =
    scope === 'today' ? eq(schema.entries.entryDate, today) : undefined;

  const [scopedTotals] = await db
    .select({
      totalCount: sql<number>`coalesce(sum(${schema.entryLines.count}), 0)`,
      totalAmount: sql<number>`coalesce(sum(${schema.entryLines.amount}), 0)`,
    })
    .from(schema.entryLines)
    .innerJoin(schema.entries, eq(schema.entryLines.entryId, schema.entries.id))
    .where(scopedEntryFilter);

  const [allTimeTotals] = await db
    .select({
      totalCount: sql<number>`coalesce(sum(${schema.entryLines.count}), 0)`,
      totalAmount: sql<number>`coalesce(sum(${schema.entryLines.amount}), 0)`,
    })
    .from(schema.entryLines)
    .innerJoin(schema.entries, eq(schema.entryLines.entryId, schema.entries.id));

  const [todayStats] = await db
    .select({
      totalCount: sql<number>`coalesce(sum(${schema.entryLines.count}), 0)`,
      totalAmount: sql<number>`coalesce(sum(${schema.entryLines.amount}), 0)`,
    })
    .from(schema.entryLines)
    .innerJoin(schema.entries, eq(schema.entryLines.entryId, schema.entries.id))
    .where(eq(schema.entries.entryDate, today));

  const [weekStats] = await db
    .select({
      totalCount: sql<number>`coalesce(sum(${schema.entryLines.count}), 0)`,
      totalAmount: sql<number>`coalesce(sum(${schema.entryLines.amount}), 0)`,
    })
    .from(schema.entryLines)
    .innerJoin(schema.entries, eq(schema.entryLines.entryId, schema.entries.id))
    .where(
      and(gte(schema.entries.entryDate, presets.weekly.from), lte(schema.entries.entryDate, presets.weekly.to)),
    );

  const perSector = await db
    .select({
      sectorId: schema.sectors.id,
      nameAr: schema.sectors.nameAr,
      nameEn: schema.sectors.nameEn,
      totalCount: sql<number>`coalesce(sum(${schema.entryLines.count}), 0)`,
      totalAmount: sql<number>`coalesce(sum(${schema.entryLines.amount}), 0)`,
    })
    .from(schema.sectors)
    .leftJoin(
      schema.entries,
      scopedEntryFilter
        ? and(eq(schema.entries.sectorId, schema.sectors.id), scopedEntryFilter)
        : eq(schema.entries.sectorId, schema.sectors.id),
    )
    .leftJoin(schema.entryLines, eq(schema.entryLines.entryId, schema.entries.id))
    .where(eq(schema.sectors.active, true))
    .groupBy(schema.sectors.id);

  const displayTotals = scope === 'today' ? scopedTotals : allTimeTotals;

  return NextResponse.json({
    scope,
    totals: {
      count: Number(displayTotals?.totalCount ?? 0),
      amount: Number(displayTotals?.totalAmount ?? 0),
    },
    allTime: {
      count: Number(allTimeTotals?.totalCount ?? 0),
      amount: Number(allTimeTotals?.totalAmount ?? 0),
    },
    today: {
      count: Number(todayStats?.totalCount ?? 0),
      amount: Number(todayStats?.totalAmount ?? 0),
    },
    week: {
      count: Number(weekStats?.totalCount ?? 0),
      amount: Number(weekStats?.totalAmount ?? 0),
    },
    perSector: perSector.map((s) => ({
      ...s,
      totalCount: Number(s.totalCount),
      totalAmount: Number(s.totalAmount),
    })),
  });
}
