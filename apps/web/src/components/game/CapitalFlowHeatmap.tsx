'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AllocationData {
  asset: string;
  percentage: number;
  color: string;
}

interface CapitalFlowHeatmapProps {
  players: Array<{
    id: string;
    name: string;
    isLocked: boolean;
    totalValue?: number;
  }>;
  className?: string;
}

/**
 * CapitalFlowHeatmap — Shows aggregate allocation distribution across all players.
 * For now, displays a simulated view based on player ready-state.
 * In production, would consume real allocation data via socket.
 */

const DEFAULT_SECTORS = [
  { asset: 'TECH', percentage: 0, color: 'oklch(0.7 0.2 250)' },
  { asset: 'INDUSTRIAL', percentage: 0, color: 'oklch(0.7 0.15 80)' },
  { asset: 'CONSUMER', percentage: 0, color: 'oklch(0.7 0.18 320)' },
  { asset: 'BONDS', percentage: 0, color: 'oklch(0.7 0.12 200)' },
  { asset: 'GOLD', percentage: 0, color: 'oklch(0.8 0.18 90)' },
  { asset: 'CRYPTO', percentage: 0, color: 'oklch(0.7 0.22 290)' },
  { asset: 'CASH', percentage: 0, color: 'oklch(0.6 0.05 250)' },
];

export default function CapitalFlowHeatmap({ players, className = '' }: CapitalFlowHeatmapProps) {
  const lockedCount = players.filter(p => p.isLocked).length;
  const totalPlayers = players.length;

  // Simulated allocation distribution (in production, aggregate from real data)
  const sectors = DEFAULT_SECTORS.map((s, i) => ({
    ...s,
    percentage: totalPlayers > 0 
      ? Math.max(5, Math.round((100 / DEFAULT_SECTORS.length) + (Math.sin(i * 1.5) * 8)))
      : 0,
  }));

  // Normalize to 100%
  const total = sectors.reduce((sum, s) => sum + s.percentage, 0);
  const normalized = sectors.map(s => ({ ...s, percentage: total > 0 ? Math.round((s.percentage / total) * 100) : 0 }));

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))]">
          Capital Distribution
        </span>
        <span className="text-[9px] font-black font-mono text-[oklch(var(--accent-brand))]">
          {lockedCount}/{totalPlayers} LOCKED
        </span>
      </div>

      {/* Stacked bar */}
      <div className="h-6 flex overflow-hidden border border-[oklch(var(--border-subtle))]">
        {normalized.map((s) => (
          <motion.div
            key={s.asset}
            initial={{ width: 0 }}
            animate={{ width: `${s.percentage}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full relative group"
            style={{ backgroundColor: s.color }}
          >
            {s.percentage > 10 && (
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white/80 mix-blend-difference">
                {s.asset}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {normalized.map((s) => (
          <div key={s.asset} className="flex items-center gap-1.5">
            <div className="w-2 h-2" style={{ backgroundColor: s.color }} />
            <span className="text-[8px] font-black uppercase tracking-wider text-[oklch(var(--text-muted))]">
              {s.asset} {s.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
