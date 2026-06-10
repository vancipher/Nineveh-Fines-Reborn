export type AppRole = 'viewer' | 'operator' | 'admin' | 'superadmin';

export const ROLE_ORDER: AppRole[] = ['viewer', 'operator', 'admin', 'superadmin'];

/** Dashboard + export only */
export function canAccessDashboard(role: string | undefined): boolean {
  return !!role;
}

export function canAccessExport(role: string | undefined): boolean {
  return !!role;
}

/** New entry + write data */
export function canAccessNewEntry(role: string | undefined): boolean {
  return role === 'operator' || role === 'admin' || role === 'superadmin';
}

export function canWriteEntries(role: string | undefined): boolean {
  return canAccessNewEntry(role);
}

/** System admin panel (not gear UI prefs) */
export function canAccessAdmin(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function canAccessSecurity(role: string | undefined): boolean {
  return role === 'superadmin';
}

export function canDeleteUsers(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function canUseCyberThemes(_role?: string): boolean {
  return true;
}

export type NavItem = { href: string; labelKey?: string; labelAr?: string; labelEn?: string };

export function navItemsForRole(
  role: string | undefined,
  labels: { dashboard: string; newEntry: string; export: string; admin: string; security: string },
): Array<{ href: string; label: string }> {
  const items: Array<{ href: string; label: string }> = [
    { href: '/dashboard', label: labels.dashboard },
  ];
  if (canAccessNewEntry(role)) {
    items.push({ href: '/entries/new', label: labels.newEntry });
  }
  if (canAccessExport(role)) {
    items.push({ href: '/export', label: labels.export });
  }
  if (canAccessAdmin(role)) {
    items.push({ href: '/admin', label: labels.admin });
  }
  if (canAccessSecurity(role)) {
    items.push({ href: '/security', label: labels.security });
  }
  return items;
}

/** Path → roles allowed (page + API prefixes). null = any authenticated role. */
export function rolesAllowedForPath(pathname: string, method = 'GET'): AppRole[] | null {
  if (pathname.startsWith('/security') || pathname.startsWith('/api/security')) {
    return ['superadmin'];
  }
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return ['admin', 'superadmin'];
  }
  if (pathname.startsWith('/entries/new')) {
    return ['operator', 'admin', 'superadmin'];
  }
  if (pathname.startsWith('/api/entries')) {
    if (method === 'GET') return null;
    return ['operator', 'admin', 'superadmin'];
  }
  if (pathname.startsWith('/api/export')) {
    return ['viewer', 'operator', 'admin', 'superadmin'];
  }
  if (pathname.startsWith('/api/voice')) {
    return ['operator', 'admin', 'superadmin'];
  }
  if (pathname.startsWith('/api/import')) {
    return ['operator', 'admin', 'superadmin'];
  }
  return null;
}

export function roleMayAccessPath(role: string | undefined, pathname: string, method = 'GET'): boolean {
  const allowed = rolesAllowedForPath(pathname, method);
  if (!allowed) return !!role;
  if (!role) return false;
  if (role === 'superadmin') return true;
  return allowed.includes(role as AppRole);
}
