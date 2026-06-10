import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { ensureAwzanAggregateViolation } from '@/lib/db/ensureCatalog';
import { AXLE_WEIGHT_SECTOR_SLUG, AWZAN_AGGREGATE_VIOLATION } from '@/lib/data/catalog';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  await ensureAwzanAggregateViolation(db);

  const [sectors, violations] = await Promise.all([
    db.select().from(schema.sectors).where(eq(schema.sectors.active, true)).orderBy(asc(schema.sectors.sortOrder)),
    db.select().from(schema.violations).where(eq(schema.violations.active, true)).orderBy(asc(schema.violations.sortOrder)),
  ]);

  const awzanViolation = violations.find((v) => v.indexNum === AWZAN_AGGREGATE_VIOLATION.index);

  return NextResponse.json({
    sectors: sectors.map((s) => ({ ...s, isAxleWeight: s.slug === AXLE_WEIGHT_SECTOR_SLUG })),
    violations: violations.filter((v) => v.indexNum >= 1 && v.indexNum <= 59),
    awzanViolationId: awzanViolation?.id ?? `violation_${AWZAN_AGGREGATE_VIOLATION.index}`,
  });
}
