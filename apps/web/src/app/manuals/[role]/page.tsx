'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Shield, Users, Zap, ArrowLeft, Target, TrendingUp, Activity } from 'lucide-react';
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
        title: "Mission Objective",
        content: [
          "Your goal is to maximize your portfolio's value and Sharpe Ratio across 5-15 rounds of economic simulation.",
          "Survival depends on understanding how global macro variables (Interest Rates, Inflation, GDP) affect your assets.",
          "Perform better than other operatives to climb the session leaderboard."
        ]
      },
      {
        title: "Trading Protocols",
        content: [
          "Every round, you have a limited time to rebalance your portfolio.",
          "Your total allocation must always equal 100%. Use the sliders to adjust your holdings.",
          "Click 'EXECUTE TRADE' before the timer expires to commit your position.",
          "If you miss the deadline, the system will auto-lock your previous position or default to CASH."
        ]
      },
      {
        title: "Asset Sensitivity",
        content: [
          "STOCKS: High growth potential, sensitive to GDP and stable rates.",
          "BONDS: Safe havens, yields rise with interest rates, stable during recessions.",
          "GOLD/COMMODITIES: Best hedges against high inflation.",
          "CRYPTO: extreme volatility, thrives in high-liquidity (low rate) environments."
        ]
      },
      {
        title: "Scoring Intelligence",
        content: [
          "SHARPE RATIO: Measures risk-adjusted return. Higher is better.",
          "MAX DRAWDOWN: The largest peak-to-trough drop in your portfolio value.",
          "DIVERSITY INDEX: Ensures you aren't over-concentrated in a single asset.",
          "FINAL SCORE: A weighted calculation of the above metrics."
        ]
      }
    ]
  },
  facilitator: {
    title: "Command Console Guide (Facilitator)",
    icon: <Zap size={32} />,
    sections: [
      {
        title: "Session Control",
        content: [
          "As a Facilitator, you orchestrate the simulation. Create a session and share the Join Code with players.",
          "Choose the format: SHORT (5 rounds), STANDARD (10 rounds), or FULL (15 rounds).",
          "You must manually 'Start Simulation' once all players have joined."
        ]
      },
      {
        title: "Market Manipulation",
        content: [
          "Between rounds, you can inject 'Black Swan' events to test player resilience.",
          "Use the News Editor to customize the narrative for the next round.",
          "Use 'Custom Sliders' to override the deterministic engine and force specific macro conditions."
        ]
      },
      {
        title: "Advanced Tactics",
        content: [
          "Force Skip: Use this to lock all uncommitted players if the group is ready before the timer ends.",
          "Monitor the 'Live Operative Roster' to see who is struggling or dominating in real-time.",
          "PDPA Compliance: Player data is anonymized after the session concludes."
        ]
      }
    ]
  },
  admin: {
    title: "Director Terminal Overview (Admin)",
    icon: <Shield size={32} />,
    sections: [
      {
        title: "System Integrity",
        content: [
          "Admins have full visibility into the system diagnostics and database health.",
          "Monitor active sessions across the entire platform.",
          "Audit PDPA log sweeps and data retention schedules."
        ]
      },
      {
        title: "User Management",
        content: [
          "Promote or demote users to Facilitator roles.",
          "Manage global news templates and asset sensitivity constants (DB only).",
          "Reset passwords and handle account security overrides."
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
            <ArrowLeft size={14} /> Back to Terminal
          </Button>
        </Link>

        <header className="mb-16 flex items-center gap-6">
          <div className="p-4 bg-[oklch(var(--accent-brand)/0.1)] text-[oklch(var(--accent-brand))] border border-[oklch(var(--accent-brand)/0.3)]">
            {content.icon}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[oklch(var(--text-muted))] mb-2">Intel Classification: Level {role === 'admin' ? '3' : role === 'facilitator' ? '2' : '1'}</div>
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
              <h2 className="text-xl font-black uppercase tracking-widest border-l-4 border-[oklch(var(--accent-brand))] pl-4">
                {section.title}
              </h2>
              <ul className="space-y-4">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-4 group">
                    <div className="mt-1.5 w-1.5 h-1.5 shrink-0 bg-[oklch(var(--accent-brand))] group-hover:scale-150 transition-transform" />
                    <p className="text-sm md:text-base text-[oklch(var(--text-muted))] font-medium leading-relaxed">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>

        <footer className="mt-20 pt-12 border-t border-[oklch(var(--border-subtle))]">
          <div className="p-8 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <BookOpen size={24} className="text-[oklch(var(--accent-brand))]" />
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-white">Need further assistance?</div>
                <div className="text-[9px] text-[oklch(var(--text-muted))] uppercase tracking-widest mt-1">Contact your sector supervisor for priority support.</div>
              </div>
            </div>
            <Link href="/manuals/player">
              <Button className="bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 h-10 hover:bg-[oklch(var(--accent-brand))] hover:text-white transition-all">
                Access All Manuals
              </Button>
            </Link>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}
