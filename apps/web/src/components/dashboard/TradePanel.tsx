'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Percent, Landmark, TrendingUp, Gem, Bitcoin, Building2, Fuel, Banknote } from 'lucide-react';
import { Button } from '@hackanomics/ui';

interface TradePanelProps {
  round: number;
  assetPrices: Record<string, number>;
  onCommit: (allocation: Record<string, number>) => void;
  isLocked: boolean;
  initialAllocation?: Record<string, number>;
}

const ASSET_CLASSES = [
  { id: 'TECH', name: 'Technology', icon: <Landmark size={14} />, color: 'var(--accent-brand)' },
  { id: 'BOND', name: 'Fixed Income', icon: <Percent size={14} />, color: 'var(--status-success)' },
  { id: 'GOLD', name: 'Commodities', icon: <Gem size={14} />, color: 'var(--status-warning)' },
  { id: 'CRYPTO', name: 'Digital Assets', icon: <Bitcoin size={14} />, color: 'var(--status-info)' },
  { id: 'INDUSTRIAL', name: 'Industrial', icon: <Fuel size={14} />, color: 'var(--status-error)' },
  { id: 'REAL_ESTATE', name: 'Real Estate', icon: <Building2 size={14} />, color: 'var(--status-link)' },
  { id: 'CASH', name: 'Cash Reserve', icon: <Banknote size={14} />, color: 'var(--text-muted)' },
];

export default function TradePanel({ round, assetPrices, onCommit, isLocked, initialAllocation }: TradePanelProps) {
  const [allocation, setAllocation] = useState<Record<string, number>>(
    initialAllocation || {
      TECH: 20,
      BOND: 20,
      GOLD: 10,
      CRYPTO: 10,
      INDUSTRIAL: 10,
      REAL_ESTATE: 10,
      CASH: 20,
    }
  );

  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  const isValid = Math.abs(total - 100) < 0.1;

  const handleSliderChange = (id: string, value: number) => {
    if (isLocked) return;
    setAllocation((prev) => ({ ...prev, [id]: value }));
  };

  const handleCommit = () => {
    if (isValid && !isLocked) {
      onCommit(allocation);
    }
  };

  return (
    <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-primary))] flex justify-between items-center">
        <h2 className="text-[10px] uppercase font-bold tracking-[0.3em] flex items-center gap-2">
          {isLocked ? <Lock size={12} className="text-[oklch(var(--status-error))]" /> : <Unlock size={12} className="text-[oklch(var(--accent-brand))]" />}
          Portfolio Allocation
        </h2>
        <div className={`text-[10px] font-black tabular-nums transition-colors ${isValid ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))]'}`}>
          TOTAL: {total.toFixed(0)}% / 100%
        </div>
      </div>

      {/* Sliders Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {ASSET_CLASSES.map((asset) => (
          <div key={asset.id} className={`space-y-2 ${isLocked ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span style={{ color: `oklch(${asset.color})` }}>{asset.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-secondary))]">{asset.name}</span>
              </div>
              <span className="text-[10px] font-black tabular-nums">{allocation[asset.id]}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={allocation[asset.id]}
              onChange={(e) => handleSliderChange(asset.id, parseInt(e.target.value))}
              disabled={isLocked}
              className="w-full h-1 bg-[oklch(var(--bg-primary))] appearance-none cursor-pointer accent-[oklch(var(--accent-brand))] rounded-full"
            />
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-primary))]">
        {isLocked ? (
          <div className="w-full py-4 text-center border border-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))] text-[10px] font-black uppercase tracking-[0.3em] bg-[oklch(var(--bg-main))]">
            Position Secured 🔒
          </div>
        ) : (
          <Button
            className="w-full h-14"
            disabled={!isValid || isLocked}
            onClick={handleCommit}
          >
            Commit Portfolio
          </Button>
        )}
        {!isValid && !isLocked && (
          <p className="text-[9px] font-bold text-[oklch(var(--status-error))] uppercase text-center mt-3 tracking-widest animate-pulse">
            Warning: Allocation must equal 100% to commit
          </p>
        )}
      </div>
    </div>
  );
}
