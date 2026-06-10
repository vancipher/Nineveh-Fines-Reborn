export const AuditEvents = {
  PAGE_VIEW: 'page_view',
  EXPORT_EXCEL: 'export_excel',
  EXPORT_WORD: 'export_word',
  EXPORT_PNG: 'export_png',
  IMPORT_EXCEL: 'import_excel',
  ENTRY_CREATED: 'entry_created',
  ENTRY_UPDATED: 'entry_updated',
  ENTRY_DELETED: 'entry_deleted',
  VOICE_TRANSCRIBE: 'voice_transcribe',
  VOICE_PARSE: 'voice_parse',
  SETTINGS_VIEW: 'settings_view',
  BACKUP_CREATED: 'backup_created',
  BACKUP_DISCONNECTED: 'backup_disconnected',
  ADMIN_ACTION: 'admin_action',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SECURITY_VIEW: 'security_view',
  API_FORBIDDEN: 'api_forbidden',
} as const;

export type AuditEventType = (typeof AuditEvents)[keyof typeof AuditEvents];
