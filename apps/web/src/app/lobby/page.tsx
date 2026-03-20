'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  Shield, 
  User, 
  LogIn,
  Key,
  Globe2,
  Lock,
  Loader2
} from 'lucide-react';
import { Button } from '@hackanomics/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LobbyPage() {
  const [role, setRole] = useState<'PLAYER' | 'FACILITATOR' | null>(null);
  const [sessionCode, setSessionCode] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [scenarioId, setScenarioId] = useState('TECH_CRISIS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Auth guard — redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem('hackanomics_token');
    if (!token) {
      router.push('/login?redirect=/lobby');
    }
  }, [router]);

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCode) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const session = await api.post<{ sessionId: string; name: string }>(`session/join`, {
        code: sessionCode.toUpperCase(),
      });
      
      localStorage.setItem('current_session_id', session.sessionId);
      localStorage.setItem('session_role', 'PLAYER');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to join session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName) return;

    setIsProcessing(true);
    setError(null);
    try {
      const session = await api.post<{ id: string; code: string }>(`session/create`, {
        name: sessionName,
        maxPlayers: 50,
        scenarioId,
      });
      
      localStorage.setItem('current_session_id', session.id);
      localStorage.setItem('session_role', 'FACILITATOR');
      router.push('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create session');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout title="Universal Lobby">
      <div className="max-w-4xl mx-auto py-12">
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-4 py-2 bg-[oklch(var(--accent-brand)/0.1)] border border-[oklch(var(--accent-brand)/0.2)] mb-8"
          >
            <Globe2 size={16} className="text-[oklch(var(--accent-brand))]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--accent-brand))]">Global Tactical Network</span>
          </motion.div>
          <h1 className="text-5xl font-black font-display tracking-tighter uppercase italic mb-4">
            Select Your <span className="text-[oklch(var(--accent-brand))]">Objective.</span>
          </h1>
          <p className="text-[oklch(var(--text-muted))] max-w-lg mx-auto uppercase text-[10px] font-bold tracking-widest leading-relaxed">
            Enter an active simulation as a strategy operative or 
            initialize a new theatre of operations as a lead facilitator.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Join Role */}
          <motion.div
            whileHover={{ y: -5 }}
            className={`cursor-pointer p-8 border-2 transition-all group ${
              role === 'PLAYER' 
                ? 'border-[oklch(var(--accent-brand))] bg-[oklch(var(--bg-secondary))]' 
                : 'border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--text-muted))] bg-transparent'
            }`}
            onClick={() => setRole('PLAYER')}
          >
            <div className="w-16 h-16 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] flex items-center justify-center mb-8 group-hover:border-[oklch(var(--accent-brand))] transition-colors">
              <User size={32} className="text-[oklch(var(--text-muted))] group-hover:text-[oklch(var(--accent-brand))]" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-4 tracking-tight">Active Operative</h3>
            <p className="text-xs text-[oklch(var(--text-muted))] font-medium uppercase tracking-widest leading-relaxed mb-8">
              Join an existing session and compete for market dominance. Requires a 6-digit access code.
            </p>
            <AnimatePresence>
              {role === 'PLAYER' && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleJoinSession}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={16} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Simulation Code (e.g. HCK8x2)"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 pl-10 pr-4 text-sm font-black uppercase tracking-[0.2em] focus:border-[oklch(var(--accent-brand))] outline-none transition-all placeholder:opacity-30"
                      maxLength={10}
                    />
                  </div>
                  <Button 
                    disabled={isProcessing || !sessionCode}
                    className="w-full h-14 bg-[oklch(var(--accent-brand))] text-black font-black uppercase tracking-[0.2em] italic text-xs hov-scale"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : 'Enter Theatre'}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Create Role */}
          <motion.div
            whileHover={{ y: -5 }}
            className={`cursor-pointer p-8 border-2 transition-all group ${
              role === 'FACILITATOR' 
                ? 'border-[oklch(var(--accent-up))] bg-[oklch(var(--bg-secondary))]' 
                : 'border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--text-muted))] bg-transparent'
            }`}
            onClick={() => setRole('FACILITATOR')}
          >
            <div className="w-16 h-16 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] flex items-center justify-center mb-8 group-hover:border-[oklch(var(--accent-up))] transition-colors">
              <Shield size={32} className="text-[oklch(var(--text-muted))] group-hover:text-[oklch(var(--accent-up))]" />
            </div>
            <h3 className="text-xl font-black uppercase italic mb-4 tracking-tight">Lead Facilitator</h3>
            <p className="text-xs text-[oklch(var(--text-muted))] font-medium uppercase tracking-widest leading-relaxed mb-8">
              Initialize a new simulation environment. Manage users, rounds, and market events.
            </p>
            <AnimatePresence>
              {role === 'FACILITATOR' && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateSession}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={16} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Scenario Name (e.g. Q4 Crisis)"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 pl-10 pr-4 text-sm font-black uppercase tracking-[0.2em] focus:border-[oklch(var(--accent-up))] outline-none transition-all placeholder:opacity-30"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={scenarioId}
                      onChange={(e) => setScenarioId(e.target.value)}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-4 px-4 text-sm font-black uppercase tracking-[0.2em] focus:border-[oklch(var(--accent-up))] outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="TECH_CRISIS">The Tech Bubble Crisis</option>
                      <option value="GLOBAL_CONFLICT">Geopolitical Meltdown</option>
                      <option value="CRYPTO_WINTER">The Great Crypto Winter</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[oklch(var(--text-muted))]">
                      ▼
                    </div>
                  </div>
                  <Button 
                    disabled={isProcessing || !sessionName}
                    className="w-full h-14 bg-[oklch(var(--accent-up))] text-black font-black uppercase tracking-[0.2em] italic text-xs hov-scale"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : 'Initialize Sequence'}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-[oklch(var(--accent-down)/0.1)] border border-[oklch(var(--accent-down)/0.3)] text-[oklch(var(--accent-down))] text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
          >
            <Lock size={14} />
            {error}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
