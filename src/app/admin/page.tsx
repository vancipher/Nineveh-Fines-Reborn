'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageTitle, LoadingState, Spinner } from '@/components/ui';
import { RequireRole } from '@/components/RequireRole';
import { useLang } from '@/components/LangProvider';
import { t } from '@/lib/i18n';

type Tab = 'sectors' | 'violations' | 'users' | 'settings';

interface FailedLoginAttempt {
  id: string;
  identifier: string;
  attemptedAt: string;
}

interface SystemSettings {
  voiceLanguage: string;
  uiLanguage: string;
  defaultTheme: string;
  systemName: string;
  backupAutoEnabled: boolean;
  backupAutoIntervalDays: number;
  backupLastRun: string;
  backupLastFile: string;
  googleConfigured: boolean;
  googleConnected: boolean;
  googleDriveEmail: string;
  failedLoginAttempts?: FailedLoginAttempt[];
}

interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
}

const defaultSettings: SystemSettings = {
  voiceLanguage: 'ar-IQ',
  uiLanguage: 'ar',
  defaultTheme: 'light',
  systemName: '',
  backupAutoEnabled: false,
  backupAutoIntervalDays: 7,
  backupLastRun: '',
  backupLastFile: '',
  googleConfigured: false,
  googleConnected: false,
  googleDriveEmail: '',
};

function AdminPageContent() {
  const { lang } = useLang();
  const [tab, setTab] = useState<Tab>('sectors');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [backupFiles, setBackupFiles] = useState<DriveBackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load(current: Tab) {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/admin?resource=${current === 'settings' ? 'settings' : current}`);
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? t(lang, 'error')));
      setLoading(false);
      return;
    }

    if (current === 'settings') {
      setSettings({ ...defaultSettings, ...data });
      setRows([]);
      const backupRes = await fetch('/api/admin/backup');
      const backupData = await backupRes.json();
      if (backupRes.ok) setBackupFiles(backupData.files ?? []);
    } else {
      setRows(data.rows ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const backupStatus = params.get('backup');
    if (backupStatus === 'connected') {
      setTab('settings');
      setMessage(t(lang, 'googleConnected'));
    } else if (backupStatus === 'error') {
      setTab('settings');
      const code = params.get('msg') ?? '';
      if (code === 'access_denied') {
        setError(t(lang, 'googleTestUserError'));
      } else {
        setError(code || t(lang, 'googleConnectError'));
      }
    }
  }, [lang]);

  async function toggleActive(resource: 'sector' | 'violation' | 'user', id: string, active: boolean) {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource, id, data: { active: !active } }),
    });
    load(tab);
  }

  async function deleteUser(id: string, username: string) {
    const msg =
      lang === 'ar'
        ? `حذف المستخدم "${username}" نهائياً؟ لا يمكن التراجع.`
        : `Permanently delete user "${username}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setError('');
    const res = await fetch(`/api/admin?resource=user&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? t(lang, 'error')));
      return;
    }
    setMessage(lang === 'ar' ? 'تم حذف المستخدم' : 'User deleted');
    load('users');
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'settings', data: settings }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? t(lang, 'error')));
      return;
    }
    setSettings({ ...defaultSettings, ...data });
    setMessage(t(lang, 'saved'));
  }

  async function runBackup() {
    setBackingUp(true);
    setMessage('');
    setError('');
    const res = await fetch('/api/admin/backup', { method: 'POST' });
    const data = await res.json();
    setBackingUp(false);
    if (!res.ok) {
      setError(String(data.error ?? t(lang, 'error')));
      return;
    }
    setMessage(lang === 'ar' ? `تم رفع النسخة إلى Google Drive: ${data.filename}` : `Uploaded to Google Drive: ${data.filename}`);
    load('settings');
  }

  async function connectGoogle() {
    setConnectingGoogle(true);
    setError('');
    const res = await fetch('/api/admin/backup/google');
    const data = await res.json();
    setConnectingGoogle(false);
    if (!res.ok || !data.url) {
      setError(String(data.error ?? t(lang, 'error')));
      return;
    }
    window.location.href = data.url;
  }

  async function disconnectGoogle() {
    setError('');
    const res = await fetch('/api/admin/backup', { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(String(data.error ?? t(lang, 'error')));
      return;
    }
    setMessage(t(lang, 'googleDisconnected'));
    load('settings');
  }

  async function addSector(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource: 'sector',
        data: {
          nameAr: String(fd.get('nameAr')),
          nameEn: String(fd.get('nameEn')),
          active: true,
        },
      }),
    });
    e.currentTarget.reset();
    load('sectors');
  }

  async function addViolation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource: 'violation',
        data: {
          indexNum: Number(fd.get('indexNum')),
          nameAr: String(fd.get('nameAr')),
          nameEn: String(fd.get('nameEn')),
          sortOrder: Number(fd.get('indexNum')),
          active: true,
        },
      }),
    });
    e.currentTarget.reset();
    load('violations');
  }

  async function addUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource: 'user',
        data: {
          email: String(fd.get('email')),
          username: String(fd.get('username')),
          password: String(fd.get('password')),
          role: String(fd.get('role')),
          active: true,
        },
      }),
    });
    e.currentTarget.reset();
    load('users');
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'sectors', label: t(lang, 'sectors') },
    { id: 'violations', label: t(lang, 'violations') },
    { id: 'users', label: t(lang, 'users') },
    { id: 'settings', label: t(lang, 'settings') },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title={t(lang, 'admin')} />

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : tab === 'settings' ? (
        <form className="space-y-4" onSubmit={saveSettings}>
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t(lang, 'generalSettings')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{t(lang, 'systemName')}</label>
                <input
                  className="input"
                  value={settings.systemName}
                  onChange={(e) => setSettings((s) => ({ ...s, systemName: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{t(lang, 'defaultTheme')}</label>
                <select
                  className="input"
                  value={settings.defaultTheme}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultTheme: e.target.value }))}
                >
                  <option value="light">{lang === 'ar' ? 'فاتح' : 'Light'}</option>
                  <option value="dark">{lang === 'ar' ? 'داكن' : 'Dark'}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{t(lang, 'voiceLanguage')}</label>
                <select
                  className="input"
                  value={settings.voiceLanguage}
                  onChange={(e) => setSettings((s) => ({ ...s, voiceLanguage: e.target.value }))}
                >
                  <option value="ar-IQ">Arabic (Iraq)</option>
                  <option value="ar-SA">Arabic (Saudi)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{t(lang, 'uiLanguageDefault')}</label>
                <select
                  className="input"
                  value={settings.uiLanguage}
                  onChange={(e) => setSettings((s) => ({ ...s, uiLanguage: e.target.value }))}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t(lang, 'backupSettings')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'backupHint')}</p>

            {!settings.googleConfigured && (
              <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <p>{t(lang, 'googleSetupHint')}</p>
                <p className="whitespace-pre-wrap opacity-90">{t(lang, 'googleSetupSteps')}</p>
                <p className="whitespace-pre-wrap opacity-90">{t(lang, 'googleTestUserHint')}</p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              {settings.googleConnected ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {t(lang, 'googleConnectedAs')}: <span className="font-semibold">{settings.googleDriveEmail}</span>
                  </p>
                  <button type="button" className="btn-secondary" onClick={disconnectGoogle}>
                    {t(lang, 'disconnectGoogle')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-primary gap-2"
                  onClick={connectGoogle}
                  disabled={connectingGoogle || !settings.googleConfigured}
                >
                  {connectingGoogle && <Spinner size="sm" />}
                  {t(lang, 'connectGoogle')}
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.backupAutoEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, backupAutoEnabled: e.target.checked }))}
                  disabled={!settings.googleConnected}
                />
                {t(lang, 'backupAuto')}
              </label>
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{t(lang, 'backupInterval')}</label>
                <select
                  className="input"
                  value={settings.backupAutoIntervalDays}
                  onChange={(e) => setSettings((s) => ({ ...s, backupAutoIntervalDays: Number(e.target.value) }))}
                  disabled={!settings.backupAutoEnabled || !settings.googleConnected}
                >
                  <option value={7}>{lang === 'ar' ? 'كل أسبوع' : 'Every week'}</option>
                  <option value={14}>{lang === 'ar' ? 'كل أسبوعين' : 'Every 2 weeks'}</option>
                  <option value={30}>{lang === 'ar' ? 'كل شهر' : 'Every month'}</option>
                </select>
              </div>
            </div>
            {settings.backupLastRun && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(lang, 'backupLastRun')}: {new Date(settings.backupLastRun).toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-US')}
                {settings.backupLastFile ? ` — ${settings.backupLastFile}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary">
                {t(lang, 'save')}
              </button>
              <button
                type="button"
                className="btn-secondary gap-2"
                onClick={runBackup}
                disabled={backingUp || !settings.googleConnected}
              >
                {backingUp && <Spinner size="sm" />}
                {t(lang, 'backupNow')}
              </button>
            </div>
            {backupFiles.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">{t(lang, 'recentBackups')}</p>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-slate-500 dark:text-slate-400">
                  {backupFiles.map((file) => (
                    <li key={file.id}>
                      {file.name}
                      <span className="ms-2 opacity-70">
                        {new Date(file.createdTime).toLocaleDateString(lang === 'ar' ? 'ar-IQ' : 'en-US')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {lang === 'ar' ? 'سجل محاولات الدخول الفاشلة' : 'Failed login audit log'}
            </h2>
            {(settings.failedLoginAttempts?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'لا توجد محاولات فاشلة مسجّلة.' : 'No failed attempts recorded.'}
              </p>
            ) : (
              <div className="table-scroll max-h-48">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-start dark:border-slate-700">
                      <th className="px-2 py-2">{lang === 'ar' ? 'المستخدم' : 'Identifier'}</th>
                      <th className="px-2 py-2">{lang === 'ar' ? 'الوقت' : 'Time'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.failedLoginAttempts?.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700/50">
                        <td className="px-2 py-2 font-mono">{row.identifier}</td>
                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400">
                          {new Date(row.attemptedAt).toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </form>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start dark:border-slate-700">
                  {tab === 'sectors' && (
                    <>
                      <th className="px-2 py-2">{t(lang, 'sector')}</th>
                      <th className="px-2 py-2">{lang === 'ar' ? 'الاسم (EN)' : 'Name (EN)'}</th>
                    </>
                  )}
                  {tab === 'violations' && (
                    <>
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">{t(lang, 'violation')}</th>
                    </>
                  )}
                  {tab === 'users' && (
                    <>
                      <th className="px-2 py-2">{t(lang, 'username')}</th>
                      <th className="px-2 py-2">{t(lang, 'email')}</th>
                      <th className="px-2 py-2">role</th>
                    </>
                  )}
                  <th className="px-2 py-2">{t(lang, 'active')}</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)} className="border-t border-slate-100 dark:border-slate-700/50">
                    {tab === 'sectors' && (
                      <>
                        <td className="px-2 py-2">{lang === 'ar' ? String(row.nameAr) : String(row.nameEn)}</td>
                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{String(row.nameEn)}</td>
                      </>
                    )}
                    {tab === 'violations' && (
                      <>
                        <td className="px-2 py-2">{String(row.indexNum)}</td>
                        <td className="max-w-md truncate px-2 py-2">{lang === 'ar' ? String(row.nameAr) : String(row.nameEn)}</td>
                      </>
                    )}
                    {tab === 'users' && (
                      <>
                        <td className="px-2 py-2">{String(row.username)}</td>
                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{String(row.email)}</td>
                        <td className="px-2 py-2">{String(row.role)}</td>
                      </>
                    )}
                    <td className="px-2 py-2">{row.active ? t(lang, 'active') : t(lang, 'inactive')}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {tab === 'users' && String(row.role) === 'superadmin' ? (
                          <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                            {lang === 'ar' ? 'محمي' : 'Protected'}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-secondary px-2 py-1 text-xs"
                              onClick={() =>
                                toggleActive(
                                  tab === 'sectors' ? 'sector' : tab === 'violations' ? 'violation' : 'user',
                                  String(row.id),
                                  Boolean(row.active),
                                )
                              }
                            >
                              {row.active ? t(lang, 'disable') : t(lang, 'enable')}
                            </button>
                            {tab === 'users' && (
                              <button
                                type="button"
                                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                onClick={() => deleteUser(String(row.id), String(row.username))}
                              >
                                {lang === 'ar' ? 'حذف' : 'Delete'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tab === 'sectors' && (
            <form className="card space-y-3" onSubmit={addSector}>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t(lang, 'addSectorSimple')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" name="nameAr" placeholder={lang === 'ar' ? 'اسم القاطع بالعربية' : 'Sector name (Arabic)'} required />
                <input className="input" name="nameEn" placeholder={lang === 'ar' ? 'اسم القاطع بالإنجليزية' : 'Sector name (English)'} required />
              </div>
              <button type="submit" className="btn-primary">
                {t(lang, 'add')} {t(lang, 'sectors')}
              </button>
            </form>
          )}

          {tab === 'violations' && (
            <form className="card grid gap-3" onSubmit={addViolation}>
              <input className="input" name="indexNum" type="number" placeholder="#" required />
              <input className="input" name="nameAr" placeholder="الاسم بالعربية" required />
              <input className="input" name="nameEn" placeholder="English name" required />
              <button type="submit" className="btn-primary">
                {t(lang, 'add')} {t(lang, 'violations')}
              </button>
            </form>
          )}

          {tab === 'users' && (
            <form className="card space-y-3" onSubmit={addUser}>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add new user'}
              </p>
              <input className="input" name="username" placeholder={t(lang, 'username')} required />
              <input className="input" name="email" type="email" placeholder={t(lang, 'email')} required />
              <input className="input" name="password" type="password" placeholder={t(lang, 'password')} required />
              <select className="input" name="role" defaultValue="operator">
                <option value="admin">{t(lang, 'roleAdmin')}</option>
                <option value="operator">{t(lang, 'roleOperator')}</option>
                <option value="viewer">{t(lang, 'roleViewer')}</option>
              </select>
              <button type="submit" className="btn-primary w-full">
                {t(lang, 'add')} {t(lang, 'users')}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireRole allow={['admin', 'superadmin']}>
      <AdminPageContent />
    </RequireRole>
  );
}
