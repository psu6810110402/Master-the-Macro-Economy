'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Award, ArrowRight, X, DollarSign, Activity } from 'lucide-react';

function getInsightSnippet(topSymbol: string, changePct: number, eventHeadline?: string) {
  if (changePct <= 0) return "Markets experienced a broad sell-off across most asset classes. Cash is king during severe downturns.";
  
  const hints: Record<string, string> = {
    'GOLD': 'Safe haven assets like Gold tend to outperform during market uncertainty or high inflation spikes.',
    'BTC': 'High volatility and risk-on sentiment fueled Crypto gains. Watch out for sudden drops.',
    'ETH': 'High volatility and risk-on sentiment fueled Crypto gains.',
    'TLT': 'Bonds perform well when interest rates drop or during flight-to-safety scenarios.',
    'AAPL': 'Growth and Tech stocks lead the market in favorable macroeconomic conditions (like low rates and high GDP).',
    'MSFT': 'Growth and Tech stocks lead the market in favorable macroeconomic conditions.',
    'OIL': 'Commodity and Industrial prices often rise with supply shocks or strong economic demand.',
  };
  
  return hints[topSymbol] || 'Capital rotated into outperforming sectors based on recent macroeconomic shifts.';
}

interface RoundResultProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    lastEvent?: { id: string; headline: string; description: string };
    previousRound: number;
    topGainer: { symbol: string; change: number };
    priceChanges: Record<string, { oldPrice: number; newPrice: number; changePct: number }>;
    portfolioChange?: { absolute: number; percent: number; newTotal: number };
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

            <div className={`grid grid-cols-1 md:grid-cols-${data.portfolioChange ? '3' : '2'} gap-6 mb-8`}>
              {/* Portfolio Performance */}
              {data.portfolioChange && (
                <div className="bg-[oklch(var(--bg-primary))] p-4 border border-[oklch(var(--border-subtle))] flex flex-col justify-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-3">Portfolio Change</div>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${data.portfolioChange.percent >= 0 ? 'bg-[oklch(var(--accent-up)/0.1)] text-[oklch(var(--accent-up))]' : 'bg-[oklch(var(--accent-down)/0.1)] text-[oklch(var(--accent-down))]'}`}>
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <div className="text-lg font-black font-mono tracking-tighter">${data.portfolioChange.newTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      <div className={`font-bold text-xs ${data.portfolioChange.percent >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                        {data.portfolioChange.percent >= 0 ? '+' : ''}${Math.abs(data.portfolioChange.absolute).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({data.portfolioChange.percent >= 0 ? '+' : ''}{data.portfolioChange.percent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Gainer */}
              <div className="bg-[oklch(var(--bg-primary))] p-4 border border-[oklch(var(--border-subtle))] flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-3">Top Performance</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[oklch(var(--accent-up)/0.1)] flex items-center justify-center shrink-0 text-[oklch(var(--accent-up))]">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-black font-mono tracking-tighter">{data.topGainer.symbol}</div>
                    <div className="text-[oklch(var(--accent-up))] font-bold text-xs">+{data.topGainer.change.toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              {/* Session Context: Market Event */}
              <div className="bg-[oklch(var(--bg-primary))] p-4 border border-[oklch(var(--border-subtle))] flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-2">Market Event</div>
                <div className="text-xs font-black uppercase tracking-tight text-[oklch(var(--accent-brand))] leading-tight mb-1">
                  {data.lastEvent?.headline || 'Market Volatility'}
                </div>
                <div className="text-xs font-medium leading-snug text-[oklch(var(--text-muted))]">
                  {data.lastEvent?.description || 'Broad market fluctuations detected.'}
                </div>
              </div>
            </div>

            {/* NEW: Insight Card (Learning Layer) */}
            <div className="mb-8 p-4 bg-[oklch(var(--accent-brand)/0.05)] border border-[oklch(var(--accent-brand)/0.3)]">
              <div className="flex items-start gap-4">
                <div className="mt-1 text-[oklch(var(--accent-brand))]">
                   <Activity size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[oklch(var(--accent-brand))] mb-1">Market Insight</div>
                  <div className="text-sm font-medium leading-relaxed">
                    <span className="font-bold text-[oklch(var(--text-primary))]">Best investment this round: {data.topGainer.symbol} ({data.topGainer.change >= 0 ? '+' : ''}{data.topGainer.change.toFixed(1)}%).</span> 
                    {' '}Macro Hint: {getInsightSnippet(data.topGainer.symbol, data.topGainer.change, data.lastEvent?.headline)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
              <div className="grid grid-cols-4 text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))] pb-2 border-b border-[oklch(var(--border-subtle))] px-2">
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
