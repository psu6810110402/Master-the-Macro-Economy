'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Shield, ShieldCheck, LogIn, TrendingUp,
  Users, Globe2, Activity, Zap, BarChart3, Fingerprint, Cpu
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import AuthModal from '@/components/auth/AuthModal';

interface User {
  role: string;
}

// ─── DATA & CONSTANTS ────────────────────────────────────────────────────

const INTELLIGENCE_REPORTS = [
  {
    icon: <Cpu size={20} />,
    title: "MACRO ENGINE v2.0",
    desc: "A custom-built deterministic simulation engine modeling r, π, and g with high-fidelity asset sensitivity."
  },
  {
    icon: <Shield size={20} />,
    title: "BLACK SWAN PROTOCOLS",
    desc: "Unpredictable disasters injected by facilitators to test risk management and operative resilience."
  },
  {
    icon: <BarChart3 size={20} />,
    title: "SCORING INTELLIGENCE",
    desc: "Rankings determined by Sharpe Ratios, Max Drawdown, and Diversification—not just raw profit."
  }
];

const SCORING_METRICS = [
  { label: "SHARPE RATIO", value: "3.42", color: "text-[oklch(var(--status-success))]" },
  { label: "MAX DRAWDOWN", value: "-4.1%", color: "text-[oklch(var(--status-success))]" },
  { label: "DIVERSITY INDEX", value: "0.89", color: "text-[oklch(var(--accent-brand))]" },
  { label: "HHI CONCENTRATION", value: "LOW", color: "text-[oklch(var(--status-success))]" },
];

// Deleted mock global rankings to stick to per-session spec

const MACRO_INDICATORS = [
  { label: "FED_FUNDS_RATE", value: "5.25%", delta: "+25bps", status: "STABLE" },
  { label: "CORE_CPI_INDEX", value: "3.1%", delta: "-0.2%", status: "EASING" },
  { label: "REAL_GDP_NOW", value: "2.4%", delta: "+0.1%", status: "GROWTH" },
];

// ─── LANDING PAGE COMPONENT ──────────────────────────────────────────────

export default function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.05]);
  const heroY = useTransform(scrollY, [0, 600], [0, 100]);

  useEffect(() => {
    api.get<User>('auth/me').then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMetricIndex((prev) => (prev + 1) % SCORING_METRICS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] selection:bg-[oklch(var(--accent-brand)/0.3)] font-sans overflow-x-hidden">
      
      <Navbar onAuthClick={() => setIsAuthOpen(true)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Background FX */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[oklch(var(--accent-brand))] opacity-[0.02] blur-[150px] pointer-events-none rounded-full z-0" />

      {/* ─── SECTION: HERO ─── */}
      <section className="relative min-h-screen flex flex-col justify-center px-8 pt-20 overflow-hidden">
         <div className="absolute inset-0 z-0 opacity-10">
            <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-[oklch(var(--accent-brand))] blur-[150px] rounded-full" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]" />
         </div>

         <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 max-w-7xl mx-auto space-y-10"
         >
            <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/10 backdrop-blur-md">
               <Activity size={12} className="text-[oklch(var(--accent-brand))] animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Active Macro Engine v2.0</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-[9vw] lg:text-[6.5vw] font-black uppercase leading-[0.85] tracking-tighter italic mix-blend-difference">
                <span className="block text-[oklch(var(--text-muted))] opacity-30">Survive The</span>
                <span className="block text-white">System.</span>
              </h1>
            </div>

            <div className="max-w-xl space-y-8">
               <p className="text-base md:text-lg text-[oklch(var(--text-muted))] leading-relaxed font-medium uppercase tracking-tight opacity-70">
                 An elite financial simulation for serious operatives. Leverage data, survive market collapses, and outmaneuver global economic warfare in real-time.
               </p>
               
               <div className="flex flex-wrap gap-4">
                  <Button 
                   onClick={() => setIsAuthOpen(true)}
                   className="group relative px-8 h-12 bg-white !text-black font-black uppercase tracking-[0.2em] text-[9px] overflow-hidden border-none rounded-none hover:bg-[oklch(var(--accent-brand))] hover:!text-white transition-colors"
                  >
                    <span className="relative z-10 flex items-center gap-3">Establish Link <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" /></span>
                  </Button>
                  <Button 
                   className="px-8 h-12 bg-transparent border border-white/20 text-white font-black uppercase tracking-[0.2em] text-[9px] hover:bg-white/5 rounded-none"
                  >
                    View Intel Reports
                  </Button>
               </div>
            </div>
         </motion.div>
      </section>

      {/* ─── SECTION: MACRO TICKER ─── */}
      <section className="relative z-10 border-y border-[oklch(var(--border-strong)/0.5)] bg-black/40 backdrop-blur-md overflow-hidden">
        <div className="flex divide-x divide-[oklch(var(--border-strong)/0.5)]">
           {MACRO_INDICATORS.concat(MACRO_INDICATORS).map((metric, i) => (
             <div key={i} className="flex-shrink-0 px-10 py-5 flex items-center gap-6 group hover:bg-white/5 transition-colors cursor-default">
               <div className="text-[8px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">{metric.label}</div>
               <div className="text-lg font-black font-display text-white tabular-nums">{metric.value}</div>
               <div className="text-[8px] font-black uppercase tracking-widest text-[oklch(var(--status-success))]">{metric.delta}</div>
             </div>
           ))}
        </div>
      </section>

      {/* ─── SECTION: FEATURES (INTELLIGENCE) ─── */}
      <section id="features" className="relative z-10 py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5 space-y-10">
               <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-[0.85]">
                 Tactical <br/><span className="text-[oklch(var(--accent-brand))]">Superiority.</span>
               </h2>
               <p className="text-xs text-[oklch(var(--text-muted))] leading-relaxed max-w-xs uppercase tracking-wider font-bold opacity-60">
                 Our proprietary engine simulates global economic cycles using live r-inflation-g variables. Every trade matters. Every second counts.
               </p>
               <div className="pt-6 grid grid-cols-2 gap-8 border-t border-[oklch(var(--border-strong))]">
                  <div>
                     <div className="text-3xl font-black font-display text-white mb-2">100+</div>
                     <div className="text-[8px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">Simulated Assets</div>
                  </div>
                  <div>
                     <div className="text-3xl font-black font-display text-white mb-2">32</div>
                     <div className="text-[8px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">Crisis Scenarios</div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3">
               {INTELLIGENCE_REPORTS.map((report, i) => (
                 <motion.div
                    key={i}
                    whileHover={{ y: -3 }}
                    className="p-8 border border-[oklch(var(--border-strong))] bg-[oklch(var(--bg-secondary)/0.5)] hover:border-[oklch(var(--accent-brand)/0.5)] transition-all flex flex-col justify-between h-[320px] group"
                 >
                    <div className="p-3 w-12 h-12 bg-black flex items-center justify-center border border-white/10 text-[oklch(var(--accent-brand))]">
                      {report.icon}
                    </div>
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-wider mb-2 italic group-hover:text-[oklch(var(--accent-brand))] transition-colors">{report.title}</h3>
                       <p className="text-xs text-[oklch(var(--text-muted))] leading-relaxed uppercase opacity-60 font-bold">
                         {report.desc}
                       </p>
                    </div>
                 </motion.div>
               ))}
               <div className="p-8 border border-dashed border-[oklch(var(--border-strong))] flex items-center justify-center h-[320px]">
                  <div className="text-center">
                    <Fingerprint size={32} className="mx-auto mb-4 text-[oklch(var(--accent-brand))] opacity-20" />
                    <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))]">Awaiting Intel...</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION: SMOOTH SCORING SHOWCASE ─── */}
      <section id="scores" className="relative z-10 py-32 px-8 bg-black/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-[oklch(var(--accent-brand)/0.05)] blur-[120px] rounded-full" />
                <div className="relative border border-[oklch(var(--border-strong))] bg-[oklch(var(--bg-main))] overflow-hidden shadow-2xl skew-y-[-1deg] p-12 flex flex-col items-center justify-center text-center space-y-6">
                   <Globe2 size={48} className="text-[oklch(var(--accent-brand))] opacity-20" />
                   <div className="space-y-2">
                      <h3 className="text-xl font-black uppercase tracking-tighter italic">Session-Locked Intelligence</h3>
                      <p className="text-[10px] text-[oklch(var(--text-muted))] uppercase font-bold tracking-widest leading-relaxed max-w-xs">
                        Operative rankings are strictly confined to active mission sessions for operational security.
                      </p>
                   </div>
                </div>
            </div>

            <div className="flex-1 space-y-10">
               <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-[0.85]">
                 <span className="text-[oklch(var(--accent-brand))]">Smooth</span> <br/>Scoring.
               </h2>
               <p className="text-xs text-[oklch(var(--text-muted))] leading-relaxed max-w-sm uppercase font-bold opacity-60">
                 Experience real-time updates with seamless transitions. Our dynamic engine evaluates operatives instantly as the market shifts.
               </p>
               
               <div className="grid grid-cols-2 gap-px bg-[oklch(var(--border-strong))] border border-[oklch(var(--border-strong))] overflow-hidden">
                  {SCORING_METRICS.map((metric, i) => (
                    <div key={i} className="p-6 bg-[oklch(var(--bg-main))] relative group overflow-hidden">
                        <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] mb-2">{metric.label}</div>
                        <div className={`text-2xl font-black font-display ${metric.color} tabular-nums`}>{metric.value}</div>
                        {activeMetricIndex === i && (
                          <motion.div layoutId="active-bg" className="absolute inset-0 bg-white/5 z-0" />
                        )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION: CALL TO ACTION ─── */}
      <section className="relative z-10 py-32 px-8 text-center bg-transparent">
         <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="text-5xl md:text-7xl font-black uppercase leading-[0.85] tracking-tighter italic">
              Ready For <br/><span className="text-white">Deployment?</span>
            </h2>
            <p className="text-sm text-[oklch(var(--text-muted))] max-w-md mx-auto font-medium uppercase tracking-widest opacity-60">
              Join thousands of operatives currently battling global economic instability.
            </p>
            <div className="pt-6">
               <Button 
                onClick={() => setIsAuthOpen(true)}
                className="group relative px-12 h-14 bg-white !text-black font-black uppercase tracking-[0.3em] text-[9px] overflow-hidden border-none rounded-none shadow-2xl hover:bg-[oklch(var(--accent-brand))] hover:!text-white transition-all"
               >
                 <span className="relative z-10">Access System Terminal</span>
               </Button>
            </div>
         </div>
      </section>

      {/* ─── FOOTER ─── */}
      {user?.role === 'ADMIN' && (
        <footer className="relative z-10 py-12 px-8 border-t border-[oklch(var(--border-strong))] bg-black flex flex-col items-center gap-10">
           <div className="flex flex-wrap justify-center gap-10 font-black text-[9px] uppercase tracking-[0.4em] text-[oklch(var(--status-success))] opacity-40">
              <span className="flex items-center gap-2"><ShieldCheck size={12} /> SOC2_TYPE_II</span>
              <span className="flex items-center gap-2"><Zap size={12} /> PDPA_COMPLIANT</span>
              <span className="flex items-center gap-2"><Globe2 size={12} /> GLOBAL_READY</span>
           </div>
           
           <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white text-black flex items-center justify-center font-black text-sm italic skew-x-[-12deg]">F</div>
                <span className="font-black uppercase tracking-[0.3em] text-[9px]">FinSim <span className="opacity-40">Terminal</span></span>
              </div>
              <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] text-center">
                © 2026 Hackanomics Systems. <br className="md:hidden"/> All Rights Reserved.
              </div>
           </div>
        </footer>
      )}
    </main>
  );
}
