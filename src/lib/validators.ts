import { z } from 'zod';
import { MAX_FINE_AMOUNT, MAX_IMPOUND_COUNT, MAX_VIOLATION_COUNT } from '@/lib/limits';

export const loginSchema = z.object({
  login: z.string().min(2).max(120),
  password: z.string().min(6).max(256),
});

export const entryLineSchema = z.object({
  violationId: z.string().min(1),
  indexNum: z.number().int().min(1).max(99),
  count: z.number().int().min(0).max(MAX_VIOLATION_COUNT),
  amount: z.number().min(0).max(MAX_FINE_AMOUNT),
});

export const saveEntrySchema = z.object({
  sectorId: z.string().min(1),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lines: z.array(entryLineSchema),
  impoundVehicles: z.number().int().min(0).max(MAX_IMPOUND_COUNT).default(0),
  impoundBikes: z.number().int().min(0).max(MAX_IMPOUND_COUNT).default(0),
  simplifiedAxleWeight: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const sectorSchema = z.object({
  slug: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/).optional(),
  nameAr: z.string().min(2).max(120),
  nameEn: z.string().min(2).max(120),
  countCol: z.string().max(3).optional().nullable(),
  amountCol: z.string().max(3).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
});

export const violationSchema = z.object({
  indexNum: z.number().int().min(1).max(99),
  excelRow: z.number().int().min(1).optional(),
  nameAr: z.string().min(2).max(500),
  nameEn: z.string().min(2).max(500),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const userSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(40),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['superadmin', 'admin', 'operator', 'viewer']),
  active: z.boolean().default(true),
});

export const exportSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sectorIds: z.array(z.string()).min(1),
});

export const voiceParseSchema = z.object({
  text: z.string().min(1).max(500),
});

export const settingsSchema = z.object({
  voiceLanguage: z.enum(['ar-IQ', 'ar-SA', 'en-US']).optional(),
  uiLanguage: z.enum(['ar', 'en']).optional(),
  defaultTheme: z.enum(['light', 'dark']).optional(),
  systemName: z.string().max(120).optional(),
  backupAutoEnabled: z.boolean().optional(),
  backupAutoIntervalDays: z.number().int().min(1).max(90).optional(),
});
