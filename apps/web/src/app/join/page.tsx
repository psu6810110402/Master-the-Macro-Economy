'use client';

import React, { useState } from 'react';
import { Button } from '@hackanomics/ui';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { ChevronRight, Loader2, AlertCircle } from 'lucide-react';

import { useSession } from '@/context/SessionContext';
import { EASE_SPRING } from '@/lib/motion';

export default function JoinPage() {
  const { setSessionId, setRole } = useSession();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.post<{ sessionId: string }>(`session/join`, {
        code: code.toUpperCase(),
      });
      
      setSessionId(result.sessionId);
      setRole('PLAYER');
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to join session. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[oklch(var(--bg-main))] overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-[oklch(var(--accent-brand))] opacity-[0.03] blur-[100px] pointer-events-none rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE_SPRING }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block px-3 py-1 mb-4 border border-[oklch(var(--accent-brand)/0.3)] bg-[oklch(var(--accent-brand)/0.05)] text-[oklch(var(--accent-brand))] text-xs font-bold uppercase tracking-[0.2em] rounded"
          >
            Student Access
          </motion.div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Join Competition</h1>
          <p className="text-[oklch(var(--text-secondary))]">Enter the access code provided by your facilitator.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="relative group">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER PIN (E.G. ABCD12)"
              maxLength={6}
              disabled={loading}
              className="w-full bg-[oklch(var(--bg-card))] border-2 border-[oklch(var(--border-subtle))] px-6 py-5 text-2xl font-black text-center uppercase tracking-[0.3em] transition-all focus:border-[oklch(var(--accent-brand))] focus:outline-none focus:ring-4 focus:ring-[oklch(var(--accent-brand)/0.1)] rounded-none group-hover:border-[oklch(var(--text-secondary)/0.3)]"
            />
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 border-l-4 border-[oklch(var(--accent-down))] bg-[oklch(var(--accent-down)/0.05)] flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-[oklch(var(--accent-down))] shrink-0" />
                  <span className="text-sm font-bold text-[oklch(var(--accent-down))] uppercase tracking-wide">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button 
            type="submit" 
            disabled={loading || code.length < 4}
            className="w-full py-6 text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hov-scale"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Join Session <ChevronRight className="w-6 h-6" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-12 pt-8 border-t border-[oklch(var(--border-subtle))] text-center">
          <p className="text-sm text-[oklch(var(--text-muted))] font-medium">
            Hackanomics — Market Simulation Platform
          </p>
        </div>
      </motion.div>
    </main>
  );
}
