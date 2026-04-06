'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopBarTickerProps {
  prices: Record<string, number>;
  previousPrices: Record<string, number>;
  className?: string;
}

/**
 * TopBarTicker — Scrolling price ticker showing real-time asset price changes.
 * Displays asset symbols with up/down indicators and percentage change.
 */
export default function TopBarTicker({ prices, previousPrices, className = '' }: TopBarTickerProps) {
  const entries = Object.entries(prices).filter(([key]) => key !== 'CASH');
  
  if (entries.length === 0) return null;

  return (
    <div className={`overflow-hidden border-b border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary))] ${className}`}>
      <motion.div 
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap py-2"
      >
        {/* Duplicate for seamless loop */}
        {[...entries, ...entries].map(([symbol, price], i) => {
          const prevPrice = previousPrices[symbol] || price;
          const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
          const isUp = change >= 0;

          return (
            <div
              key={`${symbol}-${i}`}
              className="inline-flex items-center gap-2 px-6"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">
                {symbol}
              </span>
              <span className="text-[10px] font-black font-mono tabular-nums">
                ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-[9px] font-black font-mono ${
                isUp ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'
              }`}>
                {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-[oklch(var(--border-subtle))] mx-2">·</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
