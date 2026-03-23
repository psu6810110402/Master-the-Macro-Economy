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
      await api.post(`session/${activeSession.id}/start`, {});
      await fetchSessions(); 
    } catch (err) {
      console.error('Failed to start simulation', err);
    }
  };

  const handleNextRound = async () => {
    if (!activeSession) return;
    await api.post<any>(`session/${activeSession.id}/next-round`, {});
    fetchSessions(); 
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

  if (isLoading || !isInitialized) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white italic font-black uppercase tracking-[0.5em] gap-4">
      <div className="w-12 h-12 border-t-2 border-[oklch(var(--accent-brand))] animate-spin rounded-full" />
      Synchronizing Tactical Interface...
    </div>
  );

  return (
    <main className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header / Nav */}
        <header className="flex justify-between items-center border-b border-[oklch(var(--border-strong))] pb-8">
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-3xl italic shadow-[0_0_20px_oklch(var(--accent-brand)/0.3)]">F</div>
             <div>
               <h1 className="text-2xl font-black uppercase tracking-tighter italic">Command Center</h1>
               <div className="flex items-center gap-3 mt-1">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))]">Facilitator Access</span>
                 <span className="w-1 h-1 bg-[oklch(var(--border-subtle))] rounded-full" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--accent-brand))]">Level 2 Clearance Established</span>
               </div>
             </div>
          </div>
          <Button 
            onClick={async () => { logout(); router.push('/'); }} 
            className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] text-[10px] uppercase font-black tracking-widest px-8 h-12 hover:bg-[oklch(var(--status-error))] hover:text-white transition-all shadow-[0_0_15px_rgba(0,0,0,0.3)]"
          >
            Terminate Session (Logout)
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

               <div className="relative z-30 space-y-8">
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[oklch(var(--accent-brand))] mb-2 block">Active Mission Protocol</span>
                   <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">{activeSession?.name || 'INITIALIZING...'}</h2>
                   
                   <div className="grid grid-cols-3 gap-8 mt-8 py-6 border-y border-[oklch(var(--border-subtle)/0.3)]">
                      <div>
                        <div className="text-[9px] font-black text-[oklch(var(--text-muted))] uppercase tracking-widest mb-1">Current Round</div>
                        <div className="text-2xl font-black italic">{activeSession?.roundNumber || 0} <span className="text-[oklch(var(--text-muted))] text-sm">/ {activeSession?.totalRounds || 5}</span></div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-[9px] font-black text-[oklch(var(--text-muted))] uppercase tracking-widest mb-1">Countdown</div>
                        <CountdownHUD
                          seconds={timer}
                          totalSeconds={totalTimerSeconds}
                          isActive={activeSession?.status === 'ACTIVE'}
                        />
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-[oklch(var(--text-muted))] uppercase tracking-widest mb-1">Operatives</div>
                        <div className="text-2xl font-black italic">{players.length}<span className="text-[oklch(var(--text-muted))] text-sm"> / 50</span></div>
                      </div>
                   </div>
                 </div>

                 <div className="flex flex-wrap gap-4 pt-2">
                    <Button 
                      onClick={handleStart}
                      disabled={activeSession?.status !== 'WAITING'}
                      className="bg-white text-black hover:bg-[oklch(var(--accent-brand))] hover:text-white px-10 h-14 font-black uppercase text-[11px] tracking-[0.2em] italic transition-all duration-300 shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_oklch(var(--accent-brand)/0.4)]"
                    >
                      <Play size={18} className="mr-3" /> Start Simulation
                    </Button>
                    <Button 
                      onClick={handleNextRound}
                      disabled={activeSession?.status !== 'ACTIVE' && activeSession?.status !== 'NEWS_BREAK'}
                      className="bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] hover:bg-white hover:text-black px-10 h-14 font-black uppercase text-[11px] tracking-[0.2em] italic group transition-all"
                    >
                      <FastForward size={18} className="mr-3 group-hover:translate-x-1 transition-transform" /> Sync Next Round
                    </Button>
                 </div>
               </div>
            </div>

            {/* Macro Overrides */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <Settings2 size={16} className="text-[oklch(var(--accent-brand))]" /> 
                System Parameters Override
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[
                   { label: 'Interest Rate', value: macro.interestRate, suffix: '%', icon: <Percent size={14}/>, key: 'interestRate', min: 0, max: 25, step: 0.25, color: 'text-[oklch(var(--accent-brand))]' },
                   { label: 'Inflation', value: macro.inflation, suffix: '%', icon: <Zap size={14}/>, key: 'inflation', min: -5, max: 40, step: 0.5, color: 'text-yellow-500' },
                   { label: 'GDP Growth', value: macro.gdpGrowth, suffix: '%', icon: <Activity size={14}/>, key: 'gdpGrowth', min: -15, max: 12, step: 0.25, color: 'text-[oklch(var(--status-success))]' },
                 ].map((m, i) => (
                   <div key={i} className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] p-6 space-y-4 group">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">
                        <span>{m.label}</span>
                        <div className={m.color}>{m.icon}</div>
                      </div>
                      <div className="text-4xl font-black italic">{m.value}{m.suffix}</div>
                      <input 
                        type="range"
                        min={m.min} max={m.max} step={m.step}
                        value={m.value}
                        onChange={(e) => handleUpdateMacro({ [m.key]: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-[oklch(var(--bg-main))] rounded-none appearance-none cursor-pointer accent-[oklch(var(--accent-brand))] border border-[oklch(var(--border-subtle))]"
                      />
                   </div>
                 ))}
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <Zap size={16} className="text-yellow-500" /> 
                Tactical Protocol Presets
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PRESET_PROTOCOLS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className="p-5 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] hover:border-[oklch(var(--accent-brand))] hover:bg-[oklch(var(--accent-brand)/0.05)] transition-all text-left relative overflow-hidden group shadow-lg"
                  >
                    <div className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: preset.color }}>{preset.label}</div>
                    <div className="text-[9px] text-[oklch(var(--text-muted))] font-bold leading-relaxed mb-4 line-clamp-2">
                      {preset.description}
                    </div>
                    <div className="text-[8px] font-mono opacity-50 uppercase tracking-tighter">
                      INT_{preset.interestRate}% // INF_{preset.inflation}% // GDP_{preset.gdpGrowth}%
                    </div>
                    {preset.isHighRisk && (
                      <div className="absolute top-0 right-0 p-1 bg-[oklch(var(--status-error)/0.1)]">
                        <ShieldAlert size={12} className="text-[oklch(var(--status-error))]" />
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
               {/* Join Terminal */}
               <div className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                   <Globe2 size={16} className="text-[oklch(var(--accent-brand))]" /> 
                   Join Terminal
                 </h3>
                 {activeSession?.code ? (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-[oklch(var(--bg-main))] p-8 border-2 border-[oklch(var(--accent-brand)/0.3)] shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative group text-center"
                   >
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 bg-[oklch(var(--bg-main))] text-[9px] font-black text-[oklch(var(--accent-brand))] uppercase tracking-[0.4em] border border-[oklch(var(--accent-brand)/0.4)]">Scanner_Port_01</div>
                     <div className="bg-white p-4 inline-block rounded-sm shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-[1.05] transition-transform duration-500">
                       <QRCode 
                        value={`${typeof window !== 'undefined' ? window.location.origin : 'https://finsim.hackanomics.dev'}/lobby?code=${activeSession.code}`} 
                        size={160}
                        fgColor="#000000"
                       />
                     </div>
                     <div className="mt-8 space-y-2">
                       <div className="text-[12px] font-black text-[oklch(var(--text-muted))] uppercase tracking-widest">Manual Entry Code</div>
                       <div className="text-4xl font-black font-mono text-white tracking-[0.2em] italic select-all">{activeSession.code}</div>
                     </div>
                   </motion.div>
                 ) : (
                   <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] p-12 text-center italic text-[oklch(var(--text-muted))] font-black uppercase text-[10px] tracking-[0.4em]">
                     Initializing_Uplink...
                   </div>
                 )}
               </div>

               {/* Black Swan Injection */}
               <div className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                   <ShieldAlert size={16} className="text-[oklch(var(--status-error))]" /> 
                   Black Swan Protocol
                 </h3>
                 <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--status-error)/0.3)] p-8 h-full flex flex-col justify-between space-y-6">
                    <p className="text-[10px] text-[oklch(var(--text-muted))] font-bold leading-relaxed uppercase">
                      Manual catastrophic intervention. This protocol bypasses standard market regulators. Use with extreme caution.
                    </p>
                    <div className="space-y-4">
                      <select 
                        value={selectedBlackSwan}
                        onChange={(e) => setSelectedBlackSwan(e.target.value)}
                        className="w-full bg-black border border-[oklch(var(--status-error)/0.5)] p-4 text-[11px] font-black uppercase outline-none focus:border-[oklch(var(--status-error))] text-[oklch(var(--status-error))] appearance-none cursor-pointer"
                      >
                        <optgroup label="CRITICAL_SHOCKS">
                          <option value="Flash Crash">Flash Crash</option>
                          <option value="Bank Run">Bank Run</option>
                          <option value="Supply Chain Crisis">Supply Chain Crisis</option>
                        </optgroup>
                        <optgroup label="SYSTEMIC_FAILURE">
                          <option value="Trade War">Trade War</option>
                          <option value="Stagflation">Stagflation</option>
                          <option value="Currency Crisis">Currency Crisis</option>
                        </optgroup>
                      </select>
                      
                      <Button 
                        onClick={handleInjectBlackSwan}
                        disabled={macro.blackSwanActive}
                        className={`w-full h-14 font-black uppercase text-[10px] tracking-[0.2em] transition-all ${
                          macro.blackSwanActive 
                          ? 'bg-[oklch(var(--status-error))] text-white cursor-not-allowed' 
                          : 'bg-[oklch(var(--status-error)/0.15)] border border-[oklch(var(--status-error)/0.5)] text-[oklch(var(--status-error))] hover:bg-[oklch(var(--status-error))] hover:text-white'
                        }`}
                      >
                        {macro.blackSwanActive ? `ACTIVE: ${macro.blackSwanEvent}` : 'Execute Injection'}
                      </Button>
                    </div>
                 </div>
               </div>
            </div>

            {/* Capital Flow Monitor */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <Activity size={16} className="text-[oklch(var(--accent-brand))]" />
                Capital Flow Monitor
              </h3>
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] p-6">
                <CapitalFlowHeatmap players={players} />
              </div>
            </div>

            {/* Live Simulation Roster */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[oklch(var(--border-strong))] pb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                  <Users size={16} className="text-[oklch(var(--accent-brand))]" /> 
                  Live Simulation Roster
                  <span className="ml-3 px-2 py-0.5 bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] text-[9px] font-mono text-[oklch(var(--accent-brand))] shadow-[0_0_10px_oklch(var(--accent-brand)/0.2)]">
                    {players.length}/50 JOINED
                  </span>
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {players.length === 0 && (
                  <div className="col-span-full py-16 bg-[oklch(var(--bg-main)/0.3)] border border-dashed border-[oklch(var(--border-strong))] text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.4em] text-[oklch(var(--text-muted))] animate-pulse">
                        Awaiting_Operative_Deployment...
                    </div>
                  </div>
                )}
                {players.map((p) => (
                  <motion.div 
                    layout
                    key={p.id} 
                    className={`relative p-5 border transition-all duration-500 overflow-hidden group ${
                      p.isConnected 
                      ? 'bg-[oklch(var(--bg-secondary))] border-[oklch(var(--border-strong))] hover:border-[oklch(var(--accent-brand)/0.5)] shadow-md' 
                      : 'bg-black/40 border-[oklch(var(--status-error)/0.2)] grayscale opacity-50'
                    }`}
                  >
                    {p.isConnected && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(var(--accent-brand)/0.03),transparent_70%)] pointer-events-none" />
                    )}
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-5">
                         <div className={`p-3 rounded-sm transition-all duration-500 ${
                           p.isConnected 
                           ? 'bg-[oklch(var(--bg-main))] text-[oklch(var(--accent-brand))] border border-[oklch(var(--accent-brand)/0.3)] shadow-[0_0_15px_oklch(var(--accent-brand)/0.15)]' 
                           : 'bg-black text-[oklch(var(--status-error))]'
                         }`}>
                            <Globe2 size={18} className={p.isConnected ? '' : 'animate-pulse'} />
                         </div>
                         <div>
                           <div className="text-[14px] font-black uppercase tracking-tighter italic">{p.name || 'ANON_USER'}</div>
                           <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${p.isConnected ? 'text-[oklch(var(--accent-brand))]' : 'text-[oklch(var(--status-error))]'}`}>
                             {p.isConnected ? 'LINK_ESTABLISHED' : 'LINK_INTERRUPTED'}
                           </div>
                         </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {p.isLocked ? (
                          <div className="px-2.5 py-1 bg-[oklch(var(--accent-brand)/0.1)] border border-[oklch(var(--accent-brand)/0.4)] text-[oklch(var(--accent-brand))] text-[9px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_oklch(var(--accent-brand)/0.2)]">
                            READY
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 bg-black/50 border border-white/5 text-[oklch(var(--text-muted))] text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">
                            PENDING
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Break News Injector Mini */}
            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] p-8 space-y-6 shadow-xl">
               <div className="flex items-center gap-3">
                 <AlertOctagon size={20} className="text-yellow-500" />
                 <h3 className="text-sm font-black uppercase tracking-[0.3em]">Tactical News Broadcast</h3>
               </div>
               
               <div className="space-y-5">
                 <input 
                   value={customHeadline}
                   onChange={(e) => setCustomHeadline(e.target.value)}
                   placeholder="ENTER HEADLINE..."
                   className="w-full bg-black border border-[oklch(var(--border-strong))] p-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-[oklch(var(--accent-brand))] transition-all"
                 />
                 <textarea 
                   value={customNewsBody}
                   onChange={(e) => setCustomNewsBody(e.target.value)}
                   placeholder="ENTER INTEL DATA..."
                   rows={2}
                   className="w-full bg-black border border-[oklch(var(--border-strong))] p-4 text-[11px] font-bold outline-none focus:border-[oklch(var(--accent-brand))] transition-all resize-none"
                 />
                 <Button 
                   onClick={handleInjectNews}
                   disabled={!customHeadline}
                   className="w-full h-14 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] hover:bg-[oklch(var(--accent-brand))] hover:text-white transition-all shadow-[0_10px_30px_rgba(255,255,255,0.05)]"
                 >
                   Execute Broadcast
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
              
              <div className="flex items-center gap-5 text-[oklch(var(--status-error))] mb-8">
                <ShieldAlert size={48} />
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Protocol Alert</h3>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70">Unauthorized Parameter Shift</span>
                </div>
              </div>
              
              <div className="space-y-6 bg-black/30 p-6 border border-white/5 mb-10">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Target Protocol: {pendingPreset.label}</p>
                <p className="text-[11px] text-[oklch(var(--text-muted))] leading-relaxed uppercase font-bold">
                  Deploying this protocol will cause systemic market failure and immediate asset revaluation for all participants.
                </p>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => { setIsConfirmingPreset(false); setPendingPreset(null); }}
                  className="flex-1 bg-transparent border border-[oklch(var(--border-strong))] text-[10px] font-black uppercase tracking-widest hover:bg-white/5 h-14"
                >
                  Abort Action
                </Button>
                <Button 
                  onClick={() => applyPreset(pendingPreset)}
                  className="flex-1 bg-[oklch(var(--status-error))] text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 h-14 shadow-[0_0_30px_oklch(var(--status-error)/0.4)]"
                >
                  Confirm Execution
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
