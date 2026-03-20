'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Briefcase, 
  Users, 
  Settings, 
  LogOut, 
  Trophy, 
  Shield, 
  ShoppingCart,
  Globe2,
  Home
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { icon: Home, label: 'Front', href: '/' },
  { icon: Globe2, label: 'Lobby', href: '/lobby' },
  { icon: LayoutDashboard, label: 'Terminal', href: '/dashboard' },
  { icon: ShoppingCart, label: 'Marketplace', href: '/marketplace' },
  { icon: Trophy, label: 'Leaderboard', href: '/dashboard/leaderboard' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  currentRound?: number;
  totalRounds?: number;
  totalValue?: number;
}

export default function DashboardLayout({ 
  children, 
  title = 'Terminal',
  currentRound = 1,
  totalRounds = 5,
  totalValue = 100000
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('hackanomics_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('hackanomics_token');
    localStorage.removeItem('current_session_id');
    localStorage.removeItem('session_role');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-[oklch(var(--bg-primary))] text-[oklch(var(--text-primary))] font-sans selection:bg-[oklch(var(--accent-brand)/0.3)]">
      {/* Sidebar: Editorial/Bloomberg Style */}
      <aside className="w-20 md:w-64 border-r border-[oklch(var(--border-subtle))] flex flex-col sticky top-0 h-screen z-30 bg-[oklch(var(--bg-primary)/0.8)] backdrop-blur-xl">
        <div className="p-6 mb-8">
          <Link href="/" className="font-display text-2xl font-black tracking-tighter uppercase block">
            HCK<span className="text-[oklch(var(--accent-brand))]">.</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-none group relative transition-all duration-200 ${
                  isActive 
                    ? 'text-[oklch(var(--text-primary))]' 
                    : 'text-[oklch(var(--text-muted))] hover:text-[oklch(var(--text-secondary))]'
                }`}
              style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[oklch(var(--accent-brand))]"
                  />
                )}
                <item.icon size={20} className={isActive ? 'text-[oklch(var(--accent-brand))]' : ''} />
                <span className="hidden md:block font-semibold uppercase tracking-widest text-xs">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-[oklch(var(--border-subtle))] space-y-4">
          <button className="flex items-center gap-4 px-4 py-2 text-[oklch(var(--text-muted))] hover:text-[oklch(var(--text-primary))] transition-colors w-full group">
            <Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" />
            <span className="hidden md:block text-xs uppercase tracking-widest font-bold">Settings</span>
          </button>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-4 px-4 py-2 text-[oklch(var(--accent-down))] opacity-70 hover:opacity-100 transition-all w-full group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:block text-xs uppercase tracking-widest font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Top Header/Ticker Line */}
        <header className="h-16 border-b border-[oklch(var(--border-subtle))] flex items-center justify-between px-8 sticky top-0 z-20 bg-[oklch(var(--bg-primary)/0.5)] backdrop-blur-md">
          <div className="flex items-center gap-8 flex-1 overflow-hidden mr-8">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-[oklch(var(--accent-up))] animate-pulse" />
              <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-[oklch(var(--text-muted))] whitespace-nowrap">{title}</div>
            </div>
            <div className="h-4 w-px bg-[oklch(var(--border-subtle))] flex-shrink-0" />
            
            {/* Market Ticker Marquee */}
            <div className="flex-1 overflow-hidden pointer-events-none relative h-full flex items-center">
              <div className="animate-marquee whitespace-nowrap flex gap-12 items-center">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-12 items-center">
                    <span className="text-[10px] font-bold tracking-widest flex gap-2">
                       <span className="text-[oklch(var(--text-muted))]">AAPL</span>
                       <span className="text-[oklch(var(--accent-up))]">$182.41 (+1.2%)</span>
                    </span>
                    <span className="text-[10px] font-bold tracking-widest flex gap-2">
                       <span className="text-[oklch(var(--text-muted))]">BTC</span>
                       <span className="text-[oklch(var(--accent-down))]">$64,120 (-0.4%)</span>
                    </span>
                    <span className="text-[10px] font-bold tracking-widest flex gap-2">
                       <span className="text-[oklch(var(--text-muted))]">GLD</span>
                       <span className="text-[oklch(var(--accent-up))]">$2,341.10 (+0.8%)</span>
                    </span>
                    <span className="text-[10px] font-bold tracking-widest flex gap-2">
                       <span className="text-[oklch(var(--text-muted))]">US10Y</span>
                       <span className="text-[oklch(var(--accent-down))]">4.21% (-0.02)</span>
                    </span>
                  </div>
                ))}
              </div>
              {/* Fade overrides */}
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[oklch(var(--bg-primary))] to-transparent z-10" />
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[oklch(var(--bg-primary))] to-transparent z-10" />
            </div>
          </div>
          
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))]">Round</div>
              <div className="text-sm font-black font-display leading-tight tabular-nums">
                {String(currentRound).padStart(2, '0')} / {String(totalRounds).padStart(2, '0')}
              </div>
            </div>
            <div className="h-8 w-px bg-[oklch(var(--border-subtle))]" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))]">Active Portfolio</div>
              <div className="text-sm font-black font-display text-[oklch(var(--accent-brand))] leading-tight tabular-nums">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </header>

        {/* Content Rendered Here */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
      {/* Global Style for Marquee Animation */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
