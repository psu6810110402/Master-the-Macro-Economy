'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lock } from 'lucide-react';

interface MarketClosedOverlayProps {
  isOpen: boolean;
}

/**
 * MarketClosedOverlay — Full-screen lock displayed when the trading window closes.
 * Prevents interaction and shows "EXECUTING ORDERS..." while the engine processes.
 */
export default function MarketClosedOverlay({ isOpen }: MarketClosedOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-6"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mx-auto w-12 h-12 border-2 border-[oklch(var(--accent-brand))] border-t-transparent rounded-full"
            />
            
            <div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Lock size={16} className="text-[oklch(var(--accent-brand))]" />
                <span className="text-sm font-black uppercase tracking-[0.3em]">
                  Market Closed
                </span>
              </div>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[10px] font-black uppercase tracking-[0.5em] text-[oklch(var(--text-muted))]"
              >
                Executing Orders...
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
