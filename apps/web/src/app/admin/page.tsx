'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSocket } from '@/hooks/useSocket';
import { Play, Pause, FastForward, Activity, Users, DollarSign, ListFilter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

interface TradeLog {
  userId: string;
  trade: {
    symbol: string;
    quantity: number;
    action: 'BUY' | 'SELL';
  };
  timestamp: number;
}

export default function FacilitatorDashboard() {
  const [sessionId, setSessionId] = useState<string>('');
  const { isConnected, lastEvent, emit } = useSocket(sessionId);
  const [gameState, setGameState] = useState<any>(null);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);

  useEffect(() => {
    const savedId = localStorage.getItem('current_session_id');
    if (savedId) setSessionId(savedId);
  }, []);

  // Listen for state changes
  useEffect(() => {
    if (lastEvent?.event === 'initialState') {
      setGameState(lastEvent.data);
    }
    if (lastEvent?.event === 'roundStarted') {
      setGameState(lastEvent.data);
    }
    if (lastEvent?.event === 'marketOpened') {
      setGameState(lastEvent.data);
    }
    if (lastEvent?.event === 'tradeAcknowledged') {
      const newLog: TradeLog = {
        userId: lastEvent.data.userId,
        trade: lastEvent.data.trade,
        timestamp: Date.now(),
      };
      setTradeLogs((prev) => [newLog, ...prev].slice(0, 50));
    }
  }, [lastEvent]);

  const handleNextRound = async () => {
    if (!sessionId) return;
    try {
      await api.post(`session/${sessionId}/next-round`);
    } catch (err) {
      console.error('Failed to advance round', err);
    }
  };

  const handleStartGame = async () => {
    if (!sessionId) return;
    try {
      await api.post(`session/${sessionId}/start`);
    } catch (err) {
      console.error('Failed to start session', err);
    }
  };

  const handleIntervention = async (type: string) => {
    console.log(`Triggering intervention: ${type}`);
    // Future: api.post(`session/${SESSION_ID}/event`, { type });
  };

  return (
    <DashboardLayout title="Command Center">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-[oklch(var(--border-subtle))] pb-8">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-[oklch(var(--accent-brand))] mb-2 flex items-center gap-2">
              <Activity size={12} />
              Facilitator Mission Control
            </div>
            <h1 className="text-4xl font-black font-display tracking-tighter uppercase underline decoration-[oklch(var(--accent-brand))] decoration-4 underline-offset-8">
              Session Management
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-8">
            <StatBlock label="Players" value="Active" icon={<Users size={14} />} />
            <StatBlock label="Market Vol." value="HIGH" color="text-[oklch(var(--accent-up))]" icon={<Activity size={14} />} />
            <StatBlock label="Round" value={`${gameState?.currentRound || 1} / 05`} icon={<ListFilter size={14} />} />
          </div>
        </header>

        <main className="grid grid-cols-12 gap-8">
          {/* Controls */}
          <section className="col-span-4 space-y-6">
            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(var(--accent-brand)/0.05)] blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[oklch(var(--accent-brand)/0.1)] transition-colors" />
              <h2 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity size={16} className="text-[oklch(var(--accent-brand))]" />
                Engine Commands
              </h2>
              
              <div className="space-y-4">
                <ControlButton 
                  onClick={handleStartGame}
                  label="Initialize Session" 
                  subLabel="Boot game loop and prices"
                  icon={<Play size={18} />} 
                  variant="primary"
                />
                {gameState?.status === 'NEWS_BREAK' ? (
                  <ControlButton 
                    onClick={() => emit('openMarket', { sessionId })}
                    label="Open Trading Market" 
                    subLabel="Unlock the market for trading"
                    icon={<Play size={18} />} 
                    variant="primary"
                  />
                ) : (
                  <ControlButton 
                    onClick={handleNextRound}
                    label="Publish Breaking News" 
                    subLabel="Lock trading and unveil event"
                    icon={<FastForward size={18} />} 
                  />
                )}
                <ControlButton 
                  onClick={() => {
                    if (confirm('Are you sure you want to terminate the simulation? This will finalize all rankings.')) {
                      emit('endSession', { sessionId });
                    }
                  }}
                  label="Terminate Session" 
                  subLabel="Finalize all rankings"
                  icon={<Pause size={18} />} 
                  variant="danger"
                />
              </div>
            </div>

            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6">
              <h2 className="text-sm font-black uppercase tracking-widest mb-6">Market Interventions</h2>
              <div className="grid grid-cols-2 gap-3 pb-4">
                <button 
                  onClick={() => handleIntervention('CRISIS')}
                  className="p-3 border border-[oklch(var(--border-subtle))] text-[10px] font-black uppercase tracking-widest hover:bg-[oklch(var(--accent-down)/0.12)] hover:border-[oklch(var(--accent-down)/0.4)] active:scale-[0.97] transition-all duration-200"
                  style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
                >
                  Economic Crisis
                </button>
                <button 
                  onClick={() => handleIntervention('BOOM')}
                  className="p-3 border border-[oklch(var(--border-subtle))] text-[10px] font-black uppercase tracking-widest hover:bg-[oklch(var(--accent-up)/0.12)] hover:border-[oklch(var(--accent-up)/0.4)] active:scale-[0.97] transition-all duration-200"
                  style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
                >
                  Tech Bull Run
                </button>
              </div>
              <p className="text-[10px] text-[oklch(var(--text-muted))] uppercase font-bold tracking-widest">Injected events affect asset volatilities immediately.</p>
            </div>
          </section>

          {/* Trade Feed */}
          <section className="col-span-8 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] flex flex-col h-[600px]">
            <div className="p-4 border-b border-[oklch(var(--border-subtle))] flex justify-between items-center bg-[oklch(var(--bg-primary))]">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={14} className="text-[oklch(var(--accent-brand))]" />
                Live Order Flow
              </h2>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">Auto-scrolling Stream</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] relative scrollbar-hide">
              {/* Scanning Beam Animation */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[2px] bg-[oklch(var(--accent-brand)/0.2)] shadow-[0_0_15px_oklch(var(--accent-brand))] z-10 pointer-events-none"
              />
              
              <AnimatePresence initial={false}>
                {tradeLogs.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-20 uppercase tracking-[0.2em] animate-pulse">Awaiting Market Activity...</div>
                )}
                {tradeLogs.map((log, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={`${log.timestamp}-${i}`}
                    className="flex gap-4 p-3 border-l-2 border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--accent-brand))] hover:bg-[oklch(var(--bg-primary))] group transition-all duration-300"
                  >
                    <span className="opacity-30 tabular-nums">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="font-bold text-[oklch(var(--accent-brand))] uppercase tracking-tighter">{log.userId.slice(0, 8)}</span>
                    <div className="flex items-center gap-2">
                       <span className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-black ${log.trade.action === 'BUY' ? 'bg-[oklch(var(--accent-up)/0.15)] text-[oklch(var(--accent-up))]' : 'bg-[oklch(var(--accent-down)/0.15)] text-[oklch(var(--accent-down))]'}`}>
                        {log.trade.action}
                      </span>
                    </div>
                    <span className="font-bold tracking-widest text-[oklch(var(--text-primary))]">{log.trade.quantity} {log.trade.symbol}</span>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity uppercase text-[9px] font-black text-[oklch(var(--accent-brand))] bg-[oklch(var(--accent-brand)/0.1)] px-2 py-1">ACK</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </main>
      </div>
    </DashboardLayout>
  );
}

function StatBlock({ label, value, icon, color = 'text-[oklch(var(--text-primary))]' }: any) {
  return (
    <div className="border-r border-[oklch(var(--border-subtle))] last:border-0 pr-8 last:pr-0">
      <div className="text-[9px] uppercase font-bold tracking-[0.2em] text-[oklch(var(--text-muted))] mb-2 flex items-center gap-1 group-hover:text-[oklch(var(--accent-brand))] transition-colors">
        {icon}
        {label}
      </div>
      <AnimatePresence mode="wait">
        <motion.div 
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`text-2xl font-black font-display tracking-tight uppercase ${color}`}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ControlButton({ onClick, label, subLabel, icon, variant = 'secondary' }: any) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  
  return (
    <button 
      onClick={onClick}
      className={`w-full group text-left p-4 border active:scale-[0.97] transition-all duration-200 ${
        isPrimary ? 'bg-[oklch(var(--accent-brand))] text-[oklch(var(--bg-primary))] border-[oklch(var(--accent-brand))] hover:brightness-110' :
        isDanger ? 'bg-transparent border-[oklch(var(--accent-down)/0.4)] text-[oklch(var(--accent-down))] hover:bg-[oklch(var(--accent-down)/0.08)]' :
        'bg-transparent border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--text-muted)/0.5)]'
      }`}
      style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 ${
          isPrimary ? 'bg-[oklch(var(--bg-primary)/0.15)]' : 'bg-[oklch(var(--bg-primary))]'
        }`}>
          {icon}
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest">{label}</div>
          <div className="text-[8px] uppercase font-bold tracking-wider opacity-50 mt-0.5">{subLabel}</div>
        </div>
      </div>
    </button>
  );
}
