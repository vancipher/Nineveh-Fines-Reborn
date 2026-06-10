import { NextRequest, NextResponse } from 'next/server';

import { and, desc, eq, sql } from 'drizzle-orm';

import { z } from 'zod';

import { getDb, schema } from '@/lib/db';

import { getSessionUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import {
  entryCreatedSummary,
  entryDeletedSummary,
  entryUpdatedSummary,
} from '@/lib/auth/auditMessages';

import { saveEntrySchema } from '@/lib/validators';

import { newId } from '@/lib/utils';



const updateEntrySchema = saveEntrySchema.extend({ id: z.string().min(1) });



function canWrite(role: string | undefined) {

  return role === 'admin' || role === 'operator' || role === 'superadmin';

}



async function replaceEntryLines(

  entryId: string,

  lines: Array<{ violationId: string; count: number; amount: number }>,

) {

  const db = getDb();

  await db.delete(schema.entryLines).where(eq(schema.entryLines.entryId, entryId));

  const nonZero = lines.filter((l) => l.count > 0 || l.amount > 0);

  if (nonZero.length === 0) return;

  await db.insert(schema.entryLines).values(

    nonZero.map((line) => ({

      id: newId('line'),

      entryId,

      violationId: line.violationId,

      count: line.count,

      amount: line.amount,

    })),

  );

}



export async function POST(request: NextRequest) {

  const user = await getSessionUser();

  if (!user || !canWrite(user.role)) {

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  }



  const body = await request.json();

  const parsed = saveEntrySchema.safeParse(body);

  if (!parsed.success) {

    const first = parsed.error.errors[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid entry data' }, { status: 400 });

  }



  const db = getDb();

  const now = new Date().toISOString();



  // Each save is a separate session (no merge into same sector/date).
  const entryId = newId('entry');

  await db.insert(schema.entries).values({
    id: entryId,
    sectorId: parsed.data.sectorId,
    entryDate: parsed.data.entryDate,
    createdBy: user.id,
    impoundVehicles: parsed.data.impoundVehicles,
    impoundBikes: parsed.data.impoundBikes,
    notes: parsed.data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await replaceEntryLines(
    entryId,
    parsed.data.lines.map((l) => ({ violationId: l.violationId, count: l.count, amount: l.amount })),
  );

  const [sector] = await db
    .select({ nameAr: schema.sectors.nameAr })
    .from(schema.sectors)
    .where(eq(schema.sectors.id, parsed.data.sectorId))
    .limit(1);

  await auditAction(request, user, AuditEvents.ENTRY_CREATED, {
    summary: entryCreatedSummary(parsed.data.entryDate, sector?.nameAr),
    entryId,
    sectorId: parsed.data.sectorId,
    sectorName: sector?.nameAr,
    entryDate: parsed.data.entryDate,
    lineCount: parsed.data.lines.length,
  });

  return NextResponse.json({ id: entryId, session: true });

}



export async function GET(request: NextRequest) {

  const user = await getSessionUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });



  const db = getDb();

  const list = request.nextUrl.searchParams.get('list');

  const id = request.nextUrl.searchParams.get('id');



  if (list === '1') {

    const rows = await db

      .select({

        id: schema.entries.id,

        sectorId: schema.entries.sectorId,

        entryDate: schema.entries.entryDate,

        impoundVehicles: schema.entries.impoundVehicles,

        impoundBikes: schema.entries.impoundBikes,

        createdAt: schema.entries.createdAt,

        nameAr: schema.sectors.nameAr,

        nameEn: schema.sectors.nameEn,

        totalCount: sql<number>`coalesce(sum(${schema.entryLines.count}), 0)`,

        totalAmount: sql<number>`coalesce(sum(${schema.entryLines.amount}), 0)`,

      })

      .from(schema.entries)

      .innerJoin(schema.sectors, eq(schema.entries.sectorId, schema.sectors.id))

      .leftJoin(schema.entryLines, eq(schema.entryLines.entryId, schema.entries.id))

      .groupBy(schema.entries.id)

      .orderBy(desc(schema.entries.entryDate));



    return NextResponse.json({

      entries: rows.map((r) => ({

        ...r,

        totalCount: Number(r.totalCount),

        totalAmount: Number(r.totalAmount),

      })),

    });

  }



  if (id) {

    const entry = await db.select().from(schema.entries).where(eq(schema.entries.id, id)).limit(1);

    if (!entry[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const lines = await db.select().from(schema.entryLines).where(eq(schema.entryLines.entryId, id));

    return NextResponse.json({ entry: entry[0], lines });

  }



  const sectorId = request.nextUrl.searchParams.get('sectorId');

  const entryDate = request.nextUrl.searchParams.get('date');

  if (!sectorId || !entryDate) {

    return NextResponse.json({ error: 'sectorId and date required' }, { status: 400 });

  }



  const entries = await db

    .select()

    .from(schema.entries)

    .where(eq(schema.entries.sectorId, sectorId))

    .limit(50);



  const dayEntry = entries.find((e) => e.entryDate === entryDate);

  if (!dayEntry) return NextResponse.json({ entry: null, lines: [] });



  const lines = await db.select().from(schema.entryLines).where(eq(schema.entryLines.entryId, dayEntry.id));

  return NextResponse.json({ entry: dayEntry, lines });

}



export async function PUT(request: NextRequest) {

  const user = await getSessionUser();

  if (!user || !canWrite(user.role)) {

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  }



  const parsed = updateEntrySchema.safeParse(await request.json());

  if (!parsed.success) {

    const first = parsed.error.errors[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid entry data' }, { status: 400 });

  }



  const db = getDb();

  const existing = await db.select().from(schema.entries).where(eq(schema.entries.id, parsed.data.id)).limit(1);

  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });



  const now = new Date().toISOString();

  await db

    .update(schema.entries)

    .set({

      sectorId: parsed.data.sectorId,

      entryDate: parsed.data.entryDate,

      impoundVehicles: parsed.data.impoundVehicles,

      impoundBikes: parsed.data.impoundBikes,

      notes: parsed.data.notes ?? null,

      updatedAt: now,

    })

    .where(eq(schema.entries.id, parsed.data.id));



  await replaceEntryLines(

    parsed.data.id,

    parsed.data.lines.map((l) => ({ violationId: l.violationId, count: l.count, amount: l.amount })),

  );

  const [sector] = await db
    .select({ nameAr: schema.sectors.nameAr })
    .from(schema.sectors)
    .where(eq(schema.sectors.id, parsed.data.sectorId))
    .limit(1);

  await auditAction(request, user, AuditEvents.ENTRY_UPDATED, {
    summary: entryUpdatedSummary(parsed.data.entryDate, parsed.data.id) +
      (sector?.nameAr ? ` · ${sector.nameAr}` : ''),
    entryId: parsed.data.id,
    sectorId: parsed.data.sectorId,
    sectorName: sector?.nameAr,
    entryDate: parsed.data.entryDate,
  });

  return NextResponse.json({ ok: true, id: parsed.data.id });

}



export async function DELETE(request: NextRequest) {

  const user = await getSessionUser();

  if (!user || !canWrite(user.role)) {

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  }



  const id = request.nextUrl.searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });



  const db = getDb();

  const [existing] = await db.select().from(schema.entries).where(eq(schema.entries.id, id)).limit(1);
  let sectorName: string | undefined;
  if (existing?.sectorId) {
    const [sector] = await db
      .select({ nameAr: schema.sectors.nameAr })
      .from(schema.sectors)
      .where(eq(schema.sectors.id, existing.sectorId))
      .limit(1);
    sectorName = sector?.nameAr;
  }

  await db.delete(schema.entries).where(eq(schema.entries.id, id));

  await auditAction(request, user, AuditEvents.ENTRY_DELETED, {
    summary: entryDeletedSummary(existing?.entryDate, sectorName ?? existing?.sectorId),
    entryId: id,
    sectorId: existing?.sectorId,
    sectorName,
    entryDate: existing?.entryDate,
  });

  return NextResponse.json({ ok: true });

}


