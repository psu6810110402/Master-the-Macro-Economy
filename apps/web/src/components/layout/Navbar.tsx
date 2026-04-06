'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Shield, LogIn, Menu, X, ArrowRight, Activity } from 'lucide-react';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';

export default function Navbar({ onAuthClick }: { onAuthClick: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ role: string; firstName: string; lastName: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Check auth
    api.get<{ role: string; firstName: string; lastName: string }>('auth/me')
      .then(u => setUser(u))
      .catch(async () => { 
        await api.post('auth/logout', {});
        setUser(null);
      });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { label: 'Intelligence', href: '/#features' },
    { label: 'About Platform', href: '/#about' },
    { label: 'Scoring System', href: '/#scores' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[80] transition-all duration-500 ease-[var(--ease-out-expo)] border-b ${scrolled ? 'bg-[oklch(var(--bg-main)/0.8)] backdrop-blur-xl border-[oklch(var(--border-strong)/0.5)] py-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-transparent border-transparent py-8'}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* Logo */}
        <div 
          onClick={() => router.push('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative w-10 h-10 bg-white text-black flex items-center justify-center font-black text-xl italic skew-x-[-12deg] transition-all duration-500 group-hover:bg-[oklch(var(--accent-brand))] group-hover:text-white group-hover:scale-110">
            F
            <div className="absolute inset-0 border border-white translate-x-1 translate-y-1 -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform" />
          </div>
          <span className="font-black uppercase tracking-[0.3em] text-xs md:text-sm hidden sm:block">FinSim <span className="text-[oklch(var(--text-muted))]">Terminal</span></span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          {menuItems.map((item) => (
            <a 
              key={item.label} 
              href={item.href}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))] hover:text-[oklch(var(--accent-brand))] transition-colors relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[oklch(var(--accent-brand))] transition-all group-hover:w-full" />
            </a>
          ))}
          
          <div className="h-4 w-[1px] bg-[oklch(var(--border-subtle))]" />
          
          {user ? (
            <div className="flex items-center gap-4">
               <div className="text-right hidden lg:block">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[oklch(var(--accent-brand))] mb-0.5">Operative Active</div>
                  <div className="text-[8px] font-bold text-[oklch(var(--text-muted))]">{user.firstName} {user.lastName}</div>
               </div>
               <Button 
                onClick={() => router.push(user.role === 'ADMIN' ? '/admin' : user.role === 'FACILITATOR' ? '/facilitator' : '/lobby')}
                className="px-6 py-2.5 bg-white text-black border-none hover:bg-[oklch(var(--accent-brand))] hover:text-white transition-all text-[9px] font-black uppercase tracking-widest rounded-none shadow-xl"
              >
                Go To {user.role} <ArrowRight size={12} className="ml-2 inline" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={onAuthClick} 
              className="px-8 py-2.5 bg-transparent text-white border border-white hover:bg-white hover:text-black transition-all text-[9px] font-black uppercase tracking-widest rounded-none"
            >
              Login / Register <LogIn size={12} className="ml-2 inline" />
            </Button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-[oklch(var(--bg-main))] border-b border-[oklch(var(--border-strong))] p-8 md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-6">
              {menuItems.map((item) => (
                <a 
                  key={item.label} 
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <div className="h-px w-full bg-[oklch(var(--border-subtle))]" />
              <Button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (user) {
                    router.push(user.role === 'ADMIN' ? '/admin' : user.role === 'FACILITATOR' ? '/facilitator' : '/lobby');
                  } else {
                    onAuthClick();
                  }
                }}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-none"
              >
                {user ? `Go To ${user.role}` : 'Login / Register'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
