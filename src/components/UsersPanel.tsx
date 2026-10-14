'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { UserDTO } from '@/lib/types';
import { useApp } from './AppContext';

// Everyone has the same access; this just manages who can log in.
export function UsersPanel() {
  const { t, toast, me } = useApp();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [err, setErr] = useState('');
  const load = () => api<UserDTO[]>('/api/users').then(setUsers);
  useEffect(() => { load(); }, []);

  async function add() {
    setErr('');
    try {
      await api('/api/users', { method: 'POST', body: form });
      toast(t('{name} can now log in', { name: form.name }));
      setForm({ name: '', username: '', password: '' }); load();
    } catch (e) { setErr(t((e as Error).message)); }
  }
  async function update(u: UserDTO, body: Record<string, unknown>, msg: string) {
    try { await api(`/api/users/${u.id}`, { method: 'PUT', body }); toast(msg); load(); }
    catch (e) { toast(t((e as Error).message)); }
  }

  return (
    <div className="section">
      <h3>{t('Users')}</h3>
      <div className="user-list">
        {users.map((u) => (
          <div key={u.id} className={`user-row${u.active ? '' : ' off'}`}>
            <div className="meta"><b>{u.name}{u.id === me?.id && <span className="badge st-paid" style={{ marginLeft: 6 }}>{t('you')}</span>}</b><span>@{u.username}{!u.active && ` · ${t('Inactive')}`}</span></div>
            <button className="btn" onClick={() => {
              const pw = prompt(t('New password for {name} (at least 6 characters):', { name: u.name }));
              if (pw) update(u, { password: pw }, t('Password changed'));
            }}>{t('Reset password')}</button>
            {u.id !== me?.id && (
              <button className="btn" onClick={() => update(u, { active: !u.active }, t(u.active ? '{name} deactivated' : '{name} activated', { name: u.name }))}>
                {t(u.active ? 'Deactivate' : 'Activate')}
              </button>
            )}
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 16 }}>{t('Add user')}</h3>
      <div className="grid2">
        <label className="f">{t('Name')}<input className="i" value={form.name} placeholder={t('e.g. Uncle')} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="f">{t('Username')}<input className="i" autoCapitalize="none" value={form.username} placeholder="e.g. uncle" onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} /></label>
      </div>
      <label className="f" style={{ marginTop: 10 }}>{t('Password')}<input className="i" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <button className="btn dark" onClick={add} disabled={!form.name || !form.username || !form.password}>{t('Add user')}</button>
        <span style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</span>
      </div>
    </div>
  );
}
