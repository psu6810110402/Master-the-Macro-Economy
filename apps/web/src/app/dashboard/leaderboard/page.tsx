'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSocket } from '@/hooks/useSocket';
import { Trophy, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { EASE_SPRING } from '@/lib/motion';

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
  const { sessionId } = useSession();
  const { isConnected, lastEvent } = useSocket(sessionId || '');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const fetchRankings = async () => {
      try {
        const data = await api.get<RankingEntry[]>(`leaderboard/${sessionId}`);
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
  }, [sessionId]);

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
          transition={{ duration: 0.5, ease: EASE_SPRING }}
          className="flex justify-between items-end border-b-2 border-[oklch(var(--border-subtle))] pb-6"
        >
          <div>
            <div className="flex items-center gap-2 text-[oklch(var(--accent-brand))] mb-2">
              <Trophy size={14} />
              <span className="text-xs font-bold uppercase tracking-widest">Session Rankings</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Leaderboard</h1>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[oklch(var(--accent-up))] animate-pulse' : 'bg-[oklch(var(--accent-down))]'}`} />
            <span className="text-[oklch(var(--text-muted))]">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </motion.header>

        {/* Rankings */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-6 h-6 border-t-2 border-[oklch(var(--accent-brand))] animate-spin rounded-full" />
            <span className="text-xs font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest">Loading…</span>
          </div>
        ) : rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Trophy size={28} className="text-[oklch(var(--text-muted))] opacity-30" />
            <p className="text-sm text-[oklch(var(--text-muted))]">No rankings yet — start a session first.</p>
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
                      <div className="font-bold text-sm">{entry.username}</div>
                      <div className="text-xs text-[oklch(var(--text-muted))] font-medium tabular-nums">
                        {entry.userId.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-1">Net Worth</div>
                    <div className="font-black text-xl tabular-nums">
                      ${entry.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        
        {/* Footer */}
        <footer className="pt-8 border-t border-[oklch(var(--border-subtle))] flex justify-between items-center">
          <div className="text-xs text-[oklch(var(--text-muted)/0.5)] font-medium">Rankings update in real time</div>
          <div className="text-xs text-[oklch(var(--text-muted)/0.5)] font-medium">Hackanomics 2026</div>
        </footer>
      </div>
    </DashboardLayout>
  );
}

