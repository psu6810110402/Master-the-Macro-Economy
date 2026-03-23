'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CountdownHUDProps {
  seconds: number;
  totalSeconds: number;
  isActive: boolean;
  className?: string;
}

/**
 * CountdownHUD — Circular countdown timer with progress ring and danger pulse.
 * 
 * Visual States:
 * - Normal (>30s): Calm cyan ring
 * - Warning (<30s): Amber pulse  
 * - Danger (<10s): Red pulse + screen-edge vignette
 */
export default function CountdownHUD({ seconds, totalSeconds, isActive, className = '' }: CountdownHUDProps) {
  const progress = totalSeconds > 0 ? seconds / totalSeconds : 0;
  const isDanger = seconds <= 10 && seconds > 0;
  const isWarning = seconds <= 30 && seconds > 10;
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // SVG circle dimensions
  const size = 140;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Danger vignette — covers parent container edges */}
      {isDanger && isActive && (
        <motion.div
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="fixed inset-0 pointer-events-none z-[90]"
          style={{
            boxShadow: 'inset 0 0 120px 40px oklch(0.55 0.25 25 / 0.6)',
          }}
        />
      )}

      {/* Ring container */}
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="oklch(0.25 0.01 260)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={
              isDanger ? 'oklch(0.65 0.25 25)' :
              isWarning ? 'oklch(0.75 0.17 75)' :
              'oklch(0.75 0.15 195)'
            }
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            animate={{
              strokeDashoffset: dashOffset,
              opacity: isDanger ? [1, 0.5, 1] : 1,
            }}
            transition={{
              strokeDashoffset: { type: 'tween', ease: 'linear', duration: 0.5 },
              opacity: isDanger ? { duration: 0.6, repeat: Infinity } : {},
            }}
          />
        </svg>

        {/* Center time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className={`text-3xl font-black font-mono tabular-nums tracking-tight leading-none ${
              isDanger ? 'text-[oklch(0.65_0.25_25)]' : 
              isWarning ? 'text-[oklch(0.75_0.17_75)]' : ''
            }`}
          >
            {timeStr}
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] mt-1">
            {!isActive ? 'STANDBY' : isDanger ? 'CLOSING' : 'REMAINING'}
          </span>
        </div>
      </div>
    </div>
  );
}
