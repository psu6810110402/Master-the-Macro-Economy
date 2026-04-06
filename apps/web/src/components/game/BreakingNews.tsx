'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, TrendingUp, TrendingDown, Zap, 
  Activity, Percent, BarChart3, ShieldAlert 
} from 'lucide-react';

interface MacroData {
  interestRate: number;
  inflation: number;
  gdpGrowth: number;
  volatility?: number;
  blackSwanActive?: boolean;
  blackSwanEvent?: string;
}

interface BreakingNewsProps {
  isOpen: boolean;
  headline: string;
  description: string;
  round: number;
  macro: MacroData;
  onDismiss?: () => void;
}

export default function BreakingNews({ isOpen, headline, description, round, macro, onDismiss }: BreakingNewsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="relative w-full max-w-3xl"
          >
            {/* Flashing Banner */}
            <motion.div 
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center justify-center gap-3 py-3 bg-[oklch(var(--status-error))] text-white text-[10px] font-black uppercase tracking-[0.5em] mb-0"
            >
              <AlertTriangle size={14} />
              BREAKING NEWS // ROUND {round}
              <AlertTriangle size={14} />
            </motion.div>

            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] border-t-0 p-10 space-y-8">
              
              {/* Headline */}
              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-[0.95] mb-4"
                >
                  {headline}
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-[oklch(var(--text-muted))] leading-relaxed max-w-xl"
                >
                  {description}
                </motion.p>
              </div>

              {/* Macro Indicators Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                <MacroCard 
                  label="Interest Rate" 
                  value={`${macro.interestRate.toFixed(1)}%`}
                  icon={<Percent size={16} />}
                  color={macro.interestRate > 5 ? 'error' : macro.interestRate > 3 ? 'warning' : 'success'}
                />
                <MacroCard 
                  label="Inflation" 
                  value={`${macro.inflation.toFixed(1)}%`}
                  icon={<TrendingUp size={16} />}
                  color={macro.inflation > 8 ? 'error' : macro.inflation > 5 ? 'warning' : 'success'}
                />
                <MacroCard 
                  label="GDP Growth" 
                  value={`${macro.gdpGrowth >= 0 ? '+' : ''}${macro.gdpGrowth.toFixed(1)}%`}
                  icon={<BarChart3 size={16} />}
                  color={macro.gdpGrowth < 0 ? 'error' : macro.gdpGrowth < 1 ? 'warning' : 'success'}
                />
                <MacroCard 
                  label="Volatility" 
                  value={macro.volatility ? `${(macro.volatility * 100).toFixed(0)}%` : 'NORMAL'}
                  icon={<Activity size={16} />}
                  color={(macro.volatility || 0) > 0.5 ? 'error' : 'brand'}
                />
              </motion.div>

              {/* Black Swan Alert */}
              {macro.blackSwanActive && (
                <motion.div 
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ delay: 1.0 }}
                  className="flex items-center gap-4 p-5 bg-[oklch(var(--status-error)/0.1)] border border-[oklch(var(--status-error)/0.4)]"
                >
                  <ShieldAlert size={24} className="text-[oklch(var(--status-error))] flex-shrink-0" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--status-error))] mb-1">
                      Black Swan Event Active
                    </div>
                    <div className="text-sm font-bold text-[oklch(var(--text-secondary))]">
                      {macro.blackSwanEvent || 'Unprecedented market disruption detected. Exercise extreme caution.'}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Dismiss */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex justify-center"
              >
                {onDismiss ? (
                  <button 
                    onClick={onDismiss}
                    className="px-12 py-4 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] hover:bg-[oklch(var(--accent-brand))] hover:text-white transition-all"
                  >
                    Analyze & Trade →
                  </button>
                ) : (
                  <div className="px-12 py-4 bg-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))] font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">
                    Awaiting Market Open...
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MacroCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'success' | 'error' | 'warning' | 'brand' }) {
  const colorMap = {
    success: 'text-[oklch(var(--status-success))] border-[oklch(var(--status-success)/0.3)]',
    error: 'text-[oklch(var(--status-error))] border-[oklch(var(--status-error)/0.3)]',
    warning: 'text-[oklch(var(--status-warning))] border-[oklch(var(--status-warning)/0.3)]',
    brand: 'text-[oklch(var(--accent-brand))] border-[oklch(var(--accent-brand)/0.3)]',
  };

  return (
    <div className={`p-4 border bg-[oklch(var(--bg-main))] ${colorMap[color]}`}>
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-2">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`text-xl font-black tabular-nums tracking-tight ${colorMap[color].split(' ')[0]}`}>
        {value}
      </div>
    </div>
  );
}
