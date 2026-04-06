'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, TrendingUp, BarChart3, Shield } from 'lucide-react';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';
import { Suspense } from 'react';
import { EASE_SPRING } from '@/lib/motion';

// ─── MARKET SIDEBAR DATA ────────────────────────────────────────────────────

const MARKET_STATS = [
  { label: 'TECH', value: '+12.4%', up: true },
  { label: 'BOND', value: '-2.1%',  up: false },
  { label: 'GOLD', value: '+5.8%',  up: true },
  { label: 'CRYPTO', value: '+31.2%', up: true },
  { label: 'REAL ESTATE', value: '-0.9%', up: false },
];

const SESSION_STATS = [
  { label: 'Asset Classes', value: '7' },
  { label: 'Rounds per Game', value: '5' },
  { label: 'AI Grading', value: 'Gemini' },
];

// ─── LOGIN FORM ──────────────────────────────────────────────────────────────

function LoginContent() {
  const { setRole } = useSession();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/lobby';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post<{ access_token: string }>('auth/login', {
        email: formData.email,
        password: formData.password,
      });
      try {
        const user = await api.get<{ role: string }>('auth/me');
        setRole((user.role as 'PLAYER' | 'FACILITATOR' | 'ADMIN') || 'PLAYER');
        if (user.role === 'ADMIN') router.push('/admin');
        else if (user.role === 'FACILITATOR') router.push('/facilitator');
        else router.push(redirectTo);
      } catch {
        setRole('PLAYER');
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      await api.post<{ access_token: string }>('auth/guest', { role: 'PLAYER' });
      setRole('PLAYER');
      router.push(redirectTo);
    } catch (err) {
      console.error('Guest login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] flex">

      {/* ── LEFT PANEL: Market Context ── */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: EASE_SPRING }}
        className="hidden lg:flex flex-col w-[420px] shrink-0 border-r border-[oklch(var(--border-subtle))] p-12 bg-[oklch(var(--bg-secondary)/0.4)]"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-16">
          <div className="w-8 h-8 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-sm italic text-black">
            H
          </div>
          <span className="font-black text-sm tracking-[0.2em] uppercase">Hackanomics</span>
        </div>

        {/* Live Market Strip */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-[oklch(var(--accent-brand))]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">Live Simulation Prices</span>
          </div>
          <div className="space-y-1">
            {MARKET_STATS.map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-[oklch(var(--border-subtle)/0.5)]">
                <span className="text-sm font-bold tracking-wider text-[oklch(var(--text-secondary))]">{s.label}</span>
                <span className={`text-sm font-black tabular-nums ${s.up ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Session Stats */}
        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-[oklch(var(--text-muted))]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">Platform</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SESSION_STATS.map((s) => (
              <div key={s.label} className="p-3 border border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-main)/0.6)]">
                <div className="text-lg font-black tabular-nums text-[oklch(var(--text-primary))]">{s.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>

      {/* ── RIGHT PANEL: Sign In Form ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_SPRING, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-sm italic text-black">H</div>
            <span className="font-black text-sm tracking-[0.2em] uppercase">Hackanomics</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight leading-tight mb-2">Sign In</h1>
            <p className="text-[oklch(var(--text-muted))] text-sm">
              Access your trading account to join a live session.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={15} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] py-3 pl-9 pr-4 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.5)]"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={15} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] py-3 pl-9 pr-4 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.5)]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[oklch(var(--accent-down)/0.08)] border border-[oklch(var(--accent-down)/0.3)] text-[oklch(var(--accent-down))] text-xs font-medium"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[oklch(var(--accent-brand))] text-black font-black uppercase tracking-[0.15em] text-xs hover:opacity-90 transition-opacity hov-scale flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight size={14} /></>}
            </Button>

            {/* Divider */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="h-px bg-[oklch(var(--border-subtle))] flex-1" />
              <span className="text-[11px] font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest">or</span>
              <div className="h-px bg-[oklch(var(--border-subtle))] flex-1" />
            </div>

            {/* Guest */}
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full h-10 border border-[oklch(var(--border-subtle))] text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-secondary))] hover:border-[oklch(var(--border-strong))] hover:bg-[oklch(var(--bg-secondary)/0.5)] transition-all"
            >
              Continue as Guest
            </button>
          </form>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-[oklch(var(--text-muted))]">
            No account?{' '}
            <Link href="/register" className="text-[oklch(var(--accent-brand))] font-bold hover:underline">
              Create one
            </Link>
          </p>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-[oklch(var(--border-subtle))] flex items-center justify-between text-[10px] uppercase tracking-widest text-[oklch(var(--text-muted)/0.5)] font-bold">
            <span className="flex items-center gap-1.5"><Shield size={10} /> Encrypted</span>
            <span>Hackanomics 2026</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[oklch(var(--bg-main))] flex items-center justify-center">
        <Loader2 className="animate-spin text-[oklch(var(--accent-brand))]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
