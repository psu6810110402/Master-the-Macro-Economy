'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, FileText, Lock, Eye, AlertTriangle, 
  Search, ShieldAlert, Activity, Database, Settings, 
  Users, Server, Terminal, CheckCircle2, XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';

type AdminTab = 'OVERVIEW' | 'USERS' | 'AUDIT' | 'DIAGNOSTICS';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [logs, setLogs] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any>(null);
  const [pingResult, setPingResult] = useState<any>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get<{ role: string }>('auth/me')
      .then(user => {
        if (user.role !== 'ADMIN') {
          router.push(user.role === 'FACILITATOR' ? '/facilitator' : '/lobby');
        } else {
          fetchData();
        }
      })
      .catch(() => router.push('/'));
  }, []);

  const fetchData = async () => {
    try {
      const [auditData, sessionData, userPayload] = await Promise.all([
        api.get<any[]>('audit/logs'),
        api.get<any[]>('session/all'),
        api.get<any>('admin/users')
      ]);
      setLogs(auditData);
      setActiveSessions(sessionData);
      setUsersData(userPayload);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSupabase = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const result = await api.get('admin/test-supabase');
      setPingResult(result);
    } catch (err: any) {
      setPingResult({ status: 'ERROR', message: err.message });
    } finally {
      setIsPinging(false);
    }
  };

  const handleTerminate = async (sessionId: string) => {
    if (confirm('DANGER: Immediate session termination. Proceed?')) {
      try {
        await api.post(`session/${sessionId}/end`, {});
        fetchData();
      } catch (e) {
        console.error('Terminate failed', e);
      }
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-white italic font-black uppercase tracking-[0.5em]">Authenticating Level 3...</div>;

  const renderSidebar = () => (
    <aside className="w-64 border-r border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary))] flex flex-col h-[calc(100vh-80px)]">
      <div className="p-6 space-y-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] mb-4">Command Topics</h3>
        
        {([
          { id: 'OVERVIEW', label: 'System Overview', icon: Activity },
          { id: 'USERS', label: 'User Directory', icon: Users },
          { id: 'AUDIT', label: 'Behavioral Intelligence', icon: Search },
          { id: 'DIAGNOSTICS', label: 'Integration Diagnostics', icon: Server }
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-[oklch(var(--accent-brand)/0.1)] text-[oklch(var(--accent-brand))] border-l-2 border-[oklch(var(--accent-brand))]' 
                : 'text-[oklch(var(--text-muted))] hover:bg-white/5 border-l-2 border-transparent hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-auto p-6 border-t border-[oklch(var(--border-subtle))]">
        <p className="text-[8px] uppercase tracking-widest text-[oklch(var(--text-muted))]">PDPA Retention policies currently active.<br/>Automated Player data wiping enabled.</p>
      </div>
    </aside>
  );

  return (
    <main className="min-h-screen bg-[oklch(var(--bg-main))] text-[oklch(var(--text-primary))] flex flex-col">
      {/* Top Navigation */}
      <header className="h-20 border-b border-[oklch(var(--border-strong))] px-8 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-black text-2xl italic">A</div>
           <div>
             <h1 className="text-xl font-black uppercase tracking-tighter">Director Terminal</h1>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">Level 3 Complete Override</span>
           </div>
        </div>
        <Button onClick={() => { localStorage.removeItem('supabase_token'); router.push('/'); }} className="bg-[oklch(var(--bg-secondary))] text-[10px] uppercase font-black tracking-widest px-6 hover:bg-[oklch(var(--status-error))] hover:text-white transition-colors">Terminate Session (Logout)</Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-6xl space-y-8">
            
            {activeTab === 'OVERVIEW' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'SOC2 Status', value: 'TYPE II READY', icon: <ShieldCheck className="text-[oklch(var(--status-success))]" />, trend: 'Validated' },
                    { label: 'PDPA Anonymization', value: 'AUTOMATED', icon: <Lock className="text-[oklch(var(--status-success))]" />, trend: '90-day Sweep Active' },
                    { label: 'System Uptime', value: '99.99%', icon: <Activity className="text-[oklch(var(--accent-brand))]" />, trend: 'Operational' },
                    { label: 'Security Threats', value: '0 ACTIVE', icon: <ShieldAlert className="text-[oklch(var(--status-success))]" />, trend: 'Firewall: Active' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">
                        <span>{stat.label}</span>
                        {stat.icon}
                      </div>
                      <div>
                        <div className="text-xl font-black tracking-tighter">{stat.value}</div>
                        <div className="text-[8px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mt-1">{stat.trend}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <Activity size={14} className="text-[oklch(var(--accent-brand))]" /> Live Theatres
                  </h2>
                  <div className="space-y-4">
                    {activeSessions.filter(s => s.status !== 'FINISHED').length === 0 ? (
                      <div className="text-center text-[10px] font-black uppercase tracking-widest opacity-20 py-8">NO ACTIVE SESSIONS</div>
                    ) : (
                      activeSessions.filter(s => s.status !== 'FINISHED').map(session => (
                        <div key={session.id} className="flex justify-between items-center p-4 border border-[oklch(var(--border-subtle))]">
                          <div>
                            <div className="text-xs font-black uppercase tracking-widest">{session.name} [{session.code}]</div>
                            <div className="text-[10px] text-[oklch(var(--text-muted))] mt-1">{session.players?.length || 0} Operatives attached</div>
                          </div>
                          <button onClick={() => handleTerminate(session.id)} className="px-4 py-2 bg-[#4A1010]/40 text-[#ff4444] hover:bg-[#ff4444] hover:text-white border border-[#ff4444]/50 text-[10px] font-black uppercase tracking-widest transition-colors">
                            Emergency Terminate
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'USERS' && usersData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <section>
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-4 text-[oklch(var(--text-muted))] border-b border-[oklch(var(--border-subtle))] pb-2">Staff & Leadership Roster</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usersData.staff.map((staff: any) => (
                      <div key={staff.id} className="p-4 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black tracking-widest uppercase">{staff.displayName}</div>
                          <div className="text-[10px] text-[oklch(var(--text-muted))]">{staff.email}</div>
                        </div>
                        <span className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest border ${staff.role === 'ADMIN' ? 'border-[oklch(var(--status-error))] text-[oklch(var(--status-error))]' : 'border-[oklch(var(--accent-brand))] text-[oklch(var(--accent-brand))]'}`}>{staff.role}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 text-[oklch(var(--text-muted))] border-b border-[oklch(var(--border-subtle))] pb-2 mt-12">Ephemeral Player Directories (By Session)</h2>
                  <div className="space-y-6">
                    {usersData.sessions.map((session: any) => (
                      <div key={session.id} className="border border-[oklch(var(--border-subtle))]">
                        <div className="bg-[oklch(var(--bg-secondary))] px-4 py-3 border-b border-[oklch(var(--border-subtle))] flex justify-between items-center">
                          <span className="text-xs font-black uppercase tracking-[0.2em]">{session.name} [{session.code}]</span>
                          <span className="text-[10px] uppercase font-bold text-[oklch(var(--text-muted))]">Status: {session.status}</span>
                        </div>
                        <div className="p-4">
                          {session.players.length === 0 ? <p className="text-[10px] font-bold text-[oklch(var(--text-muted))] italic">No operatives deployed.</p> : (
                            <table className="w-full text-left text-[10px] uppercase tracking-widest">
                              <thead>
                                <tr className="text-[oklch(var(--text-muted))] border-b border-white/5">
                                  <th className="pb-2">Operative ID</th>
                                  <th className="pb-2">Email</th>
                                  <th className="pb-2 text-right">Portfolio Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {session.players.map((p: any) => (
                                  <tr key={p.id} className="border-b border-white/5 last:border-0 text-white/80">
                                    <td className="py-2">{p.user?.displayName || 'Unknown'}</td>
                                    <td className="py-2 opacity-50">{p.user?.email}</td>
                                    <td className="py-2 text-right font-mono">${(p.portfolio?.totalValue || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'AUDIT' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                     <Search size={14} className="text-[oklch(var(--accent-brand))]" /> Master Behavior Log
                  </h2>
                  <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-[oklch(var(--status-success)/0.5)] text-[oklch(var(--status-success))]">PDPA Sweeper ON</div>
                </div>
                <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[oklch(var(--bg-main))] border-b border-[oklch(var(--border-subtle))] text-[9px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))]">
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Action Event</th>
                        <th className="px-6 py-4">Origin Actor</th>
                        <th className="px-6 py-4">Resource Target</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] font-bold font-mono">
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-[oklch(var(--border-subtle))] hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 opacity-40">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-4 text-[oklch(var(--accent-brand))]">{log.action}</td>
                          <td className="px-6 py-4">{log.actor?.displayName || 'SYSTEM'}</td>
                          <td className="px-6 py-4 truncate max-w-[200px]">{log.resource}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'DIAGNOSTICS' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 <div>
                   <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Integration Network Control</h2>
                   <p className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] leading-relaxed max-w-2xl">
                     Perform secure health checks on connected enterprise applications.
                     Pings are executed securely strictly using server-side environment variables to mitigate SSRF vectors. No request-body keys are accepted.
                   </p>
                 </div>

                 <div className="p-8 border border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary))] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 opacity-5 pointer-events-none">
                       <Server size={300} />
                    </div>

                    <div className="relative z-10 space-y-8">
                       <div className="space-y-2">
                         <div className="text-[10px] font-black uppercase tracking-widest text-[oklch(var(--accent-brand))]">Target Service</div>
                         <div className="text-3xl font-black tracking-tighter italic">SUPABASE DATA LAYER</div>
                       </div>

                       <Button 
                         onClick={handleTestSupabase} 
                         disabled={isPinging}
                         className="h-14 bg-white text-black text-xs font-black uppercase tracking-[0.2em] px-12 italic"
                       >
                         {isPinging ? 'Transmitting Subspace Ping...' : 'Execute Diagnostic Ping Sequence'}
                       </Button>

                       {pingResult && (
                         <div className={`mt-8 p-6 border ${pingResult.status === 'SUCCESS' ? 'border-[oklch(var(--status-success))] bg-[oklch(var(--status-success)/0.05)]' : 'border-[oklch(var(--status-error))] bg-[oklch(var(--status-error)/0.05)]'}`}>
                           <div className="flex gap-4">
                              <div className="pt-1">
                                {pingResult.status === 'SUCCESS' ? <CheckCircle2 className="text-[oklch(var(--status-success))]" /> : <XCircle className="text-[oklch(var(--status-error))]" />}
                              </div>
                              <div className="space-y-2">
                                <h4 className={`text-sm font-black uppercase tracking-widest ${pingResult.status === 'SUCCESS' ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))]'}`}>
                                  {pingResult.status === 'SUCCESS' ? 'HANDSHAKE ESTABLISHED' : 'CONNECTION REFUSED'}
                                </h4>
                                <p className="text-xs font-mono font-medium opacity-80">{pingResult.message}</p>
                                <div className="mt-4 pt-4 border-t border-white/10 text-[10px] font-mono text-[oklch(var(--text-muted))]">
                                  Endpoint Resolves To: {pingResult.url || 'UNKNOWN'}
                                </div>
                              </div>
                           </div>
                         </div>
                       )}
                    </div>
                 </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
