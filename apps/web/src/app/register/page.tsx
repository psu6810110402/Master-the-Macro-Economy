'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, Lock, User as UserIcon, Loader2, ChevronRight, Terminal as TerminalIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [role, setRole] = useState<'PLAYER' | 'FACILITATOR' | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ access_token: string }>('auth/register', {
        ...formData,
        role,
      });
      localStorage.setItem('supabase_token', response.access_token);
      router.push('/lobby');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      console.error('Registration failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] flex flex-col items-center justify-center p-6 selection:bg-[oklch(var(--accent-brand)/0.3)]">
      {/* Background Grid Polish */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(var(--bg-main)/0.5)] to-[oklch(var(--bg-main))] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl relative z-10"
      >
        {/* Terminal Header */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-3 px-4 py-2 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] rounded-none mb-6"
          >
            <UserPlus size={14} className="text-[oklch(var(--accent-brand))]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Provisioning v2.0</span>
          </motion.div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
            Establish Your <br/>
            <span className="text-[oklch(var(--accent-brand))]">Clearance.</span>
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {!role ? (
            <motion.div 
              key="role-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            >
              {/* Player Role Card */}
              <motion.div
                whileHover={{ y: -5 }}
                onClick={() => setRole('PLAYER')}
                className="cursor-pointer p-8 border-2 border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--accent-brand))] bg-[oklch(var(--bg-secondary)/0.5)] backdrop-blur-sm transition-all group"
              >
                <div className="w-16 h-16 bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] flex items-center justify-center mb-8 group-hover:border-[oklch(var(--accent-brand))] transition-colors">
                  <UserIcon size={32} className="text-[oklch(var(--text-muted))] group-hover:text-[oklch(var(--accent-brand))]" />
                </div>
                <h3 className="text-2xl font-black uppercase italic mb-4 tracking-tight">Active Operative</h3>
                <p className="text-xs text-[oklch(var(--text-muted))] font-medium uppercase tracking-widest leading-relaxed mb-6">
                  Join simulations, execute trades, and compete for market dominance on the global leaderboard.
                </p>
                <ul className="text-[10px] font-black uppercase tracking-widest space-y-2 text-[oklch(var(--text-muted))]">
                  <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[oklch(var(--accent-brand))]" /> Portfolio Access</li>
                  <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[oklch(var(--accent-brand))]" /> Live Trading</li>
                </ul>
              </motion.div>

              {/* Facilitator Role Card */}
              <motion.div
                whileHover={{ y: -5 }}
                onClick={() => setRole('FACILITATOR')}
                className="cursor-pointer p-8 border-2 border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--accent-up))] bg-[oklch(var(--bg-secondary)/0.5)] backdrop-blur-sm transition-all group"
              >
                <div className="w-16 h-16 bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] flex items-center justify-center mb-8 group-hover:border-[oklch(var(--accent-up))] transition-colors">
                  <ShieldCheck size={32} className="text-[oklch(var(--text-muted))] group-hover:text-[oklch(var(--accent-up))]" />
                </div>
                <h3 className="text-2xl font-black uppercase italic mb-4 tracking-tight">Lead Facilitator</h3>
                <p className="text-xs text-[oklch(var(--text-muted))] font-medium uppercase tracking-widest leading-relaxed mb-6">
                  Initialize educational scenarios, manage players, advance rounds, and control market events.
                </p>
                <ul className="text-[10px] font-black uppercase tracking-widest space-y-2 text-[oklch(var(--text-muted))]">
                  <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[oklch(var(--accent-up))]" /> Scenario Command</li>
                  <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[oklch(var(--accent-up))]" /> Market Control</li>
                </ul>
              </motion.div>
            </motion.div>
          ) : (
            <motion.form 
              key="credentials-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRegister} 
              className="space-y-6 bg-[oklch(var(--bg-secondary)/0.5)] p-8 border border-[oklch(var(--border-subtle))] backdrop-blur-sm max-w-md mx-auto relative"
            >
              <button 
                type="button" 
                onClick={() => setRole(null)}
                className="absolute top-4 right-4 text-[10px] uppercase font-black tracking-widest text-[oklch(var(--text-muted))] hover:text-white transition-colors flex items-center gap-1"
              >
                <ChevronRight size={12} className="rotate-180" /> Change Role
              </button>

              <div className="mb-8">
                <div className="text-[10px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-muted))] mb-1">Selected Clearance</div>
                <div className={`text-xl font-black italic tracking-widest uppercase ${role === 'FACILITATOR' ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-brand))]'}`}>
                  {role === 'FACILITATOR' ? 'Lead Facilitator' : 'Active Operative'}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">Alias / Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={16} />
                    <input 
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className={`w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 pl-10 pr-4 text-xs font-bold uppercase tracking-widest outline-none transition-colors ${role === 'FACILITATOR' ? 'focus:border-[oklch(var(--accent-up))]' : 'focus:border-[oklch(var(--accent-brand))]'}`}
                      placeholder="CALLSIGN_88"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">Communication Node (Email)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={16} />
                    <input 
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 pl-10 pr-4 text-xs font-bold uppercase tracking-widest outline-none transition-colors ${role === 'FACILITATOR' ? 'focus:border-[oklch(var(--accent-up))]' : 'focus:border-[oklch(var(--accent-brand))]'}`}
                      placeholder="ACCESS@LEAK.FILE"
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
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className={`w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 pl-10 pr-4 text-xs font-bold uppercase tracking-widest outline-none transition-colors ${role === 'FACILITATOR' ? 'focus:border-[oklch(var(--accent-up))]' : 'focus:border-[oklch(var(--accent-brand))]'}`}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-[oklch(var(--status-error)/0.1)] border border-[oklch(var(--status-error)/0.3)] text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--status-error))]">
                  Error: {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full py-8 text-sm font-black uppercase tracking-[0.2em] text-black hover:bg-white transition-all hov-scale group ${role === 'FACILITATOR' ? 'bg-[oklch(var(--accent-up))]' : 'bg-[oklch(var(--accent-brand))]'}`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirm Identity <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center relative z-20">
          <Link 
            href="/login" 
            className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))] hover:text-white transition-colors"
          >
            Already Have Credentials? <span className="underline italic">Return to Gateway</span>
          </Link>
        </div>

        {/* Security Info */}
        <div className="mt-12 pt-8 border-t border-[oklch(var(--border-subtle))] flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck size={10} className="text-[oklch(var(--status-success))]" />
            <span>ENCRYPTED PROTOCOL</span>
          </div>
          <span>NODE: SG-SIN-01</span>
        </div>
      </motion.div>
    </div>
  );
}
