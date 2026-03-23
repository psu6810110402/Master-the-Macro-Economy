'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, TrendingUp, DollarSign, Award, Activity, Loader2, LineChart, PieChart, BarChart } from 'lucide-react';
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
  rank: number;
}

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  rankings: PlayerRanking[];
  currentUserId: string;
  sessionId: string;
}

export default function GameOverModal({ isOpen, onClose, rankings, currentUserId, sessionId }: GameOverModalProps) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl -m-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[oklch(var(--bg-secondary))] border-2 border-[oklch(var(--accent-brand))] max-w-2xl w-full p-8 relative overflow-y-auto max-h-[90vh] shadow-[0_0_50px_oklch(var(--accent-brand)/0.2)] scrollbar-hide"
        >
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[oklch(var(--accent-brand)/0.1)] blur-[100px] rounded-full" />
          
          <div className="relative z-10 text-center space-y-8">
            <header>
              <motion.div 
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="inline-block p-4 bg-[oklch(var(--accent-brand))] text-black mb-6"
              >
                <Trophy size={48} />
              </motion.div>
              <h1 className="text-5xl font-black font-display tracking-tighter uppercase italic">
                Simulation Complete
              </h1>
              <p className="text-[oklch(var(--text-muted))] uppercase tracking-[0.3em] font-bold text-xs mt-2">
                All portfolios have been finalized.
              </p>
            </header>

            {/* My Rank Card */}
            {myResult && (
              <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6 grid grid-cols-3 gap-4 items-center">
                <div className="text-left">
                  <div className="text-[10px] uppercase font-black text-[oklch(var(--text-muted))] mb-1">Final Rank</div>
                  <div className="text-4xl font-black italic text-[oklch(var(--accent-brand))]">#{myResult.rank}</div>
                </div>
                <div className="text-left">
                  <div className="text-[10px] uppercase font-black text-[oklch(var(--text-muted))] mb-1">Net Worth</div>
                  <div className="text-2xl font-black tabular-nums">${myResult.totalValue.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-black text-[oklch(var(--text-muted))] mb-1">Return</div>
                  <div className={`text-2xl font-black tabular-nums ${myResult.returnPct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                    {myResult.returnPct >= 0 ? '+' : ''}{myResult.returnPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {/* Podium */}
            <div className="space-y-4">
              <h2 className="text-[10px] uppercase font-black tracking-[0.3em] text-[oklch(var(--accent-brand))] flex items-center justify-center gap-2">
                <Award size={14} /> Global Leaderboard (Top 3)
              </h2>
              <div className="space-y-2">
                {top3.map((player) => (
                  <div 
                    key={player.userId}
                    className={`flex items-center gap-4 p-3 border ${player.userId === currentUserId ? 'border-[oklch(var(--accent-brand))] bg-[oklch(var(--accent-brand)/0.05)]' : 'border-[oklch(var(--border-subtle))]'} font-mono text-xs`}
                  >
                    <span className="font-black text-[oklch(var(--accent-brand))] w-6">#{player.rank}</span>
                    <span className="uppercase font-bold tracking-tight flex-1 text-left">{player.firstName} {player.lastName}</span>
                    <span className="tabular-nums font-bold">${player.totalValue.toLocaleString()}</span>
                    <span className={`tabular-nums font-black w-16 text-right ${player.returnPct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                      {player.returnPct > 0 ? '+' : ''}{player.returnPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts Section */}
            {myResult && (chartData.length > 0 || allocation) && (
              <div className="space-y-4">
                {/* Line Chart */}
                {chartData.length > 0 && (
                  <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6 relative">
                    <h2 className="text-[10px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-muted))] mb-4 flex items-center gap-2">
                      <LineChart size={14} /> Performance Trajectory
                    </h2>
                    <div className="h-64 mt-4 relative -mx-4">
                      <PerformanceChart data={chartData} />
                    </div>
                  </div>
                )}
                
                {/* Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Round Returns */}
                  {barChartData.length > 0 && (
                    <ReturnBarChart data={barChartData} />
                  )}
                  {/* Asset Allocation */}
                  {assetAllocationData.length > 0 && (
                    <AllocationPieChart data={assetAllocationData} title="Asset Imbalance" />
                  )}
                  {/* Sector Allocation */}
                  {sectorAllocationData.length > 0 && (
                    <AllocationPieChart data={sectorAllocationData} title="Sector Exposure" />
                  )}
                </div>
              </div>
            )}

            {/* AI Analysis Block */}
            <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--accent-brand)/0.4)] p-6 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(var(--accent-brand)/0.05)] blur-2xl rounded-full pointer-events-none" />
              <h2 className="text-[10px] uppercase font-black tracking-[0.3em] text-[oklch(var(--accent-brand))] flex items-center gap-2 mb-4">
                <Activity size={14} /> Sector AI Mission Debrief
              </h2>
              {isLoadingAnalysis ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-[10px] font-mono text-[oklch(var(--accent-brand))] uppercase font-bold tracking-widest animate-pulse">
                  <Loader2 size={24} className="animate-spin" /> 
                  Generating customized tactical analysis...
                </div>
              ) : (
                <div className="text-xs font-mono leading-relaxed text-[oklch(var(--text-primary))] relative z-10 space-y-6">
                  {/* Debrief */}
                  <div className="space-y-4 text-[13px]">
                    {analysis?.debrief?.split('\n\n').map((paragraph, i) => (
                      <p key={i} className={i === 0 ? "font-bold text-[oklch(var(--accent-brand))]" : ""}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Structured Grades Reasoning */}
                  {analysis?.grades && Object.keys(analysis.grades).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[oklch(var(--accent-brand)/0.2)]">
                      {Object.entries(analysis.grades).map(([metric, reason]) => (
                        <div key={metric} className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--accent-brand)/0.2)] p-4 shadow-[inset_0_0_20px_oklch(var(--accent-brand)/0.02))]">
                          <h3 className="text-[10px] uppercase font-black tracking-[0.2em] mb-2 text-[oklch(var(--text-muted))]">
                            {metric} Grading
                          </h3>
                          <p className="text-[11px] leading-relaxed text-[oklch(var(--text-primary))] opacity-90">
                            {reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="pt-4 flex justify-center gap-4">
              <Link href="/">
                <Button variant="ghost" className="uppercase tracking-widest text-[10px] font-black h-12 px-8">
                  Back to Terminal
                </Button>
              </Link>
              <Link href="/dashboard/leaderboard">
                <Button variant="primary" className="uppercase tracking-widest text-[10px] font-black h-12 px-8 flex items-center gap-2">
                  Full Rankings <ArrowRight size={14} />
                </Button>
              </Link>
            </footer>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
