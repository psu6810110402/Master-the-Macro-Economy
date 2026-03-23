'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal as TerminalIcon, Shield, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { useSession } from '@/context/SessionContext';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { setRole: setContextRole, setSessionId: setContextSessionId } = useSession();
  const [activeTab, setActiveTab] = useState<'PLAYER' | 'STAFF'>('PLAYER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Player Form State
  const [inviteCode, setInviteCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Staff Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Clean error on tab switch
  useEffect(() => setError(null), [activeTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // 1. Sign in via API Guest route
      await api.post('auth/guest', {
        role: 'PLAYER',
        firstName,
        lastName
      });

      setContextRole('PLAYER');
      
      // 2. Join session (this will also trigger the backend to sync the user via the Guard)
      const result = await api.post<{ sessionId: string }>('session/join', { code: inviteCode.toUpperCase() });
      
      setContextSessionId(result.sessionId);
      
      router.push('/lobby');
    } catch (err: any) {
      setError(err.message || 'Invalid Invite Code or Connection Error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post('auth/login', {
        email,
        password
      });

      // Fetch role for redirection
      let userRole = 'PLAYER';
      try {
        const user = await api.get<{ role: string }>('auth/me');
        userRole = user.role;
      } catch (e) {
        console.warn('Could not fetch exact role from API');
      }

      setContextRole(userRole as any);
      
      if (userRole === 'ADMIN') {
        router.push('/admin');
      } else if (userRole === 'FACILITATOR') {
        router.push('/facilitator');
      } else {
        router.push('/lobby');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication Failed. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden rounded-none"
          >
            {/* Cyberpunk Header */}
            <div className="flex justify-between items-center p-6 border-b border-[oklch(var(--border-strong))] bg-[oklch(var(--bg-main))] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-24 h-[1px] bg-[oklch(var(--accent-brand))] shadow-[0_0_10px_oklch(var(--accent-brand))]" />
                <div className="absolute top-0 left-0 w-[1px] h-12 bg-[oklch(var(--accent-brand))] shadow-[0_0_10px_oklch(var(--accent-brand))]" />
                
                <div className="flex items-center gap-3 relative z-10">
                    <TerminalIcon className="text-[oklch(var(--accent-brand))] animate-pulse" size={18} />
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] italic">System Authentication</h2>
                </div>
                <button onClick={onClose} className="p-2 text-[oklch(var(--text-muted))] hover:text-white transition-colors relative z-10">
                    <X size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[oklch(var(--border-strong))] bg-[oklch(var(--bg-main))]">
              <button 
                onClick={() => setActiveTab('PLAYER')}
                className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'PLAYER' ? 'text-[oklch(var(--text-primary))] bg-[oklch(var(--bg-secondary))]' : 'text-[oklch(var(--text-muted))] hover:text-white opacity-40 hover:opacity-100'}`}
              >
                Operative Login
                {activeTab === 'PLAYER' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[oklch(var(--accent-brand))] shadow-[0_0_15px_oklch(var(--accent-brand))]" />}
              </button>
              <button 
                onClick={() => setActiveTab('STAFF')}
                className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'STAFF' ? 'text-[oklch(var(--text-primary))] bg-[oklch(var(--bg-secondary))]' : 'text-[oklch(var(--text-muted))] hover:text-white opacity-40 hover:opacity-100'}`}
              >
                Clearance Login
                {activeTab === 'STAFF' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[oklch(var(--status-error))] shadow-[0_0_15px_oklch(var(--status-error))]" />}
              </button>
            </div>

            <div className="p-10">
              {error && (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="mb-8 p-4 bg-[oklch(var(--status-error)/0.1)] border-l-4 border-[oklch(var(--status-error)/0.6)] text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--status-error))] flex items-center gap-3"
                >
                  <X size={14} /> {error}
                </motion.div>
              )}

              {activeTab === 'PLAYER' ? (
                <form onSubmit={handlePlayerSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-secondary))] flex items-center gap-2">
                       Invite Code <span className="text-[oklch(var(--status-error))]">*</span>
                    </label>
                    <input 
                      type="text" required maxLength={6}
                      value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] p-5 text-center text-4xl font-black font-display uppercase tracking-[0.4em] focus:border-[oklch(var(--accent-brand))] focus:ring-0 outline-none placeholder:text-[oklch(var(--text-muted)/0.3)] transition-all text-[oklch(var(--text-primary))] shadow-2xl"
                      placeholder="G6X-Y9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-secondary))]">First Name</label>
                      <input 
                        type="text" required
                        value={firstName} onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] p-4 text-xs font-bold focus:border-[oklch(var(--accent-brand))] outline-none placeholder:text-[oklch(var(--text-muted)/0.5)] transition-all text-[oklch(var(--text-primary))]"
                        placeholder="ALICE"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-secondary))]">Last Name</label>
                      <input 
                        type="text" required
                        value={lastName} onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] p-4 text-xs font-bold focus:border-[oklch(var(--accent-brand))] outline-none placeholder:text-[oklch(var(--text-muted)/0.5)] transition-all text-[oklch(var(--text-primary))]"
                        placeholder="VANCE"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="relative group w-full py-6 mt-4 font-black uppercase tracking-[0.3em] text-xs transition-all duration-500 ease-[var(--ease-out-expo)] overflow-hidden bg-white text-black hover:bg-[oklch(var(--accent-brand))] hover:text-white border-none rounded-none">
                    <span className="relative z-10">{isLoading ? 'BYPASSING FIREWALL...' : 'ESTABLISH LINK'}</span>
                    <div className="absolute inset-0 bg-[oklch(var(--accent-brand))] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleStaffSubmit} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-secondary))] flex items-center gap-2">
                      <ShieldCheck size={12} className="text-[oklch(var(--status-error))]" /> Intelligence ID (Email)
                    </label>
                    <input 
                      type="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] p-4 text-xs font-bold focus:border-[oklch(var(--status-error))] outline-none active:bg-black transition-all text-[oklch(var(--text-primary))]"
                      placeholder="FACILITATOR@HQ.GOV"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-secondary))] flex items-center gap-2">
                      <Shield size={12} className="text-[oklch(var(--status-error))]" /> Cryptographic Key
                    </label>
                    <input 
                      type="password" required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] p-4 text-xs font-black focus:border-[oklch(var(--status-error))] outline-none transition-all text-[oklch(var(--text-primary))] font-mono tracking-[0.5em]"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="relative group w-full py-6 mt-4 font-black uppercase tracking-[0.3em] text-xs transition-all duration-500 ease-[var(--ease-out-expo)] overflow-hidden bg-[oklch(var(--status-error))] text-white border-none rounded-none">
                    <span className="relative z-10">{isLoading ? 'DECRYPTING...' : 'AUTHORIZE COMMAND'}</span>
                    <div className="absolute inset-0 bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </Button>
                </form>
              )}
            </div>
            
            <div className="bg-[oklch(var(--bg-main))] p-5 border-t border-[oklch(var(--border-subtle))] text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.4em] text-[oklch(var(--text-muted))] flex items-center justify-center gap-3">
                <ShieldCheck size={10} className="text-[oklch(var(--status-success))]" /> ENCRYPTION LEVEL: MIL-SPEC
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
