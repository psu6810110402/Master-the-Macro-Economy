'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSocket } from '@/hooks/useSocket';
import { Trophy, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError } from '@/lib/api';

interface RankingEntry {
  userId: string;
  username: string;
  totalValue: number;
  rank: number;
}

/* Stagger config following animate skill: ease-out-expo */
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT_EXPO } },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: 0.3, ease: EASE_OUT_EXPO } },
};

export default function LeaderboardPage() {
  const { isConnected, lastEvent } = useSocket('TEST-SESSION-ID');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const data = await api.get<RankingEntry[]>(`leaderboard/TEST-SESSION-ID`);
        setRankings(data);
      } catch (err) {
        if (err instanceof ApiError) {
          console.error(`[${err.code}] ${err.message}`);
        } else {
          console.error('Failed to fetch rankings', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);

  useEffect(() => {
    if (lastEvent?.event === 'leaderboardUpdate') {
      setRankings(lastEvent.data.rankings);
    }
  }, [lastEvent]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-between items-end border-b-2 border-[oklch(var(--border-subtle))] pb-6"
        >
          <div>
            <div className="flex items-center gap-3 text-[oklch(var(--accent-brand))] mb-2">
              <Trophy size={16} />
              <span className="text-[10px] uppercase font-bold tracking-[0.3em]">HCK Global Ranking</span>
            </div>
            <h1 className="text-5xl font-black font-display tracking-tighter uppercase">Leaderboard</h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] mb-1">Status</div>
            <div className="flex items-center gap-2 font-bold text-xs">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[oklch(var(--accent-up))] animate-pulse' : 'bg-[oklch(var(--accent-down))]'}`} />
              {isConnected ? 'LIVE FEED' : 'OFFLINE'}
            </div>
          </div>
        </motion.header>

        {/* Rankings */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[10px] uppercase font-bold tracking-widest animate-pulse text-[oklch(var(--text-muted))]">
              Initializing Data Stream...
            </div>
          </div>
        ) : rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Trophy size={32} className="text-[oklch(var(--text-muted))] opacity-30" />
            <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))]">
              No rankings available yet — start a session to populate
            </div>
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {rankings.map((entry) => (
                <motion.div
                  layout
                  key={entry.userId}
                  variants={cardVariant}
                  exit="exit"
                  className={`group flex items-center gap-6 p-5 border transition-all duration-200 ${
                    entry.rank === 1 
                      ? 'bg-[oklch(var(--accent-brand)/0.08)] border-[oklch(var(--accent-brand)/0.4)]' 
                      : 'bg-[oklch(var(--bg-secondary))] border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--text-muted)/0.4)]'
                  }`}
                  style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
                >
                  {/* Rank */}
                  <div className={`w-12 h-12 flex items-center justify-center font-display font-black text-2xl tabular-nums ${
                    entry.rank === 1 ? 'text-[oklch(var(--accent-brand))]' : 'text-[oklch(var(--text-muted))]'
                  }`}>
                    {entry.rank.toString().padStart(2, '0')}
                  </div>

                  {/* Player */}
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] flex items-center justify-center text-[oklch(var(--text-muted))]">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="font-bold uppercase tracking-widest text-sm">{entry.username}</div>
                      <div className="text-[10px] text-[oklch(var(--text-muted))] font-bold uppercase tracking-wider">
                        ID: {entry.userId.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <div className="text-[9px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] mb-1">Net Worth</div>
                    <div className="font-display font-black text-xl tabular-nums">
                      ${entry.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        
        {/* Footer */}
        <footer className="pt-12 border-t border-[oklch(var(--border-subtle))] flex justify-between items-center opacity-20">
          <div className="text-[8px] uppercase font-bold tracking-widest">Calculated real-time from current market dynamics</div>
          <div className="text-[8px] uppercase font-bold tracking-widest">© HACKANOMICS TERMINAL v1.0</div>
        </footer>
      </div>
    </DashboardLayout>
  );
}

