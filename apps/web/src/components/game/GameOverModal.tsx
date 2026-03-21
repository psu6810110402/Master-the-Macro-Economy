'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, TrendingUp, DollarSign, Award, Activity, Loader2, LineChart } from 'lucide-react';
import { Button } from '@hackanomics/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useEffect, useState, useMemo } from 'react';
import PerformanceChart from './PerformanceChart';

interface PlayerRanking {
  userId: string;
  displayName: string;
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

export default function GameOverModal({ isOpen, rankings, currentUserId, sessionId }: GameOverModalProps) {
  const myResult = rankings.find(r => r.userId === currentUserId);
  const top3 = rankings.slice(0, 3);

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && sessionId) {
      // Fetch AI Analysis
      setIsLoadingAnalysis(true);
      api.get<{ analysis: string }>(`portfolio/${sessionId}/analysis`)
        .then(res => setAnalysis(res.analysis))
        .catch(err => {
          console.error(err);
          setAnalysis('Sector AI is currently offline. No advanced debrief available.');
        })
        .finally(() => setIsLoadingAnalysis(false));

      // Fetch Portfolio History for Chart
      if (myResult) {
        api.get<any[]>(`portfolio/${sessionId}/history`)
          .then(res => setChartData(res))
          .catch(err => console.error('Failed to load chart history', err));
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
                    <span className="uppercase font-bold tracking-tight flex-1 text-left">{player.displayName}</span>
                    <span className="tabular-nums font-bold">${player.totalValue.toLocaleString()}</span>
                    <span className={`tabular-nums font-black w-16 text-right ${player.returnPct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                      {player.returnPct > 0 ? '+' : ''}{player.returnPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            {myResult && chartData.length > 0 && (
              <div className="bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-6 relative">
                <h2 className="text-[10px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-muted))] mb-4 flex items-center gap-2">
                  <LineChart size={14} /> Performance Trajectory
                </h2>
                <div className="h-64 mt-4 relative -mx-4">
                  <PerformanceChart data={chartData} />
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
                <div className="text-xs font-mono leading-relaxed space-y-4 text-[oklch(var(--text-primary))] relative z-10">
                  {analysis?.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
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
