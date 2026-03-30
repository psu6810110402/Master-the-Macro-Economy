'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, TrendingUp, DollarSign, Award, Loader2, LineChart } from 'lucide-react';
import { Button } from '@hackanomics/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useEffect, useState, useMemo } from 'react';
import PerformanceChart from './PerformanceChart';
import AllocationPieChart from './AllocationPieChart';
import ReturnBarChart from './ReturnBarChart';

interface PlayerRanking {
  userId: string;
  firstName: string;
  lastName: string;
  totalValue: number;
  returnPct: number;
  riskProfile?: string;
  rank: number;
}

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  rankings: PlayerRanking[];
  currentUserId: string;
  sessionId: string;
  scenarioTitle?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100 }
  }
};

export default function GameOverModal({ isOpen, onClose, rankings, currentUserId, sessionId, scenarioTitle = 'SIMULATION COMPLETE' }: GameOverModalProps) {
  const myResult = rankings.find(r => r.userId === currentUserId);
  const top3 = rankings.slice(0, 3);

  const [analysis, setAnalysis] = useState<{ debrief: string; grades?: { [key: string]: string } } | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const [chartData, setChartData] = useState<any[]>([]);
  const [allocation, setAllocation] = useState<any>(null);

  const barChartData = useMemo(() => {
    if (!chartData || chartData.length < 2) return [];
    const data = [];
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1].value;
      const curr = chartData[i].value;
      const pct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      data.push({ round: chartData[i].round, returnPct: pct });
    }
    return data;
  }, [chartData]);

  const assetAllocationData = useMemo(() => {
    if (!allocation) return [];
    const data: Array<{ name: string; value: number; color?: string }> = [{ name: 'Cash', value: Number(allocation.cashBalance), color: 'oklch(var(--bg-tertiary))' }];
    allocation.holdings.forEach((h: any) => {
      data.push({ name: h.asset.symbol, value: h.currentValue });
    });
    return data.filter(d => d.value > 0);
  }, [allocation]);

  const sectorAllocationData = useMemo(() => {
    if (!allocation) return [];
    const sectors: Record<string, number> = { 'CASH': Number(allocation.cashBalance) };
    allocation.holdings.forEach((h: any) => {
      const type = h.asset.type;
      sectors[type] = (sectors[type] || 0) + h.currentValue;
    });
    return Object.entries(sectors)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }));
  }, [allocation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && sessionId) {
      if (analysis) return; // cache guard
      // Fetch AI Analysis
      setIsLoadingAnalysis(true);
      api.get<{ analysis: { debrief: string; grades?: { [key: string]: string } } | string }>(`portfolio/${sessionId}/analysis`)
        .then(res => {
          if (typeof res.analysis === 'string') {
            setAnalysis({ debrief: res.analysis });
          } else {
            setAnalysis(res.analysis);
          }
        })
        .catch(err => {
          console.error(err);
          setAnalysis({ debrief: 'Sector AI is currently offline. No advanced debrief available.' });
        })
        .finally(() => setIsLoadingAnalysis(false));

      // Fetch Portfolio History and Allocation for Chart
      if (myResult) {
        api.get<any[]>(`portfolio/${sessionId}/history`)
          .then(res => setChartData(res))
          .catch(err => console.error('Failed to load chart history', err));

        api.get<any>(`portfolio/${sessionId}`)
          .then(res => setAllocation(res))
          .catch(err => console.error('Failed to load allocation', err));
      }
    }
  }, [isOpen, sessionId, myResult]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl -m-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[oklch(var(--bg-secondary))] border-2 border-[oklch(var(--accent-brand))] max-w-4xl w-full p-0 relative overflow-y-auto max-h-[95vh] shadow-[0_0_100px_oklch(var(--accent-brand)/0.3)] flex flex-col"
        >
          {/* Header Banner */}
          <header className="bg-[oklch(var(--accent-brand))] p-8 text-black relative overflow-hidden shrink-0">
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: '-100%' }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none whitespace-nowrap text-8xl font-black italic flex items-center"
            >
              FINAL RESULTS FINAL RESULTS FINAL RESULTS
            </motion.div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <motion.div 
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="p-4 bg-black text-[oklch(var(--accent-brand))] shrink-0"
              >
                <Trophy size={48} />
              </motion.div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black font-display tracking-tighter uppercase italic leading-none">
                   {scenarioTitle}
                </h1>
                <p className="text-black/70 uppercase tracking-widest font-bold text-xs mt-2">
                  Session {sessionId.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>
          </header>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="p-8 space-y-12 overflow-y-auto custom-scrollbar"
          >
            {/* ━━━━━━━━ SECTION 1: PERSONAL OUTCOME ━━━━━━━━ */}
            <motion.section variants={itemVariants} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
                <h2 className="text-[10px] uppercase font-black tracking-[0.4em] text-[oklch(var(--text-muted))]">Your Performance</h2>
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
              </div>

              {myResult && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6 relative overflow-hidden group">
                    <div className="text-[10px] uppercase font-black text-[oklch(var(--text-muted))] mb-2">Final Rank</div>
                    <div className="text-5xl font-black italic text-[oklch(var(--accent-brand))] group-hover:scale-110 transition-transform duration-500">#{myResult.rank}</div>
                    <Award className="absolute -bottom-2 -right-2 text-[oklch(var(--accent-brand)/0.05)]" size={80} />
                  </div>
                  <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6">
                    <div className="text-[10px] uppercase font-black text-[oklch(var(--text-muted))] mb-2">Total Value</div>
                    <div className="text-2xl font-black tabular-nums">${myResult.totalValue.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-[oklch(var(--text-muted))] mt-1">Final portfolio value</div>
                  </div>
                  <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6">
                    <div className="text-[10px] uppercase font-black text-[oklch(var(--text-muted))] mb-2">Overall Return</div>
                    <div className={`text-2xl font-black tabular-nums ${myResult.returnPct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                      {myResult.returnPct >= 0 ? '+' : ''}{myResult.returnPct.toFixed(2)}%
                    </div>
                    <div className="text-[10px] font-bold text-[oklch(var(--text-muted))] mt-1">vs $100k starting capital</div>
                  </div>
                  <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6">
                    <div className="text-[10px] uppercase font-black text-[oklch(var(--text-muted))] mb-2">Risk DNA</div>
                    <div className={`text-lg font-black uppercase tracking-widest ${myResult.riskProfile === 'AGGRESSIVE' ? 'text-[oklch(var(--status-warning))]' : myResult.riskProfile === 'CONSERVATIVE' ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--text-primary))]'}`}>
                       {myResult.riskProfile || 'BALANCED'}
                    </div>
                    <div className="text-[10px] font-bold text-[oklch(var(--text-muted))] mt-1">Risk profile</div>
                  </div>
                </div>
              )}
            </motion.section>

            {/* ━━━━━━━━ SECTION 2: ANALYTICS ━━━━━━━━ */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
                <h2 className="text-[10px] uppercase font-black tracking-[0.4em] text-[oklch(var(--text-muted))]">Market Analytics</h2>
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
              </div>

              {myResult && (chartData.length > 0 || allocation) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Line Chart */}
                  {chartData.length > 0 && (
                    <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6 flex flex-col h-full">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-[10px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-muted))] flex items-center gap-2">
                           <LineChart size={14} /> Performance Trajectory
                         </h3>
                       </div>
                       <div className="flex-1 min-h-[250px] relative -mx-4">
                        <PerformanceChart data={chartData} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    {/* Round-over-round return */}
                    {barChartData.length > 0 && (
                      <ReturnBarChart data={barChartData} />
                    )}
                    {/* Consolidated allocation */}
                    {assetAllocationData.length > 0 && (
                      <AllocationPieChart data={assetAllocationData} title="Final Asset Allocation" />
                    )}
                  </div>
                </div>
              )}
            </motion.section>

            {/* ━━━━━━━━ SECTION 3: SECTOR AI MISSION DEBRIEF ━━━━━━━━ */}
            <motion.section variants={itemVariants} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
                <h2 className="text-[10px] uppercase font-black tracking-[0.4em] text-[oklch(var(--accent-brand))]">Sector AI Analysis</h2>
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
              </div>

              <div className="bg-[oklch(var(--bg-primary))] border-l-4 border-[oklch(var(--accent-brand))] p-8 text-left relative overflow-hidden min-h-[280px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[oklch(var(--accent-brand)/0.03)] blur-3xl rounded-full pointer-events-none" />
                
                {isLoadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 gap-4 text-xs text-[oklch(var(--accent-brand))] font-bold tracking-widest animate-pulse">
                    <Loader2 size={28} className="animate-spin" />
                    Analyzing your performance…
                  </div>
                ) : (
                  <div className="text-[oklch(var(--text-primary))] relative z-10">
                    <div className="space-y-4 text-sm leading-relaxed">
                      {analysis?.debrief?.split('\n\n').map((paragraph, i) => (
                        <p key={i} className={i === 0 ? "text-lg font-black text-[oklch(var(--accent-brand))] italic leading-tight" : "opacity-90"}>{paragraph}</p>
                      ))}
                    </div>

                    {analysis?.grades && Object.keys(analysis.grades).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-[oklch(var(--accent-brand)/0.2)]">
                        {Object.entries(analysis.grades).map(([metric, reason]) => (
                          <div key={metric} className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-5 hover:border-[oklch(var(--accent-brand)/0.5)] transition-colors">
                            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] mb-3 text-[oklch(var(--accent-brand))]">
                              {metric} Report
                            </h3>
                            <p className="text-[11px] leading-tight font-medium opacity-80">
                              {reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.section>

            {/* ━━━━━━━━ SECTION 4: GLOBAL LEADERBOARD ━━━━━━━━ */}
            <motion.section variants={itemVariants} className="space-y-6 pb-8">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
                <h2 className="text-[10px] uppercase font-black tracking-[0.4em] text-[oklch(var(--text-muted))]">Sector Rankings</h2>
                <div className="h-px flex-1 bg-[oklch(var(--border-subtle))]" />
              </div>

              <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] overflow-hidden">
                <div className="grid grid-cols-[3rem_1fr_4rem_5rem_5rem] px-4 py-3 bg-[oklch(var(--bg-secondary))] text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] border-b border-[oklch(var(--border-subtle))]">
                  <span>Rank</span>
                  <span>Player</span>
                  <span className="text-right">RISK</span>
                  <span className="text-right">RETURN</span>
                  <span className="text-right">VALUE</span>
                </div>
                
                <div className="divide-y divide-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-primary))]">
                  {top3.map((player) => (
                    <div 
                      key={player.userId}
                      className={`grid grid-cols-[3rem_1fr_4rem_5rem_5rem] items-center px-4 py-4 hover:bg-[oklch(var(--accent-brand)/0.02)] transition-colors ${player.userId === currentUserId ? 'bg-[oklch(var(--accent-brand)/0.05)]' : ''}`}
                    >
                      <span className={`text-xl font-black italic ${player.rank === 1 ? 'text-[#FFD700]' : player.rank === 2 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]'}`}>
                        #{player.rank}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-tight truncate">{player.firstName} {player.lastName}</span>
                        {player.userId === currentUserId && <span className="text-[10px] font-bold text-[oklch(var(--accent-brand))]">You</span>}
                      </div>
                      <div className="flex justify-end">
                        <span className={`text-[10px] px-1.5 py-0.5 font-black uppercase tracking-widest border ${player.riskProfile === 'AGGRESSIVE' ? 'border-[oklch(var(--status-warning))] text-[oklch(var(--status-warning))]' : player.riskProfile === 'CONSERVATIVE' ? 'border-[oklch(var(--status-success))] text-[oklch(var(--status-success))]' : 'border-[oklch(var(--text-muted))] text-[oklch(var(--text-muted))]'}`}>
                          {player.riskProfile?.slice(0, 4) || 'BAL'}
                        </span>
                      </div>
                      <span className={`text-right text-xs font-black tabular-nums ${player.returnPct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                        {player.returnPct > 0 ? '+' : ''}{player.returnPct.toFixed(1)}%
                      </span>
                      <span className="text-right text-xs font-mono font-bold tabular-nums">${player.totalValue.toLocaleString()}</span>
                    </div>
                  ))}

                  {/* Leaderboard Continuity: Show user if not in top 3 */}
                  {myResult && myResult.rank > 3 && (
                    <>
                      <div className="py-2 bg-[oklch(var(--bg-secondary)/0.5)] flex items-center justify-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[oklch(var(--text-muted))]" />
                        <div className="w-1 h-1 rounded-full bg-[oklch(var(--text-muted))]" />
                        <div className="w-1 h-1 rounded-full bg-[oklch(var(--text-muted))]" />
                      </div>
                      <div className="grid grid-cols-[3rem_1fr_4rem_5rem_5rem] items-center px-4 py-4 bg-[oklch(var(--accent-brand)/0.05)] border-t border-b border-[oklch(var(--accent-brand)/0.2)]">
                        <span className="text-xl font-black italic text-[oklch(var(--accent-brand))]">#{myResult.rank}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-tight truncate">{myResult.firstName} {myResult.lastName}</span>
                          <span className="text-[10px] font-bold text-[oklch(var(--accent-brand))]">You</span>
                        </div>
                        <div className="flex justify-end">
                          <span className={`text-[10px] px-1.5 py-0.5 font-black uppercase tracking-widest border ${myResult.riskProfile === 'AGGRESSIVE' ? 'border-[oklch(var(--status-warning))] text-[oklch(var(--status-warning))]' : myResult.riskProfile === 'CONSERVATIVE' ? 'border-[oklch(var(--status-success))] text-[oklch(var(--status-success))]' : 'border-[oklch(var(--text-muted))] text-[oklch(var(--text-muted))]'}`}>
                            {myResult.riskProfile?.slice(0, 4) || 'BAL'}
                          </span>
                        </div>
                        <span className={`text-right text-xs font-black tabular-nums ${myResult.returnPct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                          {myResult.returnPct > 0 ? '+' : ''}{myResult.returnPct.toFixed(1)}%
                        </span>
                        <span className="text-right text-xs font-mono font-bold tabular-nums">${myResult.totalValue.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.section>
          </motion.div>

          <footer className="p-8 border-t border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-primary))] flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <Link href="/play" onClick={onClose}>
                <Button variant="ghost" className="uppercase tracking-widest text-[10px] font-black h-12 px-8">
                  Back to Game
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
               <Link href="/dashboard">
                <Button variant="secondary" className="uppercase tracking-widest text-[10px] font-black h-12 px-8">
                  User Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/leaderboard">
                <Button variant="primary" className="uppercase tracking-widest text-[10px] font-black h-12 px-8 flex items-center gap-2">
                  Full Leaderboard <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
