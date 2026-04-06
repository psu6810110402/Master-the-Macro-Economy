'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, FastForward, Square, Settings2, AlertOctagon, 
  TrendingUp, TrendingDown, Activity, Users, Zap, Globe2, ShieldAlert,
  Percent
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import QRCode from 'react-qr-code';
import { useSession } from '@/context/SessionContext';
import { PRESET_PROTOCOLS, MacroPreset } from '@/constants/presets';
import CountdownHUD from '@/components/game/CountdownHUD';
import CapitalFlowHeatmap from '@/components/game/CapitalFlowHeatmap';

// ─── TYPES ───────────────────────────────────────────────────────────────

interface Session {
  id: string;
  code: string;
  name: string;
  status: 'WAITING' | 'ACTIVE' | 'NEWS_BREAK' | 'PAUSED' | 'COMPLETED';
  roundNumber: number;
  totalRounds?: number;
  scenarioId: string;
}

interface MacroState {
  interestRate: number;
  inflation: number;
  gdpGrowth: number;
  volatility: number;
  blackSwanActive: boolean;
  blackSwanEvent?: string;
}

interface PlayerStatus {
  id: string;
  name: string;
  isConnected: boolean;
  isLocked: boolean;
  totalValue?: number;
}

// ─── FACILITATOR DASHBOARD ───────────────────────────────────────────────

export default function FacilitatorDashboard() {
  const { sessionId: contextSessionId, setSessionId, logout, isInitialized } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [macro, setMacro] = useState<MacroState>({
    interestRate: 2.5,
    inflation: 3.0,
    gdpGrowth: 2.8,
    volatility: 0.3,
    blackSwanActive: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  const [timer, setTimer] = useState(0);
  const [totalTimerSeconds, setTotalTimerSeconds] = useState(180);
  
  const [customHeadline, setCustomHeadline] = useState('');
  const [customNewsBody, setCustomNewsBody] = useState('');
  const [selectedBlackSwan, setSelectedBlackSwan] = useState('Flash Crash');

  const [pendingPreset, setPendingPreset] = useState<MacroPreset | null>(null);
  const [isConfirmingPreset, setIsConfirmingPreset] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userResp = await api.get<{ role: string }>('auth/me');
        if (userResp.role !== 'FACILITATOR' && userResp.role !== 'ADMIN') {
          router.push('/?auth=open');
        } else {
          fetchSessions();
        }
      } catch (err) {
        router.push('/?auth=open');
      }
    };
    checkAuth();
  }, [router]);

  const { isConnected: isSocketConnected, lastEvent, emit } = useSocket(activeSession?.id || '');

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.event === 'initialState') {
      setPlayers(lastEvent.data.players || []);
      if (lastEvent.data.timer > 0) {
        setTimer(lastEvent.data.timer);
        setTotalTimerSeconds(lastEvent.data.timer);
      }
    }

    if (lastEvent.event === 'roster:update') {
      setPlayers(lastEvent.data.players);
    }

    if (lastEvent.event === 'game:round_start') {
      setTimer(0);
      fetchSessions(); 
    }

    if (lastEvent.event === 'game:timer_tick') {
      setTimer(lastEvent.data.secondsLeft);
    }

    if (lastEvent.event === 'game:player_ready') {
      setPlayers(prev => prev.map(p => 
        p.id === lastEvent.data.userId ? { ...p, isLocked: true } : p
      ));
    }

    if (lastEvent.event === 'marketOpened') {
      setTimer(lastEvent.data.timer || 180);
      setTotalTimerSeconds(lastEvent.data.timer || 180);
      fetchSessions();
    }

    if (lastEvent.event === 'sessionEnded') {
      setTimer(0);
      fetchSessions();
    }

    if (lastEvent.event === 'game:black_swan_triggered') {
      setMacro(prev => ({
        ...prev,
        blackSwanActive: true,
        blackSwanEvent: lastEvent.data.eventName
      }));
    }
  }, [lastEvent]);

  const fetchSessions = async () => {
    try {
      const data = await api.get<Session[]>('session/facilitator');
      setSessions(data);
      if (data.length > 0) {
        const active = data.find(s => s.status !== 'COMPLETED') || data[0];
        setActiveSession(active);
        if (active.id !== contextSessionId) {
            setSessionId(active.id);
        }
        fetchMacro(active.id);
      }
    } catch (err) {
      console.error('Failed to fetch sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMacro = async (sessionId: string) => {
    try {
      const data = await api.get<MacroState>(`game/macro/${sessionId}`);
      setMacro(data);
    } catch (err) {
      // Use defaults if not found
    }
  };

  const handleStart = async () => {
    if (!activeSession) return;
    try {
      if (isSocketConnected) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Start session WS timeout')), 8000);
          emit('startSession', { sessionId: activeSession.id }, (response: any) => {
            clearTimeout(timeout);
            if (response?.status === 'ok') {
              resolve(response);
            } else {
              reject(new Error(response?.message || 'Failed to start session via WebSocket'));
            }
          });
        });
      } else {
        await api.post(`session/${activeSession.id}/start`, {});
      }
      await fetchSessions();
    } catch (err) {
      console.error('Failed to start simulation', err);
      console.warn('StartSession fallback to REST route due WS failure or timeout');
      // As fallback, try network route once if socket failed
      try {
        await api.post(`session/${activeSession.id}/start`, {});
        await fetchSessions();
      } catch (fallbackErr) {
        console.error('Fallback startup route failed', fallbackErr);
      }
    }
  };

  const handleNextRound = async () => {
    if (!activeSession) return;
    try {
      if (isSocketConnected) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Next round WS timeout')), 8000);
          emit('nextRound', { sessionId: activeSession.id }, (response: any) => {
            clearTimeout(timeout);
            if (response?.status === 'ok') {
              resolve(response);
            } else {
              reject(new Error(response?.message || 'Failed to advance round via WebSocket'));
            }
          });
        });
      } else {
        await api.post<any>(`session/${activeSession.id}/next-round`, {});
      }
      await fetchSessions();
    } catch (err) {
      console.error('Failed to advance round', err);
      console.warn('NextRound fallback to REST route due WS failure or timeout');
      try {
        await api.post<any>(`session/${activeSession.id}/next-round`, {});
        await fetchSessions();
      } catch (fallbackErr) {
        console.error('Fallback next-round route failed', fallbackErr);
      }
    }
  };

  const handleUpdateMacro = async (updates: Partial<MacroState>) => {
    if (!activeSession) return;
    const newMacro = { ...macro, ...updates };
    setMacro(newMacro);
    await api.patch(`game/macro/${activeSession.id}`, updates);
  };

  const applyPreset = async (preset: MacroPreset) => {
    if (preset.isHighRisk && !isConfirmingPreset) {
      setPendingPreset(preset);
      setIsConfirmingPreset(true);
      return;
    }

    await handleUpdateMacro({
      interestRate: preset.interestRate,
      inflation: preset.inflation,
      gdpGrowth: preset.gdpGrowth
    });

    if (activeSession) {
      emit('admin:inject_news', {
        sessionId: activeSession.id,
        headline: `MARKET ALERT: ${preset.label} Protocol Initiated`,
        body: `Economic indicators have shifted. Interest: ${preset.interestRate}%, Inflation: ${preset.inflation}%, GDP: ${preset.gdpGrowth}%`
      });
    }
    
    setIsConfirmingPreset(false);
    setPendingPreset(null);
  };

  const handleInjectNews = () => {
    if (!activeSession || !customHeadline || !customNewsBody) return;
    emit('admin:inject_news', {
      sessionId: activeSession.id,
      headline: customHeadline,
      body: customNewsBody
    });
    setCustomHeadline('');
    setCustomNewsBody('');
  };

  const handleInjectBlackSwan = () => {
    if (!activeSession || !selectedBlackSwan) return;
    emit('admin:inject_black_swan', {
      sessionId: activeSession.id,
      eventName: selectedBlackSwan
    });
  };

  const macroControls = React.useMemo(() => [
    { label: 'Interest Rate', value: macro.interestRate, suffix: '%', icon: <Percent size={14}/>, key: 'interestRate', min: 0, max: 25, step: 0.25, color: 'text-[oklch(var(--accent-brand))]' },
    { label: 'Inflation', value: macro.inflation, suffix: '%', icon: <Zap size={14}/>, key: 'inflation', min: -5, max: 40, step: 0.5, color: 'text-yellow-500' },
    { label: 'GDP Growth', value: macro.gdpGrowth, suffix: '%', icon: <Activity size={14}/>, key: 'gdpGrowth', min: -15, max: 12, step: 0.25, color: 'text-[oklch(var(--status-success))]' },
  ], [macro.interestRate, macro.inflation, macro.gdpGrowth]);

  if (isLoading || !isInitialized) return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-t-2 border-[oklch(var(--accent-brand))] animate-spin rounded-full" />
      <span className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">Loading dashboard…</span>
    </div>
  );

  if (!isLoading && sessions.length === 0) return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] flex flex-col items-center justify-center gap-6 text-center px-8">
      <div className="w-16 h-16 border border-[oklch(var(--border-subtle))] flex items-center justify-center">
        <span className="text-2xl font-black italic text-[oklch(var(--accent-brand))]">F</span>
      </div>
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[oklch(var(--text-primary))] mb-2">No Active Session</h2>
        <p className="text-sm text-[oklch(var(--text-muted))]">Create a session from the lobby to get started.</p>
      </div>
      <Button
        onClick={() => router.push('/lobby')}
        className="bg-[oklch(var(--accent-brand))] text-black px-8 h-11 font-black uppercase text-xs tracking-[0.15em] hover:opacity-90 transition-opacity"
      >
        Create New Session
      </Button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-[oklch(var(--border-subtle))] pb-6">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-lg italic text-black">F</div>
             <div>
               <h1 className="text-xl font-black tracking-tight">Facilitator Dashboard</h1>
               <div className="flex items-center gap-2 mt-0.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${activeSession?.status === 'ACTIVE' ? 'bg-[oklch(var(--accent-up))] animate-pulse' : 'bg-[oklch(var(--text-muted))]'}`} />
                 <span className="text-xs text-[oklch(var(--text-muted))] font-medium">{activeSession?.status || 'No active session'}</span>
               </div>
             </div>
          </div>
          <Button
            onClick={async () => { logout(); router.push('/'); }}
            className="bg-transparent border border-[oklch(var(--border-subtle))] text-xs font-bold uppercase tracking-widest px-5 h-9 hover:border-[oklch(var(--accent-down)/0.5)] hover:text-[oklch(var(--accent-down))] transition-all"
          >
            Sign Out
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT: PRIMARY CONTROLS (Col 1-2) */}
          <section className="lg:col-span-2 space-y-8">
            
            {/* Mission Critical Stats */}
            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] p-8 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
               <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(0,255,255,0.03),rgba(0,0,0,0),rgba(255,0,0,0.03))] bg-[length:100%_4px,4px_100%] z-20 opacity-30" />
               
               <div className="absolute top-0 right-0 p-6 flex flex-col items-end gap-2 z-30">
                 <div className="flex items-center gap-3">
                   <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_15px_currentColor] ${activeSession?.status === 'ACTIVE' ? 'bg-[oklch(var(--status-success))] text-[oklch(var(--status-success))] animate-pulse' : 'bg-[oklch(var(--status-warning))] text-[oklch(var(--status-warning))]'}`} />
                   <span className="text-[11px] font-black uppercase tracking-[0.3em] font-mono">{activeSession?.status || 'STATUS_OFFLINE'}</span>
                 </div>
                 <div className="text-[9px] font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest font-mono opacity-60">Session_ID: {activeSession?.code || 'NULL'}</div>
               </div>

               <div className="relative z-30 space-y-6">
                 <div>
                   <span className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--accent-brand))] mb-2 block">Active Session</span>
                   <h2 className="text-3xl font-black tracking-tight leading-tight">{activeSession?.name || 'Initializing…'}</h2>

                   <div className="grid grid-cols-3 gap-6 mt-6 py-5 border-y border-[oklch(var(--border-subtle)/0.5)]">
                      <div>
                        <div className="text-xs font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest mb-1">Round</div>
                        <div className="text-2xl font-black tabular-nums">{activeSession?.roundNumber || 0}<span className="text-[oklch(var(--text-muted))] text-sm font-bold"> / {activeSession?.totalRounds || 5}</span></div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-xs font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest mb-1">Timer</div>
                        <CountdownHUD
                          seconds={timer}
                          totalSeconds={totalTimerSeconds}
                          isActive={activeSession?.status === 'ACTIVE'}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest mb-1">Players</div>
                        <div className="text-2xl font-black tabular-nums">{players.length}<span className="text-[oklch(var(--text-muted))] text-sm font-bold"> / 50</span></div>
                      </div>
                   </div>
                 </div>

                 <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleStart}
                      disabled={activeSession?.status !== 'WAITING'}
                      className="bg-[oklch(var(--text-primary))] text-[oklch(var(--bg-main))] px-8 h-11 font-black uppercase text-xs tracking-[0.15em] hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-40"
                    >
                      <Play size={14} /> Start Simulation
                    </Button>
                    <Button
                      onClick={handleNextRound}
                      disabled={activeSession?.status !== 'ACTIVE' && activeSession?.status !== 'NEWS_BREAK'}
                      className="bg-transparent border border-[oklch(var(--border-subtle))] px-8 h-11 font-black uppercase text-xs tracking-[0.15em] hover:border-[oklch(var(--border-strong))] hover:bg-[oklch(var(--bg-secondary)/0.5)] transition-all flex items-center gap-2 disabled:opacity-40"
                    >
                      <FastForward size={14} /> Advance Round
                    </Button>
                    {activeSession?.status === 'COMPLETED' && (
                      <Button
                        onClick={() => router.push('/lobby')}
                        className="bg-[oklch(var(--accent-up))] text-black px-8 h-11 font-black uppercase text-xs tracking-[0.15em] hover:opacity-90 transition-opacity"
                      >
                        Create New Session
                      </Button>
                    )}
                 </div>
               </div>
            </div>

            {/* Macro Controls */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[oklch(var(--text-muted))]">
                <Settings2 size={14} className="text-[oklch(var(--accent-brand))]" />
                Macro Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {macroControls.map((m, i) => (
                   <div key={i} className="bg-[oklch(var(--bg-secondary)/0.5)] border border-[oklch(var(--border-subtle))] p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">{m.label}</span>
                        <div className={m.color}>{m.icon}</div>
                      </div>
                      <div className="text-3xl font-black tabular-nums">{m.value}{m.suffix}</div>
                      <input
                        type="range"
                        min={m.min} max={m.max} step={m.step}
                        value={m.value}
                        onChange={(e) => handleUpdateMacro({ [m.key]: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-[oklch(var(--bg-main))] rounded-none appearance-none cursor-pointer accent-[oklch(var(--accent-brand))]"
                      />
                   </div>
                 ))}
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[oklch(var(--text-muted))]">
                <Zap size={14} className="text-[oklch(var(--status-warning))]" />
                Quick Presets
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRESET_PROTOCOLS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="p-4 bg-[oklch(var(--bg-secondary)/0.4)] border border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--border-strong))] hover:bg-[oklch(var(--bg-secondary)/0.7)] transition-all text-left relative group"
                  >
                    <div className="text-xs font-black uppercase tracking-wide mb-1.5" style={{ color: preset.color }}>{preset.label}</div>
                    <div className="text-[11px] text-[oklch(var(--text-muted))] leading-relaxed mb-3 line-clamp-2">
                      {preset.description}
                    </div>
                    <div className="text-[10px] text-[oklch(var(--text-muted)/0.5)] font-medium tabular-nums">
                      {preset.interestRate}% / {preset.inflation}% / {preset.gdpGrowth}%
                    </div>
                    {preset.isHighRisk && (
                      <div className="absolute top-2 right-2">
                        <ShieldAlert size={11} className="text-[oklch(var(--status-error))]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT: SECONDARY CONTROLS (Col 3-4) */}
          <section className="lg:col-span-2 space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Join QR */}
               <div className="space-y-3">
                 <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[oklch(var(--text-muted))]">
                   <Globe2 size={14} className="text-[oklch(var(--accent-brand))]" />
                   Join Code
                 </h3>
                 {activeSession?.code ? (
                   <motion.div
                     initial={{ opacity: 0, y: 8 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-[oklch(var(--bg-secondary)/0.4)] border border-[oklch(var(--border-subtle))] p-6 text-center"
                   >
                     <div className="bg-white p-3 inline-block mb-4">
                       <QRCode
                        value={`${typeof window !== 'undefined' ? window.location.origin : 'https://finsim.hackanomics.dev'}/lobby?code=${activeSession.code}`}
                        size={140}
                        fgColor="#000000"
                       />
                     </div>
                     <div className="space-y-1">
                       <div className="text-xs font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest">Session Code</div>
                       <div className="text-3xl font-black tabular-nums tracking-[0.2em] select-all">{activeSession.code}</div>
                     </div>
                   </motion.div>
                 ) : (
                   <div className="bg-[oklch(var(--bg-secondary)/0.3)] border border-[oklch(var(--border-subtle))] p-10 text-center text-sm text-[oklch(var(--text-muted))]">
                     Generating code…
                   </div>
                 )}
               </div>

               {/* Black Swan */}
               <div className="space-y-3">
                 <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[oklch(var(--text-muted))]">
                   <ShieldAlert size={14} className="text-[oklch(var(--status-error))]" />
                   Black Swan Events
                 </h3>
                 <div className="border border-[oklch(var(--accent-down)/0.25)] p-5 space-y-4">
                    <p className="text-xs text-[oklch(var(--text-muted))] leading-relaxed">
                      Trigger a major market shock event that immediately affects all players. Use sparingly.
                    </p>
                    <div className="space-y-3">
                      <select
                        value={selectedBlackSwan}
                        onChange={(e) => setSelectedBlackSwan(e.target.value)}
                        className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--accent-down)/0.4)] py-3 px-4 text-sm font-bold outline-none focus:border-[oklch(var(--accent-down))] text-[oklch(var(--accent-down))] appearance-none cursor-pointer"
                      >
                        <optgroup label="Critical Shocks">
                          <option value="Flash Crash">Flash Crash</option>
                          <option value="Bank Run">Bank Run</option>
                          <option value="Supply Chain Crisis">Supply Chain Crisis</option>
                        </optgroup>
                        <optgroup label="Systemic Failures">
                          <option value="Trade War">Trade War</option>
                          <option value="Stagflation">Stagflation</option>
                          <option value="Currency Crisis">Currency Crisis</option>
                        </optgroup>
                      </select>

                      <Button
                        onClick={handleInjectBlackSwan}
                        disabled={macro.blackSwanActive}
                        className={`w-full h-10 font-black uppercase text-xs tracking-widest transition-all ${
                          macro.blackSwanActive
                          ? 'bg-[oklch(var(--status-error))] text-white cursor-not-allowed'
                          : 'bg-[oklch(var(--accent-down)/0.1)] border border-[oklch(var(--accent-down)/0.5)] text-[oklch(var(--accent-down))] hover:bg-[oklch(var(--accent-down))] hover:text-white'
                        }`}
                      >
                        {macro.blackSwanActive ? `Active: ${macro.blackSwanEvent}` : 'Trigger Event'}
                      </Button>
                    </div>
                 </div>
               </div>
            </div>

            {/* Capital Flow */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[oklch(var(--text-muted))]">
                <Activity size={14} className="text-[oklch(var(--accent-brand))]" />
                Capital Flow Monitor
              </h3>
              <div className="border border-[oklch(var(--border-subtle))] p-4">
                <CapitalFlowHeatmap players={players} />
              </div>
            </div>

            {/* Player Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[oklch(var(--text-muted))]">
                  <Users size={14} className="text-[oklch(var(--accent-brand))]" />
                  Players
                </h3>
                <span className="text-xs font-bold tabular-nums text-[oklch(var(--text-muted))]">{players.length} / 50</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {players.length === 0 && (
                  <div className="col-span-full py-12 border border-dashed border-[oklch(var(--border-subtle))] text-center">
                    <p className="text-sm text-[oklch(var(--text-muted))]">Waiting for players to join…</p>
                  </div>
                )}
                {players.map((p) => (
                  <motion.div
                    layout
                    key={p.id}
                    className={`flex items-center justify-between p-3.5 border transition-all ${
                      p.isConnected
                      ? 'border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary)/0.3)]'
                      : 'border-[oklch(var(--border-subtle)/0.3)] opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.isConnected ? 'bg-[oklch(var(--accent-up))]' : 'bg-[oklch(var(--accent-down))]'}`} />
                      <div>
                        <div className="text-sm font-bold">{p.name || 'Anonymous'}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest ${p.isConnected ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                          {p.isConnected ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                      p.isLocked
                        ? 'border-[oklch(var(--accent-brand)/0.4)] text-[oklch(var(--accent-brand))]'
                        : 'border-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))]'
                    }`}>
                      {p.isLocked ? 'Ready' : 'Waiting'}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Broadcast News */}
            <div className="border border-[oklch(var(--border-subtle))] p-5 space-y-4">
               <div className="flex items-center gap-2">
                 <AlertOctagon size={14} className="text-[oklch(var(--status-warning))]" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">Broadcast News</h3>
               </div>

               <div className="space-y-3">
                 <input
                   value={customHeadline}
                   onChange={(e) => setCustomHeadline(e.target.value)}
                   placeholder="Headline"
                   className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-3 px-4 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors placeholder:text-[oklch(var(--text-muted)/0.4)]"
                 />
                 <textarea
                   value={customNewsBody}
                   onChange={(e) => setCustomNewsBody(e.target.value)}
                   placeholder="Body text (market context, numbers, impact)"
                   rows={2}
                   className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-3 px-4 text-sm focus:border-[oklch(var(--accent-brand))] outline-none transition-colors resize-none placeholder:text-[oklch(var(--text-muted)/0.4)]"
                 />
                 <Button
                   onClick={handleInjectNews}
                   disabled={!customHeadline}
                   className="w-full h-10 bg-[oklch(var(--text-primary))] text-[oklch(var(--bg-main))] font-black uppercase text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-40"
                 >
                   Send Broadcast
                 </Button>
               </div>
            </div>
          </section>
        </div>
      </div>

      {/* High-Risk Modal */}
      <AnimatePresence>
        {isConfirmingPreset && pendingPreset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[oklch(var(--bg-secondary))] border-2 border-[oklch(var(--status-error))] p-10 max-w-lg w-full shadow-[0_0_100px_rgba(255,0,0,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[oklch(var(--status-error))] animate-pulse" />
              
              <div className="flex items-center gap-3 text-[oklch(var(--status-error))] mb-6">
                <ShieldAlert size={24} />
                <div>
                  <h3 className="text-xl font-black tracking-tight">High-Risk Preset</h3>
                  <span className="text-xs text-[oklch(var(--text-muted))] font-medium">This will significantly affect all players.</span>
                </div>
              </div>

              <div className="bg-[oklch(var(--bg-main)/0.5)] border border-[oklch(var(--border-subtle))] p-5 mb-6 space-y-2">
                <p className="text-sm font-bold text-[oklch(var(--text-primary))]">{pendingPreset.label}</p>
                <p className="text-sm text-[oklch(var(--text-muted))] leading-relaxed">
                  Applying this preset will cause major market disruption and immediate asset revaluation for all active players.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => { setIsConfirmingPreset(false); setPendingPreset(null); }}
                  className="flex-1 bg-transparent border border-[oklch(var(--border-subtle))] text-xs font-bold uppercase tracking-widest hover:bg-[oklch(var(--bg-secondary)/0.5)] h-11"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => applyPreset(pendingPreset)}
                  className="flex-1 bg-[oklch(var(--status-error))] text-white text-xs font-black uppercase tracking-widest hover:opacity-90 h-11"
                >
                  Apply Preset
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
