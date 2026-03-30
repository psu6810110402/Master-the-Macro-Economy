'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Mail, Lock, User as UserIcon, Loader2,
  ArrowRight, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

const ROLE_OPTIONS = [
  {
    id: 'PLAYER' as const,
    label: 'Player',
    sublabel: 'Compete in simulations',
    description: 'Join live sessions, allocate capital across asset classes, and climb the leaderboard. Perfect for students and participants.',
    perks: ['Access portfolio dashboard', 'Live trading interface', 'AI performance feedback'],
    accent: 'var(--accent-brand)',
  },
  {
    id: 'FACILITATOR' as const,
    label: 'Facilitator',
    sublabel: 'Run a session',
    description: 'Create and manage simulation sessions. Control market events, advance rounds, and monitor all players in real time.',
    perks: ['Create & manage sessions', 'Trigger market events', 'Player analytics'],
    accent: 'var(--accent-up)',
  },
];

export default function RegisterPage() {
  const { setRole: setContextRole } = useSession();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<'PLAYER' | 'FACILITATOR' | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSelectRole = (r: 'PLAYER' | 'FACILITATOR') => {
    setRole(r);
    setStep('details');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post<{ access_token: string }>('auth/register', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: role || 'PLAYER',
      });
      setContextRole(role || 'PLAYER');
      router.push('/lobby');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOption = ROLE_OPTIONS.find(r => r.id === role);

  return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] flex flex-col items-center justify-center px-6 py-12">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 mb-12"
      >
        <div className="w-8 h-8 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-sm italic text-black">H</div>
        <span className="font-black text-sm tracking-[0.2em] uppercase">Hackanomics</span>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Role Selection ── */}
        {step === 'role' && (
          <motion.div
            key="role"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl"
          >
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-black tracking-tight leading-tight mb-2">Create Account</h1>
              <p className="text-[oklch(var(--text-muted))] text-sm">
                Choose your role to get started.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ROLE_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectRole(option.id)}
                  className="text-left p-6 border border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary)/0.4)] hover:border-[oklch(option.accent)] hover:bg-[oklch(var(--bg-secondary)/0.7)] transition-all group"
                  style={{ '--hover-accent': `oklch(${option.accent})` } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-lg font-black tracking-tight">{option.label}</div>
                      <div className="text-xs font-bold text-[oklch(var(--text-muted))] mt-0.5">{option.sublabel}</div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-[oklch(var(--text-muted))] group-hover:translate-x-1 transition-transform mt-1"
                      style={{ color: `oklch(${option.accent})` }}
                    />
                  </div>
                  <p className="text-sm text-[oklch(var(--text-secondary))] leading-relaxed mb-4">
                    {option.description}
                  </p>
                  <ul className="space-y-1.5">
                    {option.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2 text-xs text-[oklch(var(--text-muted))] font-medium">
                        <div className="w-1 h-1 rounded-full" style={{ background: `oklch(${option.accent})` }} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </motion.button>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-[oklch(var(--text-muted))]">
              Already have an account?{' '}
              <Link href="/login" className="text-[oklch(var(--accent-brand))] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        )}

        {/* ── STEP 2: Account Details ── */}
        {step === 'details' && selectedOption && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >
            {/* Step header */}
            <div className="mb-8">
              <button
                onClick={() => setStep('role')}
                className="flex items-center gap-1.5 text-xs font-bold text-[oklch(var(--text-muted))] hover:text-[oklch(var(--text-primary))] transition-colors mb-5"
              >
                <ArrowLeft size={13} /> Back
              </button>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-black tracking-tight">Your Details</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[oklch(var(--text-muted))]">Registering as</span>
                <span
                  className="text-sm font-black uppercase tracking-widest"
                  style={{ color: `oklch(${selectedOption.accent})` }}
                >
                  {selectedOption.label}
                </span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">
                    First Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={14} />
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] py-3 pl-8 pr-3 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.4)]"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] py-3 px-3 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.4)] mt-[26px]"
                    placeholder="Doe"
                  />
                </div>
              </div>

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
                    className="w-full bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] py-3 pl-9 pr-4 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.4)]"
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
                    minLength={8}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] py-3 pl-9 pr-4 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.4)]"
                    placeholder="Minimum 8 characters"
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
                className="w-full h-11 font-black uppercase tracking-[0.15em] text-xs text-black hover:opacity-90 transition-opacity hov-scale flex items-center justify-center gap-2"
                style={{ backgroundColor: `oklch(${selectedOption.accent})` }}
              >
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><UserPlus size={14} /> Create Account</>
                }
              </Button>
            </form>

            {/* Security note */}
            <div className="mt-8 pt-5 border-t border-[oklch(var(--border-subtle))] flex items-center justify-between text-[10px] uppercase tracking-widest text-[oklch(var(--text-muted)/0.5)] font-bold">
              <span className="flex items-center gap-1.5"><ShieldCheck size={10} /> Encrypted</span>
              <span>Hackanomics 2026</span>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
