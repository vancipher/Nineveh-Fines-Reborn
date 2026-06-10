const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/export': 'Export',
  '/entries/new': 'New entry',
  '/admin': 'Admin',
  '/security': 'Security',
  '/login': 'Login',
};

export function pageViewSummary(path: string): string {
  const label = PAGE_LABELS[path] ?? path;
  return `Opened ${label}`;
}

export function exportExcelSummary(fromDate: string, toDate: string): string {
  return `Downloaded Excel · 59مخالفة sheet · ${fromDate} → ${toDate}`;
}

export function exportWordSummary(fromDate: string, toDate: string): string {
  return `Downloaded Word summary · ${fromDate} → ${toDate}`;
}

export function exportPngSummary(sheets: string[], context?: string): string {
  const names = sheets.join(', ');
  return context
    ? `Downloaded PNG · ${names} · ${context}`
    : `Downloaded PNG · ${names}`;
}

export function importExcelSummary(entryDate: string, fileName: string, created: number): string {
  return `Imported Excel · ${fileName} · date ${entryDate} · ${created} session(s)`;
}

export function entryCreatedSummary(entryDate: string, sectorName?: string): string {
  return `Created entry session · ${entryDate}${sectorName ? ` · ${sectorName}` : ''}`;
}

export function entryUpdatedSummary(entryDate: string, entryId?: string): string {
  return `Updated entry session · ${entryDate}${entryId ? ` · ${entryId.slice(0, 12)}` : ''}`;
}

export function entryDeletedSummary(entryDate?: string, sectorId?: string): string {
  return `Deleted entry session${entryDate ? ` · ${entryDate}` : ''}${sectorId ? ` · sector ${sectorId}` : ''}`;
}

export function adminUserCreatedSummary(target: string, role: string): string {
  return `Created user: ${target} · role ${role}`;
}

export function adminUserDeletedSummary(target: string): string {
  return `Deleted user: ${target}`;
}

export function adminUserUpdatedSummary(target: string, changes: string[]): string {
  return `Updated user: ${target} · ${changes.join(', ')}`;
}

/** Build readable line for security UI when legacy events lack summary. */
export function fallbackEventSummary(
  eventType: string,
  details: Record<string, unknown>,
): string {
  if (details.summary) return String(details.summary);

  switch (eventType) {
    case 'page_view':
      return pageViewSummary(String(details.path ?? ''));
    case 'export_excel':
      return exportExcelSummary(String(details.fromDate ?? '?'), String(details.toDate ?? '?'));
    case 'export_word':
      return exportWordSummary(String(details.fromDate ?? '?'), String(details.toDate ?? '?'));
    case 'export_summary':
      return `Previewed export data · ${details.fromDate ?? '?'} → ${details.toDate ?? '?'}`;
    case 'export_png':
      return exportPngSummary(
        Array.isArray(details.sheets) ? details.sheets.map(String) : [String(details.sheet ?? 'PNG')],
        details.context ? String(details.context) : undefined,
      );
    case 'import_excel':
      return importExcelSummary(
        String(details.entryDate ?? '?'),
        String(details.fileName ?? 'file'),
        Number(details.created ?? 0),
      );
    case 'entry_created':
      return entryCreatedSummary(String(details.entryDate ?? '?'), details.sectorId ? String(details.sectorId) : undefined);
    case 'entry_updated':
      return entryUpdatedSummary(String(details.entryDate ?? '?'), details.entryId ? String(details.entryId) : undefined);
    case 'entry_deleted':
      return entryDeletedSummary(
        details.entryDate ? String(details.entryDate) : undefined,
        details.sectorId ? String(details.sectorId) : undefined,
      );
    case 'admin_action': {
      const action = String(details.action ?? 'action');
      const target = details.target ? String(details.target) : '';
      if (action === 'user_deleted') return adminUserDeletedSummary(target || 'unknown');
      if (action === 'user_created') return adminUserCreatedSummary(target, String(details.role ?? '?'));
      if (action === 'user_updated') {
        return adminUserUpdatedSummary(target, Array.isArray(details.changes) ? details.changes.map(String) : ['updated']);
      }
      return `Admin: ${action}${target ? ` · ${target}` : ''}`;
    }
    case 'login_success':
      return 'Logged in successfully';
    case 'login_failed':
      return 'Failed login attempt';
    case 'logout':
      return 'Logged out';
    case 'security_view':
      return 'Opened Security Center';
    case 'voice_transcribe':
      return 'Used voice transcription';
    case 'voice_parse':
      return `Parsed voice command · violation ${details.violationIndex ?? '?'}`;
    case 'backup_created':
      return `Created backup · ${details.filename ?? 'file'}`;
    case 'backup_disconnected':
      return 'Disconnected Google Drive backup';
    default:
      return eventType.replace(/_/g, ' ');
  }
}
