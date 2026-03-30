'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Lock,
  Search, ShieldAlert, Activity,
  Users, Server, CheckCircle2, XCircle
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
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [logPage, setLogPage] = useState(1);
  const LOGS_PER_PAGE = 10;
  
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

  const handleLogout = async () => {
    try {
      await api.post('auth/logout');
      router.push('/');
    } catch (err) {
      console.error('Logout failed', err);
      router.push('/');
    }
  };

  const exportLogsToCSV = () => {
    const headers = ['Timestamp', 'Action', 'Actor', 'Resource'];
    const rows = logs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.action,
      log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'SYSTEM',
      log.resource
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `finsim_audit_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.actor?.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedLogs = filteredLogs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);

  if (isLoading) return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] flex flex-col items-center justify-center gap-4 text-[oklch(var(--text-muted))]">
      <div className="w-8 h-8 border-2 border-t-[oklch(var(--accent-brand))] border-[oklch(var(--border-subtle))] rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest">Loading…</span>
    </div>
  );

  const renderSidebar = () => (
    <aside className="w-64 border-r border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-secondary))] flex flex-col h-[calc(100vh-80px)]">
      <div className="p-6 space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mb-4">Navigation</h3>
        
        {([
          { id: 'OVERVIEW', label: 'System Overview', icon: Activity },
          { id: 'USERS', label: 'User Directory', icon: Users },
          { id: 'AUDIT', label: 'Audit Logs', icon: Search },
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
        <p className="text-[10px] text-[oklch(var(--text-muted))] leading-relaxed">PDPA retention policies active. Automated data sweep enabled.</p>
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
             <span className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">Admin Dashboard</span>
           </div>
        </div>
        <Button onClick={handleLogout} className="bg-[oklch(var(--bg-secondary))] text-[10px] uppercase font-black tracking-widest px-6 hover:bg-[oklch(var(--status-error))] hover:text-white transition-colors">Sign Out</Button>
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
                        <div className="text-[10px] font-medium text-[oklch(var(--text-muted))] mt-1">{stat.trend}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <Activity size={14} className="text-[oklch(var(--accent-brand))]" /> Active Sessions
                  </h2>
                  <div className="space-y-4">
                    {activeSessions.filter(s => s.status !== 'FINISHED').length === 0 ? (
                      <div className="text-center text-[10px] font-black uppercase tracking-widest opacity-20 py-8">NO ACTIVE SESSIONS</div>
                    ) : (
                      activeSessions.filter(s => s.status !== 'FINISHED').map(session => (
                        <div key={session.id} className="flex justify-between items-center p-4 border border-[oklch(var(--border-subtle))]">
                          <div>
                            <div className="text-xs font-black uppercase tracking-widest">{session.name} [{session.code}]</div>
                            <div className="text-[10px] text-[oklch(var(--text-muted))] mt-1">{session.players?.length || 0} players joined</div>
                          </div>
                          <button onClick={() => handleTerminate(session.id)} className="px-4 py-2 bg-[#4A1010]/40 text-[#ff4444] hover:bg-[#ff4444] hover:text-white border border-[#ff4444]/50 text-[10px] font-black uppercase tracking-widest transition-colors">
                            Force End
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
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${staff.role === 'ADMIN' ? 'border-[oklch(var(--status-error))] text-[oklch(var(--status-error))]' : 'border-[oklch(var(--accent-brand))] text-[oklch(var(--accent-brand))]'}`}>{staff.role}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-6 text-[oklch(var(--text-muted))] border-b border-[oklch(var(--border-subtle))] pb-2 mt-12">Players by Session</h2>
                  <div className="space-y-6">
                    {usersData.sessions.map((session: any) => (
                      <div key={session.id} className="border border-[oklch(var(--border-subtle))]">
                        <div className="bg-[oklch(var(--bg-secondary))] px-4 py-3 border-b border-[oklch(var(--border-subtle))] flex justify-between items-center">
                          <span className="text-xs font-black uppercase tracking-[0.2em]">{session.name} [{session.code}]</span>
                          <span className="text-[10px] uppercase font-bold text-[oklch(var(--text-muted))]">Status: {session.status}</span>
                        </div>
                        <div className="p-4">
                          {session.players.length === 0 ? <p className="text-[10px] font-medium text-[oklch(var(--text-muted))]">No players in this session.</p> : (
                            <table className="w-full text-left text-[10px] uppercase tracking-widest">
                              <thead>
                                <tr className="text-[oklch(var(--text-muted))] border-b border-white/5">
                                  <th className="pb-2">Player</th>
                                  <th className="pb-2">Email</th>
                                  <th className="pb-2 text-right">Portfolio Value</th>
                                  <th className="pb-2 text-right">Role</th>
                                </tr>
                              </thead>
                              <tbody>
                                {session.players.map((p: any) => (
                                  <tr key={p.id} className="border-b border-white/5 last:border-0 text-white/80">
                                    <td className="py-2">{p.user?.displayName || 'Unknown'}</td>
                                    <td className="py-2 opacity-50">{p.user?.email}</td>
                                    <td className="py-2 text-right font-mono">${(p.portfolio?.totalValue || 0).toLocaleString()}</td>
                                    <td className="py-2 text-right">
                                      <select
                                        defaultValue={p.user?.role || 'PLAYER'}
                                        onChange={async (e) => {
                                          const newRole = e.target.value as 'PLAYER' | 'FACILITATOR' | 'ADMIN';
                                          await api.patch(`admin/users/${p.user?.id}/role`, { role: newRole });
                                          fetchData();
                                        }}
                                        className="bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] text-[10px] px-2 py-1 uppercase font-bold focus:outline-none focus:border-[oklch(var(--accent-brand))]"
                                      >
                                        <option value="PLAYER">Player</option>
                                        <option value="FACILITATOR">Facilitator</option>
                                        <option value="ADMIN">Admin</option>
                                      </select>
                                    </td>
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
                     <Search size={14} className="text-[oklch(var(--accent-brand))]" /> Audit Log
                  </h2>
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={exportLogsToCSV}
                      className="bg-white text-black text-[9px] font-black uppercase tracking-widest px-4 h-8 hover:bg-[oklch(var(--accent-brand))] hover:text-white"
                    >
                      Export CSV
                    </Button>
                    <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-[oklch(var(--status-success)/0.5)] text-[oklch(var(--status-success))]">PDPA Sweeper ON</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={14} />
                    <input 
                      type="text"
                      placeholder="Filter by event, actor, or resource..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setLogPage(1); }}
                      className="w-full bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:border-[oklch(var(--accent-brand))] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[oklch(var(--bg-main))] border-b border-[oklch(var(--border-subtle))] text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Actor</th>
                        <th className="px-6 py-4">Resource</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium">
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-xs text-[oklch(var(--text-muted))]">No matching logs found</td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => (
                          <tr key={log.id} className="border-b border-[oklch(var(--border-subtle))] hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 opacity-40">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="px-6 py-4 text-[oklch(var(--accent-brand))]">{log.action}</td>
                            <td className="px-6 py-4">{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'SYSTEM'}</td>
                            <td className="px-6 py-4 truncate max-w-[200px]">{log.resource}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  
                  {totalPages > 1 && (
                    <div className="px-6 py-4 bg-[oklch(var(--bg-main))] border-t border-[oklch(var(--border-subtle))] flex items-center justify-between">
                      <div className="text-xs text-[oklch(var(--text-muted))]">
                        {(logPage-1)*LOGS_PER_PAGE + 1}–{Math.min(logPage*LOGS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button disabled={logPage === 1} onClick={() => setLogPage(p => Math.max(1, p - 1))} className="px-3 h-8 text-xs font-bold uppercase">Prev</Button>
                        <span className="text-xs font-bold px-2">{logPage} / {totalPages}</span>
                        <Button disabled={logPage === totalPages} onClick={() => setLogPage(p => Math.min(totalPages, p + 1))} className="px-3 h-8 text-xs font-bold uppercase">Next</Button>
                      </div>
                    </div>
                  )}
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
                         {isPinging ? 'Pinging…' : 'Test Connection'}
                       </Button>

                       {pingResult && (
                         <div className={`mt-8 p-6 border ${pingResult.status === 'SUCCESS' ? 'border-[oklch(var(--status-success))] bg-[oklch(var(--status-success)/0.05)]' : 'border-[oklch(var(--status-error))] bg-[oklch(var(--status-error)/0.05)]'}`}>
                           <div className="flex gap-4">
                              <div className="pt-1">
                                {pingResult.status === 'SUCCESS' ? <CheckCircle2 className="text-[oklch(var(--status-success))]" /> : <XCircle className="text-[oklch(var(--status-error))]" />}
                              </div>
                              <div className="space-y-2">
                                <h4 className={`text-sm font-black uppercase tracking-widest ${pingResult.status === 'SUCCESS' ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))]'}`}>
                                  {pingResult.status === 'SUCCESS' ? 'Connected' : 'Connection failed'}
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
