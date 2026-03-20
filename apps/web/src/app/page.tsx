'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@hackanomics/ui';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, ArrowRight, Loader2, BarChart3, Globe2, ShieldCheck, Shield, User, LogIn } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('hackanomics_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      // Create a default session for the facilitator
      const session = await api.post<{ id: string; code: string }>(`session/create`, {
        name: `Macro Economics - ${new Date().toLocaleDateString()}`,
        maxPlayers: 50,
      });
      
      localStorage.setItem('current_session_id', session.id);
      localStorage.setItem('session_role', 'FACILITATOR');
      
      // Redirect to admin dashboard
      router.push('/admin');
    } catch (err) {
      console.error('Failed to create session:', err);
      if (err instanceof ApiError && err.statusCode === 401) {
        router.push('/login?redirect=/admin');
      }
      // In production, show a toast here
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] overflow-hidden selection:bg-[oklch(var(--accent-brand)/0.3)]">
      {/* Cinematic Background Elements */}
      <div className="absolute top-0 right-0 w-[70vw] h-[70vw] bg-[oklch(var(--accent-brand))] opacity-[0.03] blur-[150px] pointer-events-none rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-[oklch(var(--accent-up))] opacity-[0.02] blur-[120px] pointer-events-none rounded-full -translate-x-1/4 translate-y-1/4" />

      {/* Navigation / Header */}
      <header className="z-20 w-full p-8 md:px-16 flex justify-between items-center bg-[oklch(var(--bg-main)/0.8)] backdrop-blur-md sticky top-0 border-b border-[oklch(var(--border-subtle)/0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[oklch(var(--accent-brand))] flex items-center justify-center font-black text-xl italic skew-x-[-12deg]">H</div>
          <span className="font-black uppercase tracking-[0.2em] text-sm">Hackanomics</span>
        </div>
        
        <div className="hidden lg:flex gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))]">
          <Link href="/docs" className="hover:text-[oklch(var(--text-primary))] transition-colors">Framework</Link>
          <Link href="/about" className="hover:text-[oklch(var(--text-primary))] transition-colors">Mission</Link>
          <Link href="/support" className="hover:text-[oklch(var(--text-primary))] transition-colors">Terminal Support</Link>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button className="px-6 py-2 h-auto text-[10px] font-black uppercase tracking-[0.2em] bg-[oklch(var(--text-primary))] text-black hover:bg-white transition-all hov-scale flex items-center gap-2">
                Dashboard <ArrowRight size={14} />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))] hover:text-[oklch(var(--text-primary))] transition-colors px-4">
                Login
              </Link>
              <Link href="/register">
                <Button className="px-6 py-2 h-auto text-[10px] font-black uppercase tracking-[0.2em] bg-[oklch(var(--accent-brand))] text-white hover:bg-[oklch(var(--accent-brand)/0.9)] transition-all hov-scale">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-8 md:px-16 z-10">
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-16 items-start md:items-center">
          
          {/* Main Visual/Text */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 bg-[oklch(var(--accent-brand)/0.1)] border border-[oklch(var(--accent-brand)/0.2)] rounded-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(var(--accent-brand))] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[oklch(var(--accent-brand))]"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--accent-brand))]">System v1.0.4 Online</span>
              </div>
              
              <h1 className="text-7xl md:text-8xl font-black uppercase leading-[0.9] tracking-tighter mb-8 italic">
                Strategic <br/>
                <span className="text-[oklch(var(--accent-brand))]">Dominance.</span>
              </h1>
              
              <p className="text-xl text-[oklch(var(--text-secondary))] max-w-lg mb-12 leading-relaxed font-medium">
                The ultimate macro-economics simulation platform designed for high-stakes competition and data-driven analysis.
              </p>

              <div className="flex flex-col sm:flex-row gap-6">
                {isLoggedIn ? (
                  <Link href="/lobby" className="w-full sm:w-auto">
                    <Button 
                      className="w-full sm:w-auto px-12 py-8 h-auto text-lg font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all hov-scale bg-[oklch(var(--text-primary))] text-black hover:bg-white group"
                    >
                      Enter Command Center <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="w-full sm:w-auto">
                      <Button 
                        className="w-full sm:w-auto px-12 py-8 h-auto text-lg font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all hov-scale bg-[oklch(var(--accent-brand))] text-white hover:bg-[oklch(var(--accent-brand)/0.9)] group"
                      >
                         Initialize Identity <Shield className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      </Button>
                    </Link>
                    
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button variant="ghost" className="w-full sm:w-auto px-12 py-8 h-auto text-lg font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all border-2 border-[oklch(var(--border-strong))] hover:bg-[oklch(var(--text-primary))] hover:text-black hover:border-transparent group">
                        Sign In <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {!isLoggedIn && (
                <div className="mt-8 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">
                  <span>Already have a code?</span>
                  <Link href="/join" className="text-[oklch(var(--text-primary))] hover:text-[oklch(var(--accent-brand))] transition-colors underline underline-offset-4">
                    Join Session as Guest
                  </Link>
                </div>
              )}
            </motion.div>
          </div>

          {/* Side Features / Visuals */}
          <div className="hidden lg:block w-72 space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[oklch(var(--accent-brand))]">
                <BarChart3 className="w-6 h-6" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Real-time Data</h3>
              </div>
              <p className="text-xs text-[oklch(var(--text-muted))] uppercase font-bold leading-relaxed tracking-wider">
                Live stock, bond, and currency market simulations driven by algorithmic engines.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[oklch(var(--accent-brand))]">
                <Globe2 className="w-6 h-6" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Global Impact</h3>
              </div>
              <p className="text-xs text-[oklch(var(--text-muted))] uppercase font-bold leading-relaxed tracking-wider">
                Experience the ripple effects of central bank decisions and geopolitical events.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[oklch(var(--accent-brand))]">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Secure Audit</h3>
              </div>
              <p className="text-xs text-[oklch(var(--text-muted))] uppercase font-bold leading-relaxed tracking-wider">
                Enterprise-grade security architecture with permanent append-only audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Decoration */}
      <footer className="w-full p-8 md:px-16 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] border-t border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-main))]">
        <div className="flex gap-12">
          <span>PDPA/GDPR READY</span>
          <span>SLSA LEVEL 4 SECURITY</span>
          <span>SOC2 TYPE II COMPLIANT</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px w-12 bg-[oklch(var(--border-subtle))]" />
          <span>HACKANOMICS TERMINAL // 2026</span>
          <div className="h-px w-12 bg-[oklch(var(--border-subtle))]" />
        </div>
      </footer>
    </main>
  );
}
