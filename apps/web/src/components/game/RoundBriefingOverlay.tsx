'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Crosshair } from 'lucide-react';

interface RoundBriefingOverlayProps {
  isOpen: boolean;
  round: number;
  totalRounds: number;
  scenarioTitle?: string;
  onComplete?: () => void;
  autoAdvanceSeconds?: number;
}

/**
 * RoundBriefingOverlay — Full-screen cinematic transition between rounds.
 * Displays the round number and scenario context before trading opens.
 * Auto-advances after a configurable delay (default 5s).
 */
export default function RoundBriefingOverlay({
  isOpen,
  round,
  totalRounds,
  scenarioTitle = 'MARKET BRIEFING',
  onComplete,
  autoAdvanceSeconds = 5,
}: RoundBriefingOverlayProps) {
  const [countdown, setCountdown] = useState(autoAdvanceSeconds);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoAdvanceSeconds);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoAdvanceSeconds, onComplete]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[oklch(0.08_0.01_260)]"
        >
          {/* Scanline texture */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-20" />

          <div className="relative text-center max-w-2xl px-8">
            {/* Round indicator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3 mb-6"
            >
              <Crosshair size={14} className="text-[oklch(var(--accent-brand))]" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[oklch(var(--accent-brand))]">
                Incoming Transmission
              </span>
              <Crosshair size={14} className="text-[oklch(var(--accent-brand))]" />
            </motion.div>

            {/* Round number — the hero element */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', damping: 20 }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.6em] text-[oklch(var(--text-muted))] mb-3">
                Round
              </div>
              <div className="text-[120px] font-black italic leading-none tracking-tighter">
                {round}
                <span className="text-[oklch(var(--text-muted))] text-4xl font-normal not-italic">/{totalRounds}</span>
              </div>
            </motion.div>

            {/* Scenario subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 mb-12"
            >
              <div className="text-lg font-black uppercase tracking-[0.15em] text-[oklch(var(--text-secondary))]">
                {scenarioTitle}
              </div>
            </motion.div>

            {/* Auto-advance countdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-[10px] font-black uppercase tracking-[0.4em] text-[oklch(var(--text-muted))]"
            >
              Market opens in {countdown}s
            </motion.div>

            {/* Skip button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-6"
            >
              <button
                onClick={onComplete}
                className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] border border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--accent-brand))] hover:text-[oklch(var(--accent-brand))] transition-colors"
              >
                Skip Briefing →
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
