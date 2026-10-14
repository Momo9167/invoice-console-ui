'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm({ lang, company }: { lang: Lang; company: string }) {
  const t = (s: string) => translate(lang, s);
  const next = useSearchParams().get('next') || '/';
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr('');
        const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pw }) });
        if (r.ok) { location.href = next.startsWith('/') && !next.startsWith('//') ? next : '/'; return; }
        setErr(t((await r.json().catch(() => ({}))).error || 'Wrong username or password')); setBusy(false);
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" />
        <h1>{company}</h1>
        <label className="f" style={{ textAlign: 'left' }}>{t('Username')}
          <Input autoFocus autoCapitalize="none" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} />
        </label>
        <label className="f" style={{ textAlign: 'left', marginTop: 10 }}>{t('Password')}
          <Input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <Button style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} disabled={busy || !pw || !user}>{t('Sign in')}</Button>
        <div className="err">{err}</div>
      </form>
    </div>
  );
}
