import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb, schema } from './index';
import { AWZAN_AGGREGATE_VIOLATION, SEED_SECTORS, SEED_VIOLATIONS } from '../data/catalog';
import { resolveAdminCredentials } from './defaults';

function id(prefix: string, value: string | number) {
  return `${prefix}_${value}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function seed() {
  const db = getDb();

  const existingUsers = await db.select().from(schema.users).limit(1);
  if (existingUsers.length > 0) {
    console.log('Database already seeded — skipping.');
    return;
  }

  const { email: adminEmail, username: adminUsername, password: adminPassword } = resolveAdminCredentials();

  await db.insert(schema.users).values({
    id: id('user', 'admin'),
    email: adminEmail,
    username: adminUsername,
    passwordHash: await bcrypt.hash(adminPassword, 12),
    role: 'admin',
    active: true,
    createdAt: nowIso(),
  });

  await db.insert(schema.sectors).values(
    SEED_SECTORS.map((s) => ({
      id: id('sector', s.slug),
      slug: s.slug,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      countCol: s.countCol,
      amountCol: s.amountCol,
      sortOrder: s.sortOrder,
      active: true,
    })),
  );

  await db.insert(schema.violations).values([
    ...SEED_VIOLATIONS.map((v) => ({
      id: id('violation', v.index),
      indexNum: v.index,
      excelRow: v.excelRow,
      nameAr: v.nameAr,
      nameEn: v.nameEn,
      sortOrder: v.index,
      active: true,
    })),
    {
      id: id('violation', AWZAN_AGGREGATE_VIOLATION.index),
      indexNum: AWZAN_AGGREGATE_VIOLATION.index,
      excelRow: AWZAN_AGGREGATE_VIOLATION.excelRow,
      nameAr: AWZAN_AGGREGATE_VIOLATION.nameAr,
      nameEn: AWZAN_AGGREGATE_VIOLATION.nameEn,
      sortOrder: AWZAN_AGGREGATE_VIOLATION.index,
      active: true,
    },
  ]);

  await db.insert(schema.appSettings).values([
    { key: 'voice_language', value: process.env.DEFAULT_VOICE_LANGUAGE ?? 'ar-SA' },
    { key: 'ui_language', value: 'ar' },
    { key: 'default_theme', value: 'light' },
    { key: 'system_name', value: 'نظام مخالفات مرور نينوى' },
    { key: 'backup_auto_enabled', value: 'false' },
    { key: 'backup_auto_interval_days', value: '7' },
    { key: 'backup_last_run', value: '' },
    { key: 'backup_last_file', value: '' },
    { key: 'google_drive_refresh_token', value: '' },
    { key: 'google_drive_email', value: '' },
    { key: 'google_drive_folder_id', value: '' },
  ]);

  console.log('Seed complete.');
  console.log(`Admin login: ${adminUsername} / ${adminPassword}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
