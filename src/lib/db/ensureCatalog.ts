import { eq } from 'drizzle-orm';
import type { AppDb } from '@/lib/db';
import { schema } from '@/lib/db';
import { AWZAN_AGGREGATE_VIOLATION } from '@/lib/data/catalog';

/** Ensures the axle-weight aggregate violation exists (for DBs seeded before index 60 was added). */
export async function ensureAwzanAggregateViolation(db: AppDb) {
  const existing = await db
    .select()
    .from(schema.violations)
    .where(eq(schema.violations.indexNum, AWZAN_AGGREGATE_VIOLATION.index))
    .limit(1);

  if (existing[0]) return existing[0];

  const id = `violation_${AWZAN_AGGREGATE_VIOLATION.index}`;
  await db.insert(schema.violations).values({
    id,
    indexNum: AWZAN_AGGREGATE_VIOLATION.index,
    excelRow: AWZAN_AGGREGATE_VIOLATION.excelRow,
    nameAr: AWZAN_AGGREGATE_VIOLATION.nameAr,
    nameEn: AWZAN_AGGREGATE_VIOLATION.nameEn,
    sortOrder: AWZAN_AGGREGATE_VIOLATION.index,
    active: true,
  });

  const rows = await db.select().from(schema.violations).where(eq(schema.violations.id, id)).limit(1);
  return rows[0]!;
}
