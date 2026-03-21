'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, FastForward, Square, Settings2, AlertOctagon, 
  TrendingUp, TrendingDown, Activity, Users, Zap, Globe2, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';

// ─── TYPES ───────────────────────────────────────────────────────────────

interface Session {
  id: string;
  code: string;
  name: string;
  status: 'WAITING' | 'ACTIVE' | 'NEWS_BREAK' | 'PAUSED' | 'COMPLETED';
  roundNumber: number;
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
  const [user, setUser] = useState<{ role: string } | null>(null);
  const router = useRouter();

  // Auth & Role Guard
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('supabase_token');
      if (!token) {
        router.push('/?auth=open');
        return;
      }
      try {
        const u = await api.get<{ role: string }>('auth/me');
        setUser(u);
        if (u.role !== 'FACILITATOR' && u.role !== 'ADMIN') {
          router.push('/lobby');
        }
      } catch (err) {
        localStorage.removeItem('supabase_token');
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
      fetchSessions(); // Refresh metadata
    }
  }, [lastEvent]);

  const fetchSessions = async () => {
    try {
      const data = await api.get<Session[]>('session/facilitator');
      setSessions(data);
      if (data.length > 0) {
        const active = data.find(s => s.status !== 'COMPLETED') || data[0];
        setActiveSession(active);
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
    const updated = await api.post<Session>(`session/${activeSession.id}/start`, {});
    setActiveSession(updated);
  };

  const handleNextRound = async () => {
    if (!activeSession) return;
    const response = await api.post<any>(`session/${activeSession.id}/next-round`, {});
    fetchSessions(); // Refresh all
  };

  const handleUpdateMacro = async (updates: Partial<MacroState>) => {
    if (!activeSession) return;
    const newMacro = { ...macro, ...updates };
    setMacro(newMacro);
    await api.patch(`game/macro/${activeSession.id}`, updates);
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-white italic font-black uppercase tracking-[0.5em]">Initializing Command...</div>;

  return (
    <main className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header / Nav */}
        <header className="flex justify-between items-center border-b border-[oklch(var(--border-subtle))] pb-8">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-2xl italic">F</div>
             <div>
               <h1 className="text-xl font-black uppercase tracking-tighter">Command Center</h1>
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">Facilitator Access // Level 2 Clearances</span>
             </div>
          </div>
          <Button onClick={() => { localStorage.removeItem('supabase_token'); router.push('/'); }} className="bg-[oklch(var(--bg-secondary))] text-[10px] uppercase font-black tracking-widest px-6 hover:bg-[oklch(var(--status-error))] hover:text-white transition-colors">Terminate Session (Logout)</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Session Controls & Scenario */}
          <section className="lg:col-span-2 space-y-8">
            
            {/* Active Session Info */}
            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                 <div className="flex items-center gap-2">
                   <div className={`h-2 w-2 rounded-full animate-pulse ${activeSession?.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest">{activeSession?.status || 'NO ACTIVE SESSION'}</span>
                 </div>
               </div>

               <div className="space-y-6">
                 <div>
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--accent-brand))]">Active Operation</span>
                   <h2 className="text-4xl font-black uppercase tracking-tighter italic">{activeSession?.name || 'Create New Session'}</h2>
                   <p className="text-sm font-mono text-[oklch(var(--text-muted))] mt-2">ID: {activeSession?.code || '------'} // ROUND: {activeSession?.roundNumber || 0}/5</p>
                 </div>

                 <div className="flex flex-wrap gap-4">
                    <Button 
                      onClick={handleStart}
                      disabled={activeSession?.status !== 'WAITING'}
                      className="bg-white text-black hover:bg-[oklch(var(--status-success))] hover:text-white px-8 h-12 font-black uppercase text-[10px] tracking-widest"
                    >
                      <Play size={14} className="mr-2" /> Start Simulation
                    </Button>
                     <Button 
                       onClick={handleNextRound}
                       disabled={activeSession?.status !== 'ACTIVE' && activeSession?.status !== 'NEWS_BREAK'}
                       className="bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] hover:bg-white hover:text-black px-8 h-12 font-black uppercase text-[10px] tracking-widest group"
                     >
                       <FastForward size={14} className="mr-2 group-hover:translate-x-1 transition-transform" /> Force Advance Round
                     </Button>
                     <Button className="bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] px-8 h-12 font-black uppercase text-[10px] tracking-widest">
                       <Pause size={14} className="mr-2" /> Pause Simulation
                     </Button>
                     <Button className="bg-[oklch(var(--status-error)/0.1)] border border-[oklch(var(--status-error)/0.3)] text-[oklch(var(--status-error))] px-8 h-12 font-black uppercase text-[10px] tracking-widest">
                       <Square size={14} className="mr-2" /> Abort Mission
                     </Button>
                  </div>
                </div>
             </div>

             {/* Live Operative Roster */}
             <div className="space-y-4">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                 <Users size={14} className="text-[oklch(var(--accent-brand))]" /> Live Operative Status
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {players.length === 0 && (
                   <div className="md:col-span-2 py-12 border border-dashed border-[oklch(var(--border-subtle))] text-center text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">
                     Awaiting player deployment...
                   </div>
                 )}
                 {players.map((p) => (
                   <div key={p.id} className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-4 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${p.isConnected ? 'bg-[oklch(var(--status-success)/0.15)] text-[oklch(var(--status-success))]' : 'bg-[oklch(var(--status-error)/0.15)] text-[oklch(var(--status-error))] animate-pulse'}`}>
                          <Globe2 size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-black uppercase tracking-tight">{p.name}</div>
                          <div className="text-[9px] font-bold text-[oklch(var(--text-muted))] uppercase">
                            {p.isConnected ? 'LINK_ACTIVE' : 'LINK_LOST'} // {p.isLocked ? 'STATUS_LOCKED' : 'STATUS_IDLE'}
                          </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        {p.isLocked ? (
                          <div className="px-2 py-1 bg-[oklch(var(--accent-brand)/0.15)] border border-[oklch(var(--accent-brand)/0.3)] text-[oklch(var(--accent-brand))] text-[8px] font-black uppercase tracking-widest">
                            READY
                          </div>
                        ) : (
                          <div className="px-2 py-1 bg-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))] text-[8px] font-black uppercase tracking-widest animate-pulse">
                            PENDING
                          </div>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>

            {/* Macro Overrides Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Settings2 size={14} className="text-[oklch(var(--accent-brand))]" /> Macro Engine Overrides
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[
                   { label: 'Interest Rate', value: macro.interestRate, suffix: '%', icon: <Percent size={14}/>, key: 'interestRate', min: 0, max: 25 },
                   { label: 'Inflation', value: macro.inflation, suffix: '%', icon: <Zap size={14}/>, key: 'inflation', min: -5, max: 40 },
                   { label: 'GDP Growth', value: macro.gdpGrowth, suffix: '%', icon: <Activity size={14}/>, key: 'gdpGrowth', min: -15, max: 12 },
                 ].map((m, i) => (
                   <div key={i} className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">
                        <span>{m.label}</span>
                        {m.icon}
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-3xl font-black italic">{m.value}{m.suffix}</span>
                         <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => handleUpdateMacro({ [m.key]: Math.min(m.max, m.value + 0.25) })}
                              className="w-6 h-6 border border-[oklch(var(--border-subtle))] flex items-center justify-center hover:bg-white hover:text-black"
                            >
                              +
                            </button>
                            <button 
                              onClick={() => handleUpdateMacro({ [m.key]: Math.max(m.min, m.value - 0.25) })}
                              className="w-6 h-6 border border-[oklch(var(--border-subtle))] flex items-center justify-center hover:bg-white hover:text-black"
                            >
                              -
                            </button>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </section>

          {/* Right: Black Swan & Scenarios */}
          <aside className="space-y-8">
            
            {/* Black Swan Injection */}
            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--status-error)/0.3)] p-8 space-y-6">
               <div className="flex items-center gap-2 text-[oklch(var(--status-error))]">
                 <ShieldAlert size={20} />
                 <h3 className="text-sm font-black uppercase tracking-[0.2em]">Black Swan Injection</h3>
               </div>
               
               <p className="text-[10px] text-[oklch(var(--text-muted))] font-bold leading-relaxed uppercase">
                 Manual protocol override. These events will cause immediate, catastrophic market shifts across specific asset classes.
               </p>

               <div className="space-y-3">
                 <button 
                   onClick={() => handleUpdateMacro({ blackSwanActive: true, blackSwanEvent: 'Trade War' })}
                   className="w-full py-4 bg-[oklch(var(--status-error)/0.1)] border border-[oklch(var(--status-error)/0.3)] text-[oklch(var(--status-error))] text-[10px] font-black uppercase tracking-widest hover:bg-[oklch(var(--status-error))] hover:text-white transition-all"
                 >
                   Trigger Tier 2 Crisis
                 </button>
                 <button 
                   onClick={() => handleUpdateMacro({ blackSwanActive: true, blackSwanEvent: 'Global Pandemic' })}
                   className="w-full py-4 bg-[oklch(var(--status-error)/0.2)] border border-[oklch(var(--status-error)/0.5)] text-[oklch(var(--status-error))] text-[10px] font-black uppercase tracking-widest hover:bg-[oklch(var(--status-error))] hover:text-white transition-all"
                 >
                   Trigger Tier 3 Collapse
                 </button>
               </div>
            </div>

            {/* Scenario Selection */}
            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-8 space-y-6">
               <div className="flex items-center gap-2">
                 <Globe2 size={20} className="text-[oklch(var(--accent-brand))]" />
                 <h3 className="text-sm font-black uppercase tracking-[0.2em]">Market Scenarios</h3>
               </div>
               
               <div className="space-y-4">
                 {[
                   { id: 'PANDEMIC_2020', name: 'Pandemic 2020', desc: 'Deep shock + QE' },
                   { id: 'BULL_MARKET', name: 'Secular Bull', desc: 'Low rates, high GDP' },
                   { id: 'RATE_HIKE', name: 'Rate Hike Cycle', desc: 'Combatting inflation' },
                 ].map((s) => (
                   <div 
                    key={s.id} 
                    className={`p-4 border border-[oklch(var(--border-subtle))] cursor-pointer hover:border-white transition-all ${activeSession?.scenarioId === s.id ? 'bg-white text-black' : ''}`}
                   >
                     <h4 className="text-[10px] font-black uppercase tracking-widest">{s.name}</h4>
                     <p className="text-[8px] opacity-60 mt-1">{s.desc}</p>
                   </div>
                 ))}
               </div>
            </div>

          </aside>
        </div>
      </div>
    </main>
  );
}

function Percent({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}
