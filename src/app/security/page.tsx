'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  Globe,
  Lock,
  LogIn,
  LogOut,
  Mic,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Upload,
  User,
  UserCog,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequireRole } from '@/components/RequireRole';
import { fallbackEventSummary } from '@/lib/auth/auditMessages';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SecurityEvent {
  id: string;
  eventType: string;
  userId: string | null;
  username: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface LoginAttempt {
  id: string;
  identifier: string;
  attemptedAt: string;
}

interface SystemUser {
  id: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface Threat {
  identifier: string;
  failedCount: number;
  lastAttempt: string;
}

interface Stats {
  failedLogins24h: number;
  failedLogins7d: number;
  totalEvents7d: number;
  activeUsers: number;
  totalUsers: number;
  entries7d: number;
  topIps: Array<{ ip: string; count: number }>;
  eventTypeCounts?: Record<string, number>;
}

interface SecurityData {
  recentEvents: SecurityEvent[];
  loginAttempts: LoginAttempt[];
  users: SystemUser[];
  threats: Threat[];
  stats: Stats;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const EVENT_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  login_success: { icon: <LogIn size={13} />, label: 'Login Success', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  login_failed: { icon: <XCircle size={13} />, label: 'Login Failed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  logout: { icon: <LogOut size={13} />, label: 'Logout', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10' },
  page_view: { icon: <Eye size={13} />, label: 'Page View', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10' },
  export_excel: { icon: <Download size={13} />, label: 'Excel Download', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  export_word: { icon: <Download size={13} />, label: 'Word Download', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
  export_png: { icon: <Download size={13} />, label: 'PNG Download', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
  export_generated: { icon: <Upload size={13} />, label: 'Export', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  import_excel: { icon: <FileSpreadsheet size={13} />, label: 'Excel Import', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  entry_created: { icon: <Database size={13} />, label: 'Entry Created', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  entry_updated: { icon: <Database size={13} />, label: 'Entry Updated', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  entry_deleted: { icon: <Trash2 size={13} />, label: 'Entry Deleted', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  voice_transcribe: { icon: <Mic size={13} />, label: 'Voice Transcribe', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
  voice_parse: { icon: <Mic size={13} />, label: 'Voice Parse', color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
  backup_created: { icon: <Upload size={13} />, label: 'Backup Created', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  backup_disconnected: { icon: <AlertTriangle size={13} />, label: 'Backup Disconnected', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  admin_action: { icon: <UserCog size={13} />, label: 'Admin Action', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  security_view: { icon: <Shield size={13} />, label: 'Security View', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
};

function eventMeta(type: string) {
  return EVENT_META[type] ?? { icon: <Activity size={13} />, label: type, color: 'text-slate-400', bg: 'bg-slate-500/10' };
}

function threatLevel(count: number): { label: string; color: string } {
  if (count >= 10) return { label: 'CRITICAL', color: 'text-red-400' };
  if (count >= 5) return { label: 'HIGH', color: 'text-orange-400' };
  if (count >= 3) return { label: 'MEDIUM', color: 'text-amber-400' };
  return { label: 'LOW', color: 'text-yellow-400' };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, sub }: { label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
        <span className={cn('rounded-lg p-1.5', color.includes('red') ? 'bg-red-500/10 text-red-400' : color.includes('emerald') || color.includes('green') ? 'bg-emerald-500/10 text-emerald-400' : color.includes('amber') ? 'bg-amber-500/10 text-amber-400' : color.includes('blue') ? 'bg-blue-500/10 text-blue-400' : 'bg-cyan-500/10 text-cyan-400')}>
          {icon}
        </span>
      </div>
      <p className={cn('text-3xl font-bold tabular-nums', color)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-200">{title}</h2>
      {badge && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-dark-elevated dark:text-slate-400">{badge}</span>}
    </div>
  );
}

function Pulse({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'logins' | 'users'>('events');
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/security');
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? 'Failed to load security data');
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError('');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  function parseDetails(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Header ── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Security Operations Center</h1>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Pulse />
                <span>System Online</span>
                <span className="text-slate-400 dark:text-slate-600">·</span>
                <span className="font-mono">{now.toLocaleTimeString('en-GB')}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh(v => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                autoRefresh
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-dark-border dark:bg-dark-surface dark:text-slate-400 dark:hover:bg-dark-hover',
              )}
            >
              <Zap size={12} />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-dark-border dark:bg-dark-surface dark:text-slate-400 dark:hover:bg-dark-hover"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-700/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <RefreshCw size={20} className="animate-spin" />
            <span className="ms-2 text-sm">Loading security data…</span>
          </div>
        ) : data ? (
          <>
            {/* ── Status bar ── */}
            <div className="mb-6 flex flex-wrap gap-2">
              {[
                { icon: <CheckCircle2 size={12} />, label: 'API Gateway', ok: true },
                { icon: <Database size={12} />, label: 'Database', ok: true },
                { icon: <Lock size={12} />, label: 'Auth Service', ok: true },
                { icon: <Globe size={12} />, label: 'Network', ok: true },
              ].map(item => (
                <span key={item.label} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium', item.ok ? 'border-emerald-700/50 bg-emerald-500/10 text-emerald-400' : 'border-red-700/50 bg-red-500/10 text-red-400')}>
                  {item.icon}
                  {item.label}
                  <span className={cn('h-1.5 w-1.5 rounded-full', item.ok ? 'bg-emerald-400' : 'bg-red-400')} />
                </span>
              ))}
              <span className="ms-auto text-[10px] text-slate-500 dark:text-slate-400">
                Last updated: {lastRefresh.toLocaleTimeString('en-GB')}
              </span>
            </div>

            {data.stats.eventTypeCounts && Object.keys(data.stats.eventTypeCounts).length > 0 && (
              <div className="mb-6 card p-4">
                <SectionHeader icon={<Activity size={15} />} title="Activity Breakdown (7d)" badge="by event type" />
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.stats.eventTypeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const m = eventMeta(type);
                      return (
                        <span
                          key={type}
                          className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium', m.bg, m.color)}
                        >
                          {m.icon}
                          {m.label}
                          <span className="font-bold tabular-nums">{count}</span>
                        </span>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <KpiCard label="Failed Logins (24h)" value={data.stats.failedLogins24h} icon={<ShieldAlert size={16} />} color="text-red-400" sub="last 24 hours" />
              <KpiCard label="Failed Logins (7d)" value={data.stats.failedLogins7d} icon={<AlertTriangle size={16} />} color="text-orange-400" sub="last 7 days" />
              <KpiCard label="Events (7d)" value={data.stats.totalEvents7d} icon={<Activity size={16} />} color="text-blue-400" sub="system events" />
              <KpiCard label="Active Users" value={data.stats.activeUsers} icon={<Users size={16} />} color="text-emerald-400" sub={`of ${data.stats.totalUsers} total`} />
              <KpiCard label="Entries (7d)" value={data.stats.entries7d} icon={<Database size={16} />} color="text-cyan-400" sub="data entries" />
              <KpiCard label="Threat Sources" value={data.threats.filter(t => t.failedCount >= 3).length} icon={<ShieldAlert size={16} />} color="text-amber-400" sub="active threats" />
            </div>

            {/* ── Top row: Threats + IP Attackers ── */}
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              {/* Threat Detection */}
              <div className="card p-5">
                <SectionHeader icon={<ShieldAlert size={15} />} title="Threat Detection" badge={`${data.threats.length} sources`} />
                {data.threats.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    No threats detected in the last 7 days.
                  </p>
                ) : (
                  <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '320px' }}>
                    {data.threats.map(t => {
                      const level = threatLevel(t.failedCount);
                      return (
                        <div key={t.identifier} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-dark-elevated">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('text-[10px] font-bold tabular-nums shrink-0', level.color)}>
                              {level.label}
                            </span>
                            <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">{t.identifier}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-right">
                            <span className={cn('font-bold tabular-nums text-sm', level.color)}>{t.failedCount}×</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{relTime(t.lastAttempt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top IPs */}
              <div className="card p-5">
                <SectionHeader icon={<Globe size={15} />} title="Top Attacking IPs" badge="last 7d" />
                {data.stats.topIps.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    No suspicious IP activity detected.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.stats.topIps.map((item, i) => (
                      <div key={item.ip} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-dark-elevated">
                        <span className="w-5 text-center text-xs text-slate-500 dark:text-slate-400">#{i + 1}</span>
                        <span className="flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-300">{item.ip}</span>
                        <span className={cn('font-bold text-sm tabular-nums', item.count >= 10 ? 'text-red-400' : item.count >= 5 ? 'text-orange-400' : 'text-amber-400')}>
                          {item.count}×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Tabbed detail area ── */}
            <div className="card p-5">
              <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-4 dark:border-dark-border">
                {([
                  { id: 'events', label: 'System Events', icon: <Terminal size={13} />, badge: data.recentEvents.length },
                  { id: 'logins', label: 'Login Audit', icon: <Lock size={13} />, badge: data.loginAttempts.length },
                  { id: 'users', label: 'Accounts', icon: <Users size={13} />, badge: data.users.length },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-brand-600 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-dark-border dark:bg-dark-elevated dark:text-slate-400 dark:hover:bg-dark-hover',
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600 dark:bg-dark-elevated-2 dark:text-slate-400')}>
                      {tab.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* Events Tab */}
              {activeTab === 'events' && (
                <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '480px' }}>
                  {data.recentEvents.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-8">No events recorded yet. Events will appear as users interact with the system.</p>
                  ) : (
                    data.recentEvents.map(evt => {
                      const m = eventMeta(evt.eventType);
                      const det = parseDetails(evt.details);
                      return (
                        <div key={evt.id} className={cn('flex items-start gap-3 rounded-xl px-3 py-2.5', m.bg)}>
                          <span className={cn('mt-0.5 shrink-0', m.color)}>{m.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className={cn('text-xs font-semibold', m.color)}>{m.label}</span>
                              <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">{evt.username}</span>
                              {evt.ipAddress && <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{evt.ipAddress}</span>}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                              <span className="font-medium text-slate-700 dark:text-slate-200">{evt.username}</span>
                              {' · '}
                              {fallbackEventSummary(evt.eventType, det)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{relTime(evt.createdAt)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Login Audit Tab */}
              {activeTab === 'logins' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-dark-border dark:text-slate-400">
                        <th className="px-3 py-2 text-left font-medium">Identifier</th>
                        <th className="px-3 py-2 text-left font-medium">Time</th>
                        <th className="px-3 py-2 text-left font-medium">Relative</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                      {data.loginAttempts.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-dark-hover">
                          <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{a.identifier}</td>
                          <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{fmtDateTime(a.attemptedAt)}</td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{relTime(a.attemptedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-dark-border dark:text-slate-400">
                        <th className="px-3 py-2 text-left font-medium">Username</th>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium">Role</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                      {data.users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-dark-hover">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={cn('font-mono font-medium', u.role === 'superadmin' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200')}>
                                {u.username}
                              </span>
                              {u.role === 'superadmin' && <Shield size={11} className="text-brand-400" />}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{u.email}</td>
                          <td className="px-3 py-2">
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              u.role === 'superadmin' ? 'bg-brand-500/20 text-brand-400' :
                              u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' :
                              u.role === 'operator' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-600/40 text-slate-400',
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn('flex items-center gap-1 font-medium', u.active ? 'text-emerald-400' : 'text-red-400')}>
                              {u.active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              {u.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
              Security Operations Center · Fines System Reborn · Auto-refreshes every 30s · All activity is monitored and logged
            </p>
          </>
        ) : null}
    </div>
  );
}

export default function SecurityPageWrapper() {
  return (
    <RequireRole allow={['superadmin']}>
      <SecurityPage />
    </RequireRole>
  );
}
