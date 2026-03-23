'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, User, Play, Loader2, ChevronRight, Terminal as TerminalIcon, Mail } from 'lucide-react';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { useSession } from '@/context/SessionContext';

function LoginContent() {
  const { setRole } = useSession();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootSequence, setBootSequence] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/lobby';

  useEffect(() => {
    const timer = setInterval(() => {
      setBootSequence(prev => (prev < 5 ? prev + 1 : prev));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post<{ access_token: string }>('auth/login', {
        email: formData.email,
        password: formData.password,
      });

      // Determine the user's role by asking the backend (which auto-provisions if missed)
      try {
        const user = await api.get<{ role: string }>('auth/me');
        setRole((user.role as 'PLAYER' | 'FACILITATOR' | 'ADMIN') || 'PLAYER');
        
        if (user.role === 'ADMIN') router.push('/admin');
        else if (user.role === 'FACILITATOR') router.push('/facilitator');
        else router.push(redirectTo);
      } catch (err) {
        // Fallback
        console.warn('Could not fetch exact role from API, redirecting to lobby');
        setRole('PLAYER');
        router.push(redirectTo);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Access Denied.');
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      await api.post<{ access_token: string }>('auth/guest', {
        role: 'PLAYER'
      });

      setRole('PLAYER');

      router.push(redirectTo);
    } catch (err) {
      console.error('Guest login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] flex flex-col items-center justify-center p-6 selection:bg-[oklch(var(--accent-brand)/0.3)]">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(var(--bg-main)/0.5)] to-[oklch(var(--bg-main))] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="mb-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-3 px-4 py-2 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] rounded-none mb-6"
          >
            <TerminalIcon size={14} className="text-[oklch(var(--accent-brand))]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Gateway v1.0</span>
          </motion.div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
            Establish <br/>
            <span className="text-[oklch(var(--accent-brand))]">Credentials.</span>
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 bg-[oklch(var(--bg-secondary)/0.5)] p-8 border border-[oklch(var(--border-subtle))] backdrop-blur-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">Node Identity (Email)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={16} />
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:border-[oklch(var(--accent-brand))] outline-none transition-colors"
                  placeholder="USER@HACKANOMICS.DEV"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">Access Key (Password)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={16} />
                <input 
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:border-[oklch(var(--accent-brand))] outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-[oklch(var(--status-error)/0.1)] border border-[oklch(var(--status-error)/0.3)] text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--status-error))]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-8 text-sm font-black uppercase tracking-[0.2em] bg-[oklch(var(--text-primary))] text-black hover:bg-white transition-all hov-scale group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verify Credentials <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <div className="relative flex items-center gap-4 py-2">
              <div className="h-px bg-[oklch(var(--border-subtle))] flex-1" />
              <span className="text-[8px] font-black text-[oklch(var(--text-muted))] uppercase tracking-widest">or</span>
              <div className="h-px bg-[oklch(var(--border-subtle))] flex-1" />
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] border border-[oklch(var(--border-subtle))] hover:bg-[oklch(var(--bg-secondary))] transition-colors"
            >
              Enter as Guest (Demo)
            </button>
          </div>
        </form>

        <div className="mt-8 text-center flex flex-col gap-2">
          <Link 
            href="/register" 
            className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--accent-brand))] hover:underline italic"
          >
            Don't have an identity? Provision New Account
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-[oklch(var(--border-subtle))] flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))]">
          <span>RSA 4096-BIT ENCRYPTION</span>
          <span>ESTABLISHING PEER CONNECTION</span>
        </div>
      </motion.div>
    </div>
  );
}

import { Suspense } from 'react';

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

