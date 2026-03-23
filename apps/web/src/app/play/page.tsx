'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSocket } from '@/hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, Clock, 
  Zap, Activity, DollarSign, BarChart3, Lock, ShieldCheck 
} from 'lucide-react';
import RoundResultModal from '@/components/game/RoundResultModal';
import GameOverModal from '@/components/game/GameOverModal';
import BreakingNews from '@/components/game/BreakingNews';
import CountdownHUD from '@/components/game/CountdownHUD';
import RoundBriefingOverlay from '@/components/game/RoundBriefingOverlay';
import MarketClosedOverlay from '@/components/game/MarketClosedOverlay';
import TickingNumber from '@/components/ui/TickingNumber';
import TopBarTicker from '@/components/game/TopBarTicker';
import { Button } from '@hackanomics/ui';

// ─── ALLOCATION CATEGORIES ─────────────────────────────────────────────
const ASSET_CATEGORIES = [
  { key: 'TECH', label: 'Tech & Growth', color: 'oklch(0.7 0.2 250)' },
  { key: 'INDUSTRIAL', label: 'Industrial', color: 'oklch(0.7 0.15 80)' },
  { key: 'CONSUMER', label: 'Consumer', color: 'oklch(0.7 0.18 320)' },
  { key: 'BOND', label: 'Bonds', color: 'oklch(0.7 0.12 200)' },
  { key: 'GOLD', label: 'Gold & Metals', color: 'oklch(0.8 0.18 90)' },
  { key: 'CRYPTO', label: 'Crypto', color: 'oklch(0.7 0.22 290)' },
  { key: 'CASH', label: 'Cash Reserve', color: 'oklch(0.6 0.05 250)' },
] as const;

type AllocationMap = Record<string, number>;

const DEFAULT_ALLOCATION: AllocationMap = {
  TECH: 15, INDUSTRIAL: 15, CONSUMER: 15, BOND: 15, GOLD: 15, CRYPTO: 15, CASH: 10,
};
import { api } from '@/lib/api';

// ─── TYPES ──────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'STOCK' | 'BOND' | 'COMMODITY' | 'CRYPTO' | 'CASH';
  price: number;
}

interface Portfolio {
  id: string;
  cashBalance: number;
  totalValue: number;
  holdings: Array<{
    asset: Asset;
    quantity: number;
    currentValue: number;
    livePrice: number;
  }>;
}

interface MacroState {
  interestRate: number;
  inflation: number;
  gdpGrowth: number;
  volatility: number;
  blackSwanActive: boolean;
  blackSwanEvent?: string;
}

// ─── PLAY PAGE ──────────────────────────────────────────────────────────

import { useSession } from '@/context/SessionContext';

export default function PlayPage() {
  const { sessionId: contextSessionId, setSessionId, isInitialized } = useSession();
  const [sessionId, setSessionIdState] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [timer, setTimer] = useState(0); // seconds remaining
  const [timerActive, setTimerActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [isAutoLocked, setIsAutoLocked] = useState(false);

  // Game Phase state machine (Frontend sub-states)
  const [gamePhase, setGamePhase] = useState<'LOBBY' | 'BRIEFING' | 'TRADING' | 'CLOSED'>('LOBBY');
  const [totalTimerSeconds, setTotalTimerSeconds] = useState(180); // For progress calculation
  const [showRoundBriefing, setShowRoundBriefing] = useState(false);

  // Allocation state
  const [allocation, setAllocation] = useState<AllocationMap>({ ...DEFAULT_ALLOCATION });

  // Real-time state
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});

  // Macro state
  const [macro, setMacro] = useState<MacroState>({
    interestRate: 2.5, inflation: 3.0, gdpGrowth: 2.8, 
    volatility: 0.3, blackSwanActive: false
  });

  // News & modals
  const [breakingNews, setBreakingNews] = useState<{ headline: string; description: string } | null>(null);
  const [showNews, setShowNews] = useState(false);
  const [roundSummary, setRoundSummary] = useState<any>(null);
  const [isRoundResultOpen, setIsRoundResultOpen] = useState(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [rankings, setRankings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ─── INIT ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isInitialized) return;
    if (contextSessionId) setSessionIdState(contextSessionId);

    const fetchData = async () => {
      try {
        const me = await api.get<{ userId: string }>('auth/me');
        setCurrentUserId(me.userId);

        const [assetsData, portfolioData] = await Promise.all([
          api.get<Asset[]>('game/assets'),
          contextSessionId ? api.get<Portfolio>(`portfolio/${contextSessionId}`) : Promise.resolve(null)
        ]);
        setAssets(assetsData);
        setPortfolio(portfolioData);
        
        // Fetch macro state
        if (contextSessionId) {
          try {
            const macroData = await api.get<MacroState>(`game/macro/${contextSessionId}`);
            setMacro(macroData);
          } catch { /* use defaults */ }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contextSessionId, isInitialized]);

  // ─── SOCKET EVENTS ──────────────────────────────────────────────────

  const { isConnected, lastEvent, emit } = useSocket(sessionId);

  // Periodic ping to keep session alive for Fix #21
  useEffect(() => {
    if (!isConnected || !sessionId) return;
    const interval = setInterval(() => {
      emit('player:ping', { sessionId });
    }, 60000); // Every 60s
    return () => clearInterval(interval);
  }, [isConnected, sessionId, emit]);

  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.event) {
      case 'initialState':
        setPrices(lastEvent.data.assetPrices || {});
        setPreviousPrices(lastEvent.data.assetPrices || {});
        setCurrentRound(lastEvent.data.currentRound || lastEvent.data.round || 0);
        if (lastEvent.data.totalRounds) {
          setTotalRounds(lastEvent.data.totalRounds);
        }
        if (lastEvent.data.timer) {
          setTimer(lastEvent.data.timer);
          setTimerActive(true);
        }
        break;

      case 'game:round_start':
        setPreviousPrices(prices);
        setPrices(lastEvent.data.assetPrices || {});
        setCurrentRound(lastEvent.data.round);
        
        // Phase: BRIEFING — show round transition, then news
        setGamePhase('BRIEFING');
        setShowRoundBriefing(true);
        
        if (lastEvent.data.news) {
          setBreakingNews(lastEvent.data.news);
        }
        if (lastEvent.data.macro) {
          setMacro(lastEvent.data.macro);
        }
        // Don't start timer yet — timer starts after news dismiss (via marketOpened)
        setTimerActive(false);
        setIsReady(false);
        setIsCommitted(false);
        setIsAutoLocked(false);
        setAllocation({ ...DEFAULT_ALLOCATION });
        
        // Refresh portfolio
        if (sessionId) {
          api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio).catch(() => {});
        }
        break;

      case 'game:timer_tick':
        // Server-synced timer — overrides local countdown
        setTimer(lastEvent.data.secondsLeft);
        setTimerActive(lastEvent.data.secondsLeft > 0);
        break;

      case 'game:round_end':
        // Phase: CLOSED → then results
        setGamePhase('CLOSED');
        setPreviousPrices(prices);
        setPrices(lastEvent.data.assetPrices || {});
        setTimerActive(false);
        setTimer(0);
        // Refresh portfolio with updated values, then clear CLOSED after 3s
        if (sessionId) {
          api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio).catch(() => {});
        }
        setTimeout(() => setGamePhase('LOBBY'), 3000);
        break;

      case 'marketOpened':
        // Phase: TRADING — market is now open
        setGamePhase('TRADING');
        if (lastEvent.data.assetPrices) {
          setPrices(lastEvent.data.assetPrices);
        }
        if (lastEvent.data.timer) {
          setTimer(lastEvent.data.timer);
          setTotalTimerSeconds(lastEvent.data.timer);
          setTimerActive(true);
        }
        setIsReady(false);
        setIsCommitted(false);
        setIsAutoLocked(false);
        setAllocation({ ...DEFAULT_ALLOCATION });
        break;

      case 'trade:confirmed':
        // Our trade was confirmed — refresh portfolio
        if (sessionId) {
          api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio).catch(() => {});
        }
        break;

      case 'marketUpdate':
        setPreviousPrices(prices);
        setPrices(lastEvent.data.assetPrices || {});
        break;

      case 'player:dropped':
        if (lastEvent.data.userId === currentUserId) {
           setError('You have been disconnected due to inactivity.');
           setTimerActive(false);
        }
        break;

      case 'tradeAcknowledged':
        if (sessionId) {
          api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio).catch(() => {});
        }
        break;

      case 'leaderboardUpdate':
        if (lastEvent.data.rankings) {
          setRankings(lastEvent.data.rankings);
        }
        break;

      case 'sessionEnded':
        setRankings(lastEvent.data.rankings || []);
        setIsGameOverOpen(true);
        setTimerActive(false);
        setTimer(0);
        break;

      case 'portfolioUpdate':
        if (lastEvent.data) setPortfolio(lastEvent.data);
        break;

      case 'game:player_ready':
        // Could show ready count in UI — for now just log
        break;
    }
  }, [lastEvent, sessionId]);

  // ─── TIMER ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!timerActive || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── ALLOCATION HANDLERS ─────────────────────────────────────────────

  const totalAlloc = Object.values(allocation).reduce((s, v) => s + v, 0);
  const isValidAlloc = Math.abs(totalAlloc - 100) < 0.01;

  const handleSliderChange = useCallback((key: string, newVal: number) => {
    let finalUpdated: Record<string, number> = {};
    
    setAllocation(prev => {
      const updated = { ...prev, [key]: newVal };
      const currentTotal = Object.values(updated).reduce((s, v) => s + v, 0);
      
      if (currentTotal > 100) {
        const excess = currentTotal - 100;
        const otherKeys = Object.keys(updated).filter(k => k !== key && updated[k] > 0);
        const otherSum = otherKeys.reduce((s, k) => s + updated[k], 0);
        
        if (otherSum > 0) {
          for (const k of otherKeys) {
            const reduction = (updated[k] / otherSum) * excess;
            updated[k] = Math.max(0, Math.round((updated[k] - reduction) * 10) / 10);
          }
        }
      }
      finalUpdated = updated;
      return updated;
    });

    // Fix: Use the computed update for emission
    emit('trade:update', { sessionId, allocation: finalUpdated });
  }, [sessionId, emit]);

  const handleCommitAllocation = useCallback(() => {
    if (!isValidAlloc || isCommitted) return;
    setIsCommitted(true);
    emit('trade:commit', { sessionId, allocation });
  }, [isValidAlloc, isCommitted, sessionId, allocation, emit]);

  // Auto-lock detection when timer hits 0
  useEffect(() => {
    if (timer <= 0 && timerActive === false && !isCommitted && currentRound > 0) {
      setIsAutoLocked(true);
    }
  }, [timer, timerActive, isCommitted, currentRound]);


  // ─── RENDER ─────────────────────────────────────────────────────────

  if (isLoading || !isInitialized) {
    return (
      <DashboardLayout title="Terminal" currentRound={currentRound} totalValue={0}>
        <div className="h-[70vh] flex flex-col items-center justify-center opacity-40 uppercase tracking-[0.4em] font-black text-xs text-[oklch(var(--text-muted))]">
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.98, 1, 0.98] }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex gap-2">
              <div className="w-16 h-[2px] bg-[oklch(var(--accent-brand))]" />
              <div className="w-4 h-[2px] bg-[oklch(var(--accent-brand))]" />
            </div>
            <span>ESTABLISHING SECURE UPLINK...</span>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const totalValue = portfolio?.totalValue || 100000;
  const cashBalance = portfolio?.cashBalance || 100000;
  const returnPct = ((totalValue - 100000) / 100000) * 100;

  return (
    <>
      {/* Round Briefing Overlay (Cinematic Transition) */}
      <RoundBriefingOverlay
        isOpen={showRoundBriefing}
        round={currentRound}
        totalRounds={totalRounds}
        onComplete={() => {
          setShowRoundBriefing(false);
          // Show breaking news after briefing
          if (breakingNews) {
            setShowNews(true);
          }
        }}
      />

      {/* Breaking News Overlay */}
      <BreakingNews 
        isOpen={showNews && !showRoundBriefing}
        headline={breakingNews?.headline || 'Market Update'}
        description={breakingNews?.description || 'New economic data has been released.'}
        round={currentRound}
        macro={macro}
        onDismiss={() => {
          setShowNews(false);
          emit('player:ready_ack', { sessionId, round: currentRound });
        }}
      />

      {/* Market Closed Overlay (Lock Screen) */}
      <MarketClosedOverlay isOpen={gamePhase === 'CLOSED'} />

      <DashboardLayout title="Trading Terminal" currentRound={currentRound} totalValue={totalValue}>
        {/* Top Bar Price Ticker */}
        <TopBarTicker prices={prices} previousPrices={previousPrices} className="-mx-8 -mt-4 mb-6" />

        <div className="space-y-8">

          {/* Timer & Status Bar — Enhanced with CountdownHUD */}
          <div className="flex items-center justify-between p-5 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-10">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[oklch(var(--status-success))] animate-pulse' : 'bg-[oklch(var(--status-error))]'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">
                  {isConnected ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[oklch(var(--accent-brand))]">
                ROUND {currentRound} / {totalRounds}
              </div>
            </div>

            {/* CountdownHUD — Center stage */}
            <CountdownHUD
              seconds={timer}
              totalSeconds={totalTimerSeconds}
              isActive={timerActive}
            />

            {/* Macro Indicators Mini */}
            <div className="flex items-center gap-4">
              {[
                { label: 'IR', value: `${macro.interestRate.toFixed(1)}%`, icon: <ActivityIcon /> },
                { label: 'INF', value: `${macro.inflation.toFixed(1)}%`, icon: <TrendingUp size={10} /> },
                { label: 'GDP', value: `${macro.gdpGrowth >= 0 ? '+' : ''}${macro.gdpGrowth.toFixed(1)}%`, icon: <BarChart3 size={10} /> },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-[7px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">{m.label}</div>
                  <div className="text-[10px] font-black font-mono">{m.value}</div>
                </div>
              ))}
              {macro.blackSwanActive && (
                <div className="px-2 py-1 bg-[oklch(var(--status-error)/0.15)] border border-[oklch(var(--status-error)/0.3)] text-[oklch(var(--status-error))] text-[8px] font-black uppercase tracking-widest animate-pulse">
                  BLACK SWAN
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border ${
              isCommitted 
                ? 'border-[oklch(var(--status-success))] text-[oklch(var(--status-success))] bg-[oklch(var(--status-success)/0.1)]' 
                : isAutoLocked
                  ? 'border-[oklch(var(--status-warning))] text-[oklch(var(--status-warning))] bg-[oklch(var(--status-warning)/0.1)]'
                  : 'border-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))]'
            }`}>
              {isCommitted ? '🔒 POSITION SECURED' : isAutoLocked ? '⏰ AUTO-LOCKED' : gamePhase === 'TRADING' ? 'TRADING OPEN' : 'STANDBY'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Portfolio Panel (Left) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] p-6 relative overflow-hidden group shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[oklch(var(--accent-brand)/0.03)] rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-1000 group-hover:bg-[oklch(var(--accent-brand)/0.15)]" />
                <h2 className="text-[9px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-muted))] mb-4 flex items-center gap-2">
                   <Activity size={12} className="text-[oklch(var(--accent-brand))]" /> Portfolio Value
                </h2>
                <div className="text-fluid-h2 font-black font-display tracking-tighter mb-2 tabular-nums drop-shadow-[0_0_12px_oklch(var(--accent-brand)/0.2)]">
                  <TickingNumber value={totalValue} prefix="$" duration={1200} />
                  <span className="text-[oklch(var(--text-muted))] text-xl">.00</span>
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-black tracking-widest uppercase ${returnPct >= 0 ? 'text-[oklch(var(--accent-up))] drop-shadow-[0_0_8px_oklch(var(--accent-up)/0.4)]' : 'text-[oklch(var(--accent-down))] drop-shadow-[0_0_8px_oklch(var(--accent-down)/0.4)]'}`}>
                  {returnPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {returnPct >= 0 ? 'YIELD +' : 'CRASH '}{returnPct.toFixed(2)}%
                </div>
              </div>

              {/* Current Holdings */}
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6">
                <div className="flex justify-between items-center mb-4 border-b border-[oklch(var(--border-subtle)/0.5)] pb-3">
                  <h2 className="text-[9px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-primary))]">
                    Holdings <span className="opacity-40">[{portfolio?.holdings.length || 0}]</span>
                  </h2>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {portfolio?.holdings.map(h => {
                    const pctChange = previousPrices[h.asset.symbol] 
                      ? ((h.livePrice - previousPrices[h.asset.symbol]) / previousPrices[h.asset.symbol] * 100) 
                      : 0;
                    return (
                      <div key={h.asset.id} className="flex justify-between items-center py-2 border-b border-[oklch(var(--border-subtle)/0.3)] last:border-0">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-tight">{h.asset.symbol}</div>
                          <div className="text-[8px] font-bold text-[oklch(var(--text-muted))]">{h.quantity.toFixed(1)} units</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black font-mono">${h.currentValue.toLocaleString()}</div>
                          <PriceChangeIndicator changePct={pctChange} className="text-[8px] justify-end" />
                        </div>
                      </div>
                    );
                  })}
                  {(!portfolio?.holdings || portfolio.holdings.length === 0) && (
                    <div className="text-center py-8">
                       <Zap size={20} className="mx-auto text-[oklch(var(--text-muted)/0.3)] mb-3" />
                       <div className="text-[oklch(var(--text-muted))] text-[8px] font-black uppercase tracking-widest opacity-60">NO POSITIONS YET</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Market Prices */}
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))]">
                <div className="p-4 border-b border-[oklch(var(--border-subtle))] flex items-center gap-2">
                  <Zap size={12} className="text-[oklch(var(--accent-brand))]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">Live Market</span>
                </div>
                <div className="divide-y divide-[oklch(var(--border-subtle)/0.3)] max-h-64 overflow-y-auto">
                  {assets.map((asset) => {
                    const livePrice = prices[asset.symbol] || asset.price;
                    const prevPrice = previousPrices[asset.symbol] || livePrice;
                    const changePct = prevPrice > 0 ? ((livePrice - prevPrice) / prevPrice) * 100 : 0;
                    return (
                      <div key={asset.id} className="flex justify-between items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                        <div>
                          <div className="text-[10px] font-black uppercase">{asset.symbol}</div>
                          <div className="text-[8px] text-[oklch(var(--text-muted))] font-bold uppercase tracking-widest">{asset.type}</div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="text-[10px] font-black font-mono">${livePrice.toFixed(2)}</span>
                          <PriceChangeIndicator changePct={changePct} className="text-[9px]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ═══ ALLOCATION PANEL (Right) ═══ */}
            <div className="lg:col-span-8">
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                <div className="p-5 border-b border-[oklch(var(--border-strong))] flex justify-between items-center bg-[oklch(var(--bg-main))] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-[4px] h-full bg-[oklch(var(--accent-brand))]" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-[oklch(var(--text-primary))] pl-2">
                    <BarChart3 size={14} className="text-[oklch(var(--accent-brand))]" /> Portfolio Allocation
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${
                      isValidAlloc ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))] animate-pulse'
                    }`}>
                      {totalAlloc.toFixed(1)}% / 100%
                    </span>
                  </div>
                </div>

                {/* Allocation Bar Visual */}
                <div className="h-3 flex overflow-hidden">
                  {ASSET_CATEGORIES.map(cat => (
                    <motion.div
                      key={cat.key}
                      animate={{ width: `${allocation[cat.key] || 0}%` }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={{ backgroundColor: cat.color }}
                      className="h-full"
                    />
                  ))}
                </div>

                {/* Sliders */}
                <div className="p-6 space-y-5">
                  {ASSET_CATEGORIES.map(cat => {
                    const pct = allocation[cat.key] || 0;
                    const dollarValue = (pct / 100) * totalValue;
                    const isDisabled = isCommitted || isAutoLocked;
                    
                    return (
                      <div key={cat.key} className={`group ${isDisabled ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono font-bold text-[oklch(var(--text-muted))]">
                              ${dollarValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs font-black font-mono w-12 text-right tabular-nums">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={pct}
                          disabled={isDisabled}
                          onChange={e => handleSliderChange(cat.key, Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed
                            bg-[oklch(var(--bg-primary))] 
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
                            [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md
                            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                          style={{ 
                            background: `linear-gradient(to right, ${cat.color} ${pct}%, oklch(var(--bg-primary)) ${pct}%)`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Commit Button */}
                <div className="p-6 pt-0">
                  {isCommitted ? (
                    <div className="w-full py-5 bg-[oklch(var(--status-success)/0.1)] border border-[oklch(var(--status-success)/0.3)] text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Lock size={16} className="text-[oklch(var(--status-success))]" />
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[oklch(var(--status-success))]">
                          Position Secured
                        </span>
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))] mt-2">
                        Waiting for other operatives...
                      </div>
                    </div>
                  ) : isAutoLocked ? (
                    <div className="w-full py-5 bg-[oklch(var(--status-warning)/0.1)] border border-[oklch(var(--status-warning)/0.3)] text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Clock size={16} className="text-[oklch(var(--status-warning))]" />
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-[oklch(var(--status-warning))]">
                          Time's Up — Position Auto-Locked
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handleCommitAllocation}
                      disabled={!isValidAlloc}
                      className={`w-full py-5 text-sm font-black uppercase tracking-[0.2em] transition-all ${
                        isValidAlloc
                          ? 'bg-[oklch(var(--accent-brand))] hover:bg-[oklch(var(--accent-brand)/0.9)] text-white shadow-[0_0_20px_oklch(var(--accent-brand)/0.3)]'
                          : 'bg-[oklch(var(--bg-primary))] text-[oklch(var(--text-muted))] cursor-not-allowed border border-[oklch(var(--border-subtle))]'
                      }`}
                    >
                      <ShieldCheck size={16} className="inline mr-2" />
                      {isValidAlloc ? 'EXECUTE TRADE' : `ALLOCATION MUST = 100% (currently ${totalAlloc.toFixed(1)}%)`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Trade Dialog removed — replaced by inline Allocation Panel */}

      {/* Round Result Modal */}
      <RoundResultModal
        isOpen={isRoundResultOpen}
        onClose={() => setIsRoundResultOpen(false)}
        data={roundSummary}
      />

      {/* Game Over */}
      <GameOverModal
        isOpen={isGameOverOpen}
        onClose={() => setIsGameOverOpen(false)}
        rankings={rankings}
        currentUserId={currentUserId}
        sessionId={sessionId}
      />
    </>
  );
}

function ActivityIcon() {
  return <Activity size={10} />;
}

// ─── OPTIMIZED & HARDENED COMPONENTS ───────────────────────────────────────

function PriceChangeIndicator({ changePct, className = '' }: { changePct: number, className?: string }) {
  const isPositive = changePct >= 0;
  return (
    <div className={`flex items-center gap-1 font-bold ${isPositive ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'} ${className}`}>
      {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {isPositive ? '+' : ''}{changePct.toFixed(2)}%
    </div>
  );
}

const MemoizedAssetRow = React.memo(({ 
  asset, livePrice, changePct, onClick 
}: { 
  asset: Asset, livePrice: number, changePct: number, onClick: () => void 
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ backgroundColor: 'oklch(var(--bg-tertiary))', scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ ease: "easeOut", duration: 0.2 }}
      className="w-full text-left grid grid-cols-5 items-center px-6 py-4 cursor-pointer focus-visible outline-none transition-colors border-l-2 border-transparent hover:border-[oklch(var(--accent-brand))]"
      aria-label={`Trade ${asset.name}`}
    >
      <div className="col-span-2">
        <div className="text-sm font-black uppercase tracking-tight">{asset.symbol}</div>
        <div className="text-[9px] font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest">{asset.name}</div>
      </div>
      <div className="text-[8px] font-black uppercase tracking-widest text-[oklch(var(--text-muted))]">
        {asset.type}
      </div>
      <div className="text-right font-black font-mono text-sm tabular-nums">
        ${livePrice.toFixed(2)}
      </div>
      <div className="text-right">
        <PriceChangeIndicator changePct={changePct} className="text-sm justify-end" />
      </div>
    </motion.button>
  );
});
