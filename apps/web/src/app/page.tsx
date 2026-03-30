'use client';

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Shield, TrendingUp, Users, Activity,
  Zap, BarChart3, Cpu, Bot, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import AuthModal from '@/components/auth/AuthModal';

// ─── DATA ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Cpu size={18} />,
    tag: 'ENGINE',
    title: 'Macro Simulation',
    desc: 'A deterministic engine models interest rates, inflation, and GDP growth to generate realistic price action across 7 asset classes every round.',
  },
  {
    icon: <Bot size={18} />,
    tag: 'AI',
    title: 'Gemini AI Analyst',
    desc: 'Post-game, Google Gemini 1.5 Flash analyzes your Sharpe Ratio, drawdown, and allocation history — generating a personalized performance critique.',
  },
  {
    icon: <Zap size={18} />,
    tag: 'HUD',
    title: 'Real-Time Interface',
    desc: 'Zero race-conditions. Live price tickers, an animated countdown, and WebSocket-driven leaderboard updates keep every second high-stakes.',
  },
  {
    icon: <BarChart3 size={18} />,
    tag: 'SCORING',
    title: 'Risk-Adjusted Scoring',
    desc: 'Profits alone don\'t win. The engine rewards risk-adjusted returns — Sharpe Ratio and max drawdown determine your final ranking.',
  },
];

const ASSET_CLASSES = ['TECH', 'INDUSTRIAL', 'BONDS', 'GOLD', 'CRYPTO', 'REAL ESTATE', 'CASH'];

const MACRO_TICKER = [
  { label: 'FED FUNDS RATE', value: '5.25%', delta: '+25bps', up: true },
  { label: 'CORE CPI', value: '3.1%', delta: '-0.2%', up: false },
  { label: 'REAL GDP', value: '2.4%', delta: '+0.1%', up: true },
  { label: 'VIX INDEX', value: '18.4', delta: '-1.2', up: false },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const fadeLeft = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const fadeRight = {
  hidden: { opacity: 0, x: 28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

// ─── PAGE ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const router = useRouter();

  useEffect(() => {
    api.get<{ role: string }>('auth/me').then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <main className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] overflow-x-hidden font-sans">

      <Navbar onAuthClick={() => setIsAuthOpen(true)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Subtle background glow */}
      <div className="fixed top-0 left-[-20%] w-[60vw] h-[60vw] bg-[oklch(var(--accent-brand)/0.03)] blur-[200px] rounded-full pointer-events-none z-0" />

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 md:px-12 pt-24 overflow-hidden">
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-6xl mx-auto w-full"
        >
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-3xl"
          >
            {/* Status badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 border border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary)/0.6)] mb-8">
              <Activity size={11} className="text-[oklch(var(--accent-brand))] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[oklch(var(--text-muted))]">
                Hackanomics 2026
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp} className="text-fluid-h1 font-black leading-[0.9] tracking-tighter mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}>
              Survive the<br />
              <span className="text-[oklch(var(--text-secondary))]">Market.</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p variants={fadeUp} className="text-base md:text-lg text-[oklch(var(--text-muted))] leading-relaxed max-w-lg mb-10" style={{ fontWeight: 450 }}>
              A real-time macroeconomic trading simulation. Allocate capital across 7 asset classes, survive Black Swan events, and earn an AI-graded performance report.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Button
                onClick={() => setIsAuthOpen(true)}
                className="group h-12 px-8 bg-[oklch(var(--text-primary))] text-[oklch(var(--bg-main))] font-black uppercase tracking-[0.15em] text-xs hover:bg-white transition-colors flex items-center gap-3"
              >
                Get Started
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                onClick={() => router.push('/#about')}
                className="h-12 px-8 bg-transparent border border-[oklch(var(--border-subtle))] text-[oklch(var(--text-secondary))] font-bold uppercase tracking-[0.15em] text-xs hover:border-[oklch(var(--border-strong))] hover:bg-[oklch(var(--bg-secondary)/0.5)] transition-all"
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          {/* Asset class chips */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.5 }}
            className="mt-14 flex flex-wrap gap-2"
          >
            {ASSET_CLASSES.map((a) => (
              <span
                key={a}
                className="px-3 py-1 border border-[oklch(var(--border-subtle))] text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]"
              >
                {a}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── TICKER BAR ── */}
      <section className="relative z-10 border-y border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary)/0.4)] backdrop-blur-sm overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="flex whitespace-nowrap"
        >
          {[...MACRO_TICKER, ...MACRO_TICKER, ...MACRO_TICKER, ...MACRO_TICKER].map((item, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-4 px-8 py-4 border-r border-[oklch(var(--border-subtle)/0.5)]">
              <span className="text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">{item.label}</span>
              <span className="text-sm font-black tabular-nums">{item.value}</span>
              <span className={`text-[10px] font-black tabular-nums ${item.up ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                {item.delta}
              </span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="relative z-10 py-28 px-6 md:px-12">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          <motion.div variants={fadeLeft} className="space-y-6">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[oklch(var(--accent-brand))]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">About</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              What is<br />Hackanomics?
            </h2>
            <div className="space-y-4 text-[oklch(var(--text-secondary))] text-sm leading-relaxed" style={{ fontWeight: 450 }}>
              <p>
                Hackanomics is an <strong className="text-[oklch(var(--text-primary))] font-bold">institutional-grade financial simulation</strong> built for the Hackonomics 2026 competition. It turns financial literacy into a live, high-pressure trading experience.
              </p>
              <p>
                Players act as fund managers — reading breaking macro news, inflation data, and rate movements — then allocating capital across 7 asset classes before the clock runs out.
              </p>
              <p>
                At the end of 5 rounds, <span className="text-[oklch(var(--accent-up))] font-bold">Google Gemini</span> grades your portfolio's risk-adjusted performance with a personalised critique.
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeRight} className="grid grid-cols-2 gap-3">
            {[
              { value: '7', label: 'Asset Classes' },
              { value: '5', label: 'Rounds' },
              { value: 'AI', label: 'Gemini Feedback' },
              { value: '∞', label: 'Scenarios' },
            ].map((stat) => (
              <div key={stat.label} className="p-6 border border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary)/0.3)]">
                <div className="text-4xl font-black tabular-nums tracking-tighter mb-1">{stat.value}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 py-28 px-6 md:px-12 border-t border-[oklch(var(--border-subtle)/0.5)]">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={fadeUp} className="mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">Features</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight max-w-sm">
              Built for realism.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[oklch(var(--border-subtle)/0.5)]">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.tag}
                variants={fadeUp}
                className="bg-[oklch(var(--bg-main))] p-8 group hover:bg-[oklch(var(--bg-secondary)/0.4)] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 border border-[oklch(var(--border-subtle))] flex items-center justify-center text-[oklch(var(--accent-brand))] shrink-0 group-hover:border-[oklch(var(--accent-brand)/0.5)] transition-colors">
                    {f.icon}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[oklch(var(--accent-brand))]">{f.tag}</span>
                    </div>
                    <h3 className="text-base font-black tracking-tight">{f.title}</h3>
                    <p className="text-sm text-[oklch(var(--text-muted))] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative z-10 py-28 px-6 md:px-12 border-t border-[oklch(var(--border-subtle)/0.5)] bg-[oklch(var(--bg-secondary)/0.2)]">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={fadeUp} className="mb-12">
            <span className="text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mt-3 max-w-sm">
              A session in 4 steps.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', title: 'Join Session', body: 'Facilitator shares a 6-character code. Enter it in the lobby to join the live simulation.' },
              { n: '02', title: 'Read the News', body: 'Each round opens with a Breaking News event — macro shocks, rate changes, or Black Swan events.' },
              { n: '03', title: 'Allocate Capital', body: 'Drag sliders to allocate your portfolio across 7 asset classes. Lock in before the timer hits zero.' },
              { n: '04', title: 'Get Your Grade', body: 'After 5 rounds, Gemini AI evaluates your risk-adjusted return and delivers a personalised critique.' },
            ].map((step) => (
              <motion.div key={step.n} variants={fadeUp} className="border-t-2 border-[oklch(var(--border-subtle))] pt-5">
                <div className="text-3xl font-black tabular-nums text-[oklch(var(--border-strong))] mb-4">{step.n}</div>
                <h3 className="text-sm font-black uppercase tracking-wide mb-2">{step.title}</h3>
                <p className="text-sm text-[oklch(var(--text-muted))] leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-28 px-6 md:px-12 border-t border-[oklch(var(--border-subtle)/0.5)]">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10"
        >
          <motion.div variants={fadeLeft} className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Ready to trade?
            </h2>
            <p className="text-[oklch(var(--text-muted))] text-sm max-w-md leading-relaxed">
              Create an account and join the next live simulation session.
            </p>
          </motion.div>

          <motion.div variants={fadeRight} className="flex flex-wrap gap-3 shrink-0">
            <Button
              onClick={() => setIsAuthOpen(true)}
              className="group h-12 px-10 bg-[oklch(var(--text-primary))] text-[oklch(var(--bg-main))] font-black uppercase tracking-[0.15em] text-xs hover:bg-white transition-colors flex items-center gap-3"
            >
              Sign Up Free
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STAFF PORTAL ── */}
      <section className="relative z-10 py-8 px-6 md:px-12 border-t border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary)/0.2)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-[oklch(var(--text-muted))]" />
            <div>
              <div className="text-sm font-bold text-[oklch(var(--text-secondary))]">Staff Access</div>
              <div className="text-xs text-[oklch(var(--text-muted))]">Facilitators and Administrators only.</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="h-9 px-5 text-xs font-bold uppercase tracking-widest border border-[oklch(var(--border-subtle))] text-[oklch(var(--text-secondary))] hover:border-[oklch(var(--border-strong))] hover:bg-[oklch(var(--bg-secondary)/0.5)] transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/register')}
              className="h-9 px-5 text-xs font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] hover:text-[oklch(var(--text-secondary))] transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary)/0.1)]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-xs italic text-black">H</div>
            <span className="font-black text-xs uppercase tracking-[0.2em]">Hackanomics</span>
          </div>
          <div className="text-[11px] text-[oklch(var(--text-muted))] font-medium">
            © 2026 Aphichat Jahyo. All rights reserved.
          </div>
        </div>
      </footer>

    </main>
  );
}
