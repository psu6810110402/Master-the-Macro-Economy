'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Key, Globe2, Lock, Loader2, BookOpen, ArrowRight, ChevronDown
} from 'lucide-react';
import { Button } from '@hackanomics/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';

const SCENARIOS = [
  { value: 'TECH_CRISIS',     label: 'Tech Bubble Crisis',     desc: 'High-growth tech assets collapse under rising rates.' },
  { value: 'GLOBAL_CONFLICT', label: 'Geopolitical Meltdown',  desc: 'War-driven commodity shocks and safe-haven flows.' },
  { value: 'CRYPTO_WINTER',   label: 'Great Crypto Winter',    desc: 'Digital asset implosion and contagion across risk assets.' },
];

const FORMATS = [
  { value: 'SHORT',    label: 'Short',    rounds: 3 },
  { value: 'STANDARD', label: 'Standard', rounds: 5 },
  { value: 'FULL',     label: 'Full',     rounds: 7 },
];

export default function LobbyPage() {
  const { setSessionId, setRole: setContextRole, isInitialized } = useSession();
  const [mode, setMode] = useState<'JOIN' | 'CREATE' | null>(null);
  const [sessionCode, setSessionCode] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [scenarioId, setScenarioId] = useState('TECH_CRISIS');
  const [format, setFormat] = useState('STANDARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    api.get('auth/me').catch(() => router.push('/login?redirect=/lobby'));
  }, [router, isInitialized]);

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCode) return;
    setIsProcessing(true);
    setError(null);
    try {
      const session = await api.post<{ sessionId: string; name: string }>('session/join', {
        code: sessionCode.toUpperCase(),
      });
      setSessionId(session.sessionId);
      setContextRole('PLAYER');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not join session. Check the code and try again.');
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
      const session = await api.post<{ id: string; code: string }>('session/create', {
        name: sessionName,
        maxPlayers: 50,
        scenarioId,
        format,
      });
      setSessionId(session.id);
      setContextRole('FACILITATOR');
      router.push('/facilitator');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create session. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isInitialized) return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] flex flex-col items-center justify-center text-[oklch(var(--text-muted))] gap-4">
      <div className="w-8 h-8 border-t-2 border-[oklch(var(--accent-brand))] animate-spin rounded-full" />
      <span className="text-xs font-bold uppercase tracking-widest">Loading…</span>
    </div>
  );

  return (
    <DashboardLayout title="Lobby">
      <div className="max-w-3xl mx-auto py-10 px-2">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Globe2 size={16} className="text-[oklch(var(--accent-brand))]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">Session Hub</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-tight">
            What do you want to do?
          </h1>
          <p className="text-sm text-[oklch(var(--text-muted))] mt-2">
            Join an existing session with a code, or create a new one as a facilitator.
          </p>
        </header>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          {/* JOIN */}
          <motion.div
            onClick={() => setMode(mode === 'JOIN' ? null : 'JOIN')}
            whileHover={{ y: -2 }}
            className={`cursor-pointer border transition-all ${
              mode === 'JOIN'
                ? 'border-[oklch(var(--accent-brand))] bg-[oklch(var(--accent-brand)/0.05)]'
                : 'border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--border-strong))] bg-[oklch(var(--bg-secondary)/0.3)]'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 border flex items-center justify-center transition-colors ${
                    mode === 'JOIN' ? 'border-[oklch(var(--accent-brand))]' : 'border-[oklch(var(--border-subtle))]'
                  }`}>
                    <Users size={20} className={mode === 'JOIN' ? 'text-[oklch(var(--accent-brand))]' : 'text-[oklch(var(--text-muted))]'} />
                  </div>
                  <div>
                    <div className="font-black text-base leading-tight">Join Session</div>
                    <div className="text-xs text-[oklch(var(--text-muted))] font-medium mt-0.5">Play as a trader</div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-[oklch(var(--text-muted))] transition-transform ${mode === 'JOIN' ? 'rotate-180' : ''}`}
                />
              </div>
              <p className="text-sm text-[oklch(var(--text-secondary))] leading-relaxed">
                Enter a session code from your facilitator to join an active simulation.
              </p>
            </div>

            {/* Join Form */}
            <AnimatePresence>
              {mode === 'JOIN' && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleJoinSession}
                  className="px-6 pb-6 space-y-3 overflow-hidden"
                >
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={14} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Session code (e.g. HCK8X2)"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-3 pl-9 pr-4 text-sm font-bold uppercase tracking-widest focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-[oklch(var(--text-muted)/0.5)] placeholder:normal-case"
                      maxLength={10}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isProcessing || !sessionCode}
                    className="w-full h-10 bg-[oklch(var(--accent-brand))] text-black font-black uppercase tracking-widest text-xs hov-scale flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <>Join <ArrowRight size={14} /></>}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* CREATE */}
          <motion.div
            onClick={() => setMode(mode === 'CREATE' ? null : 'CREATE')}
            whileHover={{ y: -2 }}
            className={`cursor-pointer border transition-all ${
              mode === 'CREATE'
                ? 'border-[oklch(var(--accent-up))] bg-[oklch(var(--accent-up)/0.04)]'
                : 'border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--border-strong))] bg-[oklch(var(--bg-secondary)/0.3)]'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 border flex items-center justify-center transition-colors ${
                    mode === 'CREATE' ? 'border-[oklch(var(--accent-up))]' : 'border-[oklch(var(--border-subtle))]'
                  }`}>
                    <Plus size={20} className={mode === 'CREATE' ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--text-muted))]'} />
                  </div>
                  <div>
                    <div className="font-black text-base leading-tight">Create Session</div>
                    <div className="text-xs text-[oklch(var(--text-muted))] font-medium mt-0.5">Run as a facilitator</div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-[oklch(var(--text-muted))] transition-transform ${mode === 'CREATE' ? 'rotate-180' : ''}`}
                />
              </div>
              <p className="text-sm text-[oklch(var(--text-secondary))] leading-relaxed">
                Configure a new simulation: choose the scenario, number of rounds, and invite players.
              </p>
            </div>

            {/* Create Form */}
            <AnimatePresence>
              {mode === 'CREATE' && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleCreateSession}
                  className="px-6 pb-6 space-y-3 overflow-hidden"
                >
                  {/* Session Name */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-1.5">Session Name</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. Q4 Crisis — Class A"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-3 px-4 text-sm focus:border-[oklch(var(--accent-up))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.4)]"
                    />
                  </div>

                  {/* Scenario */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-1.5">Scenario</label>
                    <div className="space-y-1.5">
                      {SCENARIOS.map((s) => (
                        <label key={s.value} className="flex items-start gap-3 cursor-pointer group">
                          <div className={`w-4 h-4 mt-0.5 border shrink-0 flex items-center justify-center transition-colors ${
                            scenarioId === s.value
                              ? 'border-[oklch(var(--accent-up))] bg-[oklch(var(--accent-up))]'
                              : 'border-[oklch(var(--border-subtle))] group-hover:border-[oklch(var(--border-strong))]'
                          }`}>
                            {scenarioId === s.value && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                          </div>
                          <input
                            type="radio"
                            name="scenario"
                            value={s.value}
                            checked={scenarioId === s.value}
                            onChange={() => setScenarioId(s.value)}
                            className="sr-only"
                          />
                          <div>
                            <div className="text-sm font-bold leading-tight">{s.label}</div>
                            <div className="text-xs text-[oklch(var(--text-muted))] mt-0.5">{s.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-1.5">Format</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FORMATS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setFormat(f.value)}
                          className={`py-2 text-center border text-xs font-bold transition-colors ${
                            format === f.value
                              ? 'border-[oklch(var(--accent-up))] bg-[oklch(var(--accent-up)/0.08)] text-[oklch(var(--accent-up))]'
                              : 'border-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))] hover:border-[oklch(var(--border-strong))]'
                          }`}
                        >
                          {f.label}
                          <div className="text-[10px] opacity-70 font-normal">{f.rounds}R</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isProcessing || !sessionName}
                    className="w-full h-10 bg-[oklch(var(--accent-up))] text-black font-black uppercase tracking-widest text-xs hov-scale flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <>Create Session <ArrowRight size={14} /></>}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-3 p-4 bg-[oklch(var(--accent-down)/0.08)] border border-[oklch(var(--accent-down)/0.3)] text-[oklch(var(--accent-down))] text-sm font-medium"
            >
              <Lock size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual link */}
        <div className="mt-8 pt-6 border-t border-[oklch(var(--border-subtle))]">
          <a
            href="/manuals/player"
            className="inline-flex items-center gap-2 text-sm text-[oklch(var(--text-muted))] hover:text-[oklch(var(--text-primary))] transition-colors font-medium"
          >
            <BookOpen size={14} />
            Read the player manual
          </a>
        </div>

      </div>
    </DashboardLayout>
  );
}
