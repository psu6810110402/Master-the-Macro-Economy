'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface SessionContextType {
  token: string | null;
  sessionId: string | null;
  role: 'PLAYER' | 'FACILITATOR' | 'ADMIN' | null;
  isInitialized: boolean;
  setToken: (token: string | null) => void;
  setSessionId: (id: string | null) => void;
  setRole: (role: 'PLAYER' | 'FACILITATOR' | 'ADMIN' | null) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [role, setRoleState] = useState<'PLAYER' | 'FACILITATOR' | 'ADMIN' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const hydrate = () => {
      const savedToken = localStorage.getItem('supabase_token');
      const savedSessionId = localStorage.getItem('current_session_id');
      const savedRole = localStorage.getItem('session_role') as any;

      setTokenState(prev => prev !== savedToken ? savedToken : prev);
      setSessionIdState(prev => prev !== savedSessionId ? savedSessionId : prev);
      setRoleState(prev => prev !== savedRole ? savedRole : prev);
      
      setIsInitialized(true);
    };

    hydrate();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      // Performance: Only hydrate if the key matches and the value actually changed
      if (['supabase_token', 'current_session_id', 'session_role'].includes(e.key || '') && e.oldValue !== e.newValue) {
        hydrate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Token Validation Heartbeat (Fix #22: Periodically verify session validity)
  useEffect(() => {
    if (!token || !isInitialized) return;

    let failureCount = 0;

    const validateToken = async () => {
      try {
        await api.get('auth/me');
        failureCount = 0; // Reset on success
      } catch (err: any) {
        // Fix #23: Network Resilience - don't logout on a single "blip"
        if (err.statusCode === 401) {
          logout();
          return;
        }
        
        failureCount++;
        if (failureCount >= 3) {
          console.warn('Session heartbeat failed 3 times: Forcing secure logout.');
          logout();
        }
      }
    };

    // Check every 5 minutes
    const heartbeat = setInterval(validateToken, 5 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [token, isInitialized]);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem('supabase_token', t);
    else localStorage.removeItem('supabase_token');
  };

  const setSessionId = (id: string | null) => {
    setSessionIdState(id);
    if (id) localStorage.setItem('current_session_id', id);
    else localStorage.removeItem('current_session_id');
  };

  const setRole = (r: 'PLAYER' | 'FACILITATOR' | 'ADMIN' | null) => {
    setRoleState(r);
    if (r) localStorage.setItem('session_role', r);
    else localStorage.removeItem('session_role');
  };

  const logout = () => {
    setToken(null);
    setSessionId(null);
    setRole(null);
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('current_session_id');
    localStorage.removeItem('session_role');
    // Global panic reset for safety
    window.location.href = '/';
  };

  return (
    <SessionContext.Provider value={{ token, sessionId, role, isInitialized, setToken, setSessionId, setRole, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
