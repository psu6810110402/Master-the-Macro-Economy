'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Award, ArrowRight, X } from 'lucide-react';

interface RoundResultProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    lastEvent?: { id: string; headline: string; description: string };
    previousRound: number;
    topGainer: { symbol: string; change: number };
    priceChanges: Record<string, { oldPrice: number; newPrice: number; changePct: number }>;
  } | null;
  role?: 'PLAYER' | 'FACILITATOR' | null;
  onOpenMarket?: () => void;
}

export default function RoundResultModal({ isOpen, onClose, data, role, onOpenMarket }: RoundResultProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[oklch(var(--bg-primary)/0.9)] backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-8 overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[oklch(var(--accent-brand)/0.1)] blur-3xl rounded-full -mr-32 -mt-32" />

            <div className="flex justify-between items-start mb-12">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[oklch(var(--accent-brand))] mb-2 flex items-center gap-2">
                  <Award size={14} />
                  Round {data.previousRound} Complete
                </div>
                <h2 className="text-5xl font-black font-display tracking-tight uppercase leading-none">
                  Closing Bell
                </h2>
              </div>
              {role === 'FACILITATOR' && (
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-[oklch(var(--bg-primary))] transition-colors border border-transparent hover:border-[oklch(var(--border-subtle))]"
                >
                  <X size={24} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
              {/* Top Gainer */}
              <div className="bg-[oklch(var(--bg-primary))] p-6 border border-[oklch(var(--border-subtle))]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-4">Top Performance</div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[oklch(var(--accent-up)/0.1)] flex items-center justify-center text-[oklch(var(--accent-up))]">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-black font-mono tracking-tighter">{data.topGainer.symbol}</div>
                    <div className="text-[oklch(var(--accent-up))] font-bold text-lg">+{data.topGainer.change.toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              {/* Session Context: Market Event */}
              <div className="bg-[oklch(var(--bg-primary))] p-6 border border-[oklch(var(--border-subtle))] flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-2">Market Event</div>
                <div className="text-xs font-black tracking-tight uppercase text-[oklch(var(--accent-brand))] leading-tight mb-1">
                  {data.lastEvent?.headline || 'MARKET VOLATILITY'}
                </div>
                <div className="text-[9px] uppercase font-medium tracking-tight opacity-60 leading-tight">
                  {data.lastEvent?.description || 'Broad market fluctuations detected.'}
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
              <div className="grid grid-cols-4 text-[9px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))] pb-2 border-b border-[oklch(var(--border-subtle))] px-2">
                <span>Asset</span>
                <span className="text-right">Open</span>
                <span className="text-right">Close</span>
                <span className="text-right">Change</span>
              </div>
              {Object.entries(data.priceChanges).map(([symbol, delta]) => (
                <div key={symbol} className="grid grid-cols-4 items-center p-2 border-b border-[oklch(var(--border-subtle)/0.5)] last:border-0 font-mono text-xs">
                  <span className="font-black tracking-tighter uppercase">{symbol}</span>
                  <span className="text-right opacity-40">${delta.oldPrice.toFixed(2)}</span>
                  <span className="text-right font-bold">${delta.newPrice.toFixed(2)}</span>
                  <span className={`text-right font-bold ${delta.changePct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                    {delta.changePct >= 0 ? '+' : ''}{delta.changePct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-end">
              {role === 'FACILITATOR' ? (
                <button 
                  onClick={() => {
                    if (onOpenMarket) onOpenMarket();
                    onClose();
                  }}
                  className="flex items-center gap-3 bg-[oklch(var(--accent-brand))] text-[oklch(var(--bg-primary))] px-8 py-4 font-black uppercase text-xs tracking-widest hov-scale"
                >
                  Open Market for Trading
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))] px-8 py-4 font-black uppercase text-xs tracking-widest animate-pulse cursor-not-allowed">
                  Awaiting Market Open...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
