'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Shield, Users, Zap, ArrowLeft, Bot, Activity } from 'lucide-react';
import { Button } from '@hackanomics/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

const MANUAL_CONTENT: Record<string, { title: string; icon: any; sections: { title: string; content: string[] }[] }> = {
  player: {
    title: "Operative Handbook (Player)",
    icon: <Users size={32} />,
    sections: [
      {
        title: "01. Mission Objective",
        content: [
          "Your goal is to survive a high-stakes, real-time macroeconomic simulation across 5 to 15 rounds.",
          "You must allocate capital across 7 distinct asset classes, predicting how breaking news, interest rates, and inflation will impact their valuations.",
          "Profits alone won't win the simulation. Your risk-adjusted return (Sharpe Ratio) and maximum drawdown are equally vital."
        ]
      },
      {
        title: "02. The Tactical HUD & Execution Timer",
        content: [
          "Every round features a strict countdown. The circular HUD represents your execution window.",
          "CYAN/NORMAL: You have time to analyze the market and adjust allocation sliders.",
          "AMBER/WARNING: Under 30 seconds remaining. Finalize your strategy.",
          "RED/DANGER: Under 10 seconds. The screen will vignette red. You MUST click 'Execute Orders' before the timer expires.",
          "If the lockdown screen ('EXECUTING ORDERS') appears before you submit, your previous round's position is auto-locked. No exceptions."
        ]
      },
      {
        title: "03. Asset Class Sensitivities",
        content: [
          "TECH: High growth multipliers. Highly vulnerable to interest rate hikes.",
          "INDUSTRIAL & CONSUMER: The backbone of the economy. Sensitive to GDP swings and demand shocks.",
          "BONDS: The ultimate safe haven. Values scale with interest rates. Stable during market crashes.",
          "GOLD: The inflation hedge. When CPI spikes and fiat currency loses value, capital flees here.",
          "CRYPTO: Maximum volatility. Thrives in low-rate, high-liquidity environments but crashes hard during panics.",
          "CASH: Yields 0%. Use only as a temporary bunker when all other assets are collapsing."
        ]
      },
      {
        title: "04. Post-Game: Gemini AI Analyst",
        content: [
          "When the simulation concludes, Google's Gemini 1.5 Flash AI will conduct a batch analysis of your entire trading history.",
          "The AI operates as a strict financial reviewer. It will roast your mistakes, grade your Sharpe Ratio, and highlight missed opportunities.",
          "In Hackanomics 2026, the AI's final letter grade stands as your ultimate operative evaluation."
        ]
      }
    ]
  },
  facilitator: {
    title: "Command Console Guide (Facilitator)",
    icon: <Zap size={32} />,
    sections: [
      {
        title: "01. Simulation Orchestration",
        content: [
          "As the Facilitator, you hold absolute control over the simulation parameters.",
          "Share the Session Code. Watch the 'Live Simulation Roster' to confirm up to 50 operatives are connected (Status: X/50 JOINED).",
          "Ensure the Network Heartbeat is stable before initializing the market."
        ]
      },
      {
        title: "02. Capital Flow Monitoring",
        content: [
          "Use the 'Capital Flow Monitor' heatmap in the center of your dashboard.",
          "This real-time stacked bar chart aggregates the allocations of all connected operatives.",
          "Use this intelligence to weaponize your next move. For example, if 80% of capital is in TECH, hitting them with an 'Interest Rate Shock' will maximize casualties."
        ]
      },
      {
        title: "03. Injecting Black Swans",
        content: [
          "Between rounds, bypass the deterministic engine by injecting 'Mission Protocols' (e.g., Hyperinflation, Tech Bubble Burst).",
          "Injecting an event instantly broadcasts cinematic 'Breaking News' to all operative terminals via WebSocket.",
          "To trigger a Black Swan, toggle the red switch. This will lock macro variables and force a crisis simulation."
        ]
      }
    ]
  },
  admin: {
    title: "Director Terminal Overview (Admin)",
    icon: <Shield size={32} />,
    sections: [
      {
        title: "01. System Integrity & Telemetry",
        content: [
          "Admins supervise the overarching infrastructure of the Hackanomics engine.",
          "Monitor Socket.IO connection pools and ensure Redis/PostgreSQL clusters aren't experiencing thread starvation during high-frequency execution rounds.",
          "Audit API latency to the Gemini 1.5 Flash endpoint during the Post-Game Analysis phase."
        ]
      },
      {
        title: "02. User Access & Compliance",
        content: [
          "Upgrade standard operatives to Facilitator clearance via the user table.",
          "Sanitize defunct sessions and ensure orphaned data is swept to comply with PDPA/GDPR simulated guidelines."
        ]
      }
    ]
  }
};

export default function ManualPage() {
  const params = useParams();
  const role = (params.role as string)?.toLowerCase() || 'player';
  const content = MANUAL_CONTENT[role] || MANUAL_CONTENT.player;

  return (
    <DashboardLayout title="Intelligence Archive">
      <div className="max-w-4xl mx-auto py-12 px-6">
        <Link href="/lobby">
          <Button variant="ghost" className="mb-8 text-[oklch(var(--text-muted))] hover:text-white flex items-center gap-2 uppercase tracking-widest text-[10px] font-black">
            <ArrowLeft size={14} /> Return to Terminal
          </Button>
        </Link>

        <header className="mb-16 flex items-center gap-6">
          <div className="p-4 bg-[oklch(var(--bg-main))] text-[oklch(var(--accent-brand))] border border-[oklch(var(--border-strong))] shadow-[0_0_20px_oklch(var(--accent-brand)/0.1)]">
            {content.icon}
          </div>
          <div>
            <div className="inline-block px-2 py-0.5 mb-3 bg-[oklch(var(--accent-brand)/0.1)] border border-[oklch(var(--accent-brand)/0.3)] text-[9px] font-black uppercase tracking-[0.4em] text-[oklch(var(--accent-brand))]">
              Intel Classification: Level {role === 'admin' ? '3' : role === 'facilitator' ? '2' : '1'}
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">{content.title}</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12">
          {content.sections.map((section, i) => (
            <motion.section 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-black uppercase tracking-widest border-l-4 border-[oklch(var(--accent-brand))] pl-4 text-white">
                {section.title}
              </h2>
              <ul className="space-y-4">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-4 group">
                    <div className="mt-2 w-1.5 h-1.5 shrink-0 bg-[oklch(var(--border-strong))] group-hover:bg-[oklch(var(--accent-brand))] group-hover:scale-150 transition-all duration-300" />
                    <p className="text-sm md:text-base text-[oklch(var(--text-muted))] font-medium leading-relaxed group-hover:text-[oklch(var(--text-primary))] transition-colors duration-300">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>

        <footer className="mt-20 pt-12 border-t border-[oklch(var(--border-strong))]">
          <div className="p-8 bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <BookOpen size={24} className="text-[oklch(var(--accent-brand))]" />
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-white">Need further intel?</div>
                <div className="text-[9px] text-[oklch(var(--text-muted))] uppercase tracking-widest mt-1">Contact your sector supervisor for priority support.</div>
              </div>
            </div>
            
            <div className="flex gap-4">
              {role !== 'player' && (
                <Link href="/manuals/player">
                  <Button className="bg-[oklch(var(--bg-secondary))] text-[oklch(var(--text-muted))] border border-[oklch(var(--border-strong))] font-black uppercase tracking-widest text-[9px] px-6 h-10 hover:border-[oklch(var(--accent-brand))] transition-all">
                    View Player Manual
                  </Button>
                </Link>
              )}
              {role !== 'facilitator' && (
                <Link href="/manuals/facilitator">
                  <Button className="bg-[oklch(var(--bg-secondary))] text-[oklch(var(--text-muted))] border border-[oklch(var(--border-strong))] font-black uppercase tracking-widest text-[9px] px-6 h-10 hover:border-[oklch(var(--accent-brand))] transition-all">
                    View Facilitator Manual
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}
