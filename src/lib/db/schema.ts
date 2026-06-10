import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['superadmin', 'admin', 'operator', 'viewer'] }).notNull().default('operator'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const sectors = sqliteTable('sectors', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  countCol: text('count_col'),
  amountCol: text('amount_col'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const violations = sqliteTable('violations', {
  id: text('id').primaryKey(),
  indexNum: integer('index_num').notNull(),
  excelRow: integer('excel_row').notNull(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  sectorId: text('sector_id')
    .notNull()
    .references(() => sectors.id),
  entryDate: text('entry_date').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  impoundVehicles: integer('impound_vehicles').notNull().default(0),
  impoundBikes: integer('impound_bikes').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const entryLines = sqliteTable('entry_lines', {
  id: text('id').primaryKey(),
  entryId: text('entry_id')
    .notNull()
    .references(() => entries.id, { onDelete: 'cascade' }),
  violationId: text('violation_id')
    .notNull()
    .references(() => violations.id),
  count: integer('count').notNull().default(0),
  amount: real('amount').notNull().default(0),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const loginAttempts = sqliteTable('login_attempts', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  attemptedAt: text('attempted_at').notNull(),
});

export const systemEvents = sqliteTable('system_events', {
  id: text('id').primaryKey(),
  /** login_success | login_failed | logout | export_generated | admin_action | entry_created | entry_deleted | security_view */
  eventType: text('event_type').notNull(),
  userId: text('user_id'),
  username: text('username').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: text('details'),
  createdAt: text('created_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type Sector = typeof sectors.$inferSelect;
export type Violation = typeof violations.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type EntryLine = typeof entryLines.$inferSelect;
export type SystemEvent = typeof systemEvents.$inferSelect;
