'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSocket } from '@/hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, Clock, 
  Zap, Activity, DollarSign, BarChart3 
} from 'lucide-react';
import TradeDialog from '@/components/dashboard/TradeDialog';
import RoundResultModal from '@/components/game/RoundResultModal';
import GameOverModal from '@/components/game/GameOverModal';
import BreakingNews from '@/components/game/BreakingNews';
import { Button } from '@hackanomics/ui';
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

export default function PlayPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds] = useState(5);
  const [timer, setTimer] = useState(0); // seconds remaining
  const [timerActive, setTimerActive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Real-time state
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isTradeOpen, setIsTradeOpen] = useState(false);

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

  // ─── INIT ───────────────────────────────────────────────────────────

  useEffect(() => {
    const savedSessionId = localStorage.getItem('current_session_id');
    if (savedSessionId) setSessionId(savedSessionId);

    const fetchData = async () => {
      try {
        const me = await api.get<{ userId: string }>('auth/me');
        setCurrentUserId(me.userId);

        const [assetsData, portfolioData] = await Promise.all([
          api.get<Asset[]>('game/assets'),
          savedSessionId ? api.get<Portfolio>(`portfolio/${savedSessionId}`) : Promise.resolve(null)
        ]);
        setAssets(assetsData);
        setPortfolio(portfolioData);
        
        // Fetch macro state
        if (savedSessionId) {
          try {
            const macroData = await api.get<MacroState>(`game/macro/${savedSessionId}`);
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
  }, []);

  // ─── SOCKET EVENTS ──────────────────────────────────────────────────

  const { isConnected, lastEvent, emit } = useSocket(sessionId);

  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.event) {
      case 'initialState':
        setPrices(lastEvent.data.assetPrices || {});
        setPreviousPrices(lastEvent.data.assetPrices || {});
        setCurrentRound(lastEvent.data.round || 0);
        if (lastEvent.data.timer) {
          setTimer(lastEvent.data.timer);
          setTimerActive(true);
        }
        break;

      case 'game:round_start':
        setPreviousPrices(prices);
        setPrices(lastEvent.data.assetPrices || {});
        setCurrentRound(lastEvent.data.round);
        
        // Show breaking news
        if (lastEvent.data.news) {
          setBreakingNews(lastEvent.data.news);
          setShowNews(true);
        }
        if (lastEvent.data.macro) {
          setMacro(lastEvent.data.macro);
        }
        if (lastEvent.data.timer) {
          setTimer(lastEvent.data.timer);
          setTimerActive(true);
        }
        setIsReady(false); // Reset ready state on new round
        
        // Refresh portfolio
        if (sessionId) {
          api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio).catch(() => {});
        }
        break;

      case 'marketUpdate':
        setPreviousPrices(prices);
        setPrices(lastEvent.data.assetPrices || {});
        break;

      case 'tradeAcknowledged':
        if (sessionId) {
          api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio).catch(() => {});
        }
        break;

      case 'leaderboardUpdate':
        break;

      case 'portfolioUpdate':
        if (lastEvent.data) setPortfolio(lastEvent.data);
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

  // ─── TRADE HANDLER ─────────────────────────────────────────────────

  const handleTrade = useCallback(async (trade: { symbol: string; quantity: number; action: 'BUY' | 'SELL' }) => {
    try {
      await api.post('trade/execute', {
        sessionId,
        symbol: trade.symbol,
        quantity: trade.quantity,
        action: trade.action,
      });
      setIsTradeOpen(false);
      // Portfolio will update via socket event
    } catch (err) {
      console.error('Trade failed:', err);
    }
  }, [sessionId]);

  const toggleReady = () => {
    const newState = !isReady;
    setIsReady(newState);
    emit('playerReady', { sessionId, isReady: newState });
  };


  // ─── RENDER ─────────────────────────────────────────────────────────

  if (isLoading) {
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
      {/* Breaking News Overlay */}
      <BreakingNews 
        isOpen={showNews}
        headline={breakingNews?.headline || 'Market Update'}
        description={breakingNews?.description || 'New economic data has been released.'}
        round={currentRound}
        macro={macro}
        onDismiss={() => {
          setShowNews(false);
          emit('player:ready_ack', { sessionId, round: currentRound });
        }}
      />

      <DashboardLayout title="Trading Terminal" currentRound={currentRound} totalValue={totalValue}>
        <div className="space-y-8">

          {/* Timer & Status Bar */}
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

            {/* Countdown Timer */}
            <div className="flex items-center gap-3">
              <Clock size={14} className={timer < 60 ? 'text-[oklch(var(--status-error))] animate-pulse' : 'text-[oklch(var(--text-muted))]'} />
              <span className={`text-2xl font-black font-mono tabular-nums tracking-tight ${timer < 60 ? 'text-[oklch(var(--status-error))]' : ''}`}>
                {formatTimer(timer)}
              </span>
            </div>

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

            {/* Ready Button */}
            <button
              onClick={toggleReady}
              className={`px-8 py-3.5 rounded-sm font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-500 ease-[var(--ease-out-expo)] relative overflow-hidden group ${
                isReady 
                  ? 'bg-gradient-to-b from-[oklch(var(--status-success)/0.9)] to-[oklch(var(--status-success))] text-[oklch(var(--bg-main))] border border-[oklch(var(--status-success))] shadow-[0_0_20px_oklch(var(--status-success)/0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]' 
                  : 'bg-gradient-to-b from-[oklch(var(--bg-secondary))] to-[oklch(var(--bg-main))] border border-[oklch(var(--border-strong))] text-[oklch(var(--text-secondary))] shadow-[0_4px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[oklch(var(--accent-brand)/0.8)] hover:text-[oklch(var(--text-primary))] hover:shadow-[0_0_15px_oklch(var(--accent-brand)/0.2)] hover:-translate-y-0.5'
              }`}
            >
              {isReady && <div className="absolute inset-0 bg-white/20 blur-sm translate-x-[-150%] skew-x-[-30deg] animate-[shimmer_2s_infinite]" />}
              <span className="relative z-10">{isReady ? 'OPERATIVE READY' : 'EXECUTE COMMAND'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Portfolio Panel (Left) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] p-6 relative overflow-hidden group shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[oklch(var(--accent-brand)/0.03)] rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-1000 group-hover:bg-[oklch(var(--accent-brand)/0.15)]" />
                <h2 className="text-[9px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-muted))] mb-4 flex items-center gap-2">
                   <Activity size={12} className="text-[oklch(var(--accent-brand))]" /> Portfolio Value
                </h2>
                <motion.div 
                  key={totalValue}
                  initial={{ opacity: 0.8, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-fluid-h2 font-black font-display tracking-tighter mb-2 tabular-nums drop-shadow-[0_0_12px_oklch(var(--accent-brand)/0.2)]"
                >
                  ${totalValue.toLocaleString()}<span className="text-[oklch(var(--text-muted))] text-xl">.00</span>
                </motion.div>
                <div className={`flex items-center gap-1 text-[11px] font-black tracking-widest uppercase ${returnPct >= 0 ? 'text-[oklch(var(--accent-up))] drop-shadow-[0_0_8px_oklch(var(--accent-up)/0.4)]' : 'text-[oklch(var(--accent-down))] drop-shadow-[0_0_8px_oklch(var(--accent-down)/0.4)]'}`}>
                  {returnPct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {returnPct >= 0 ? 'YIELD +' : 'CRASH '}{returnPct.toFixed(2)}%
                </div>
              </div>

              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6 relative group overflow-hidden">
                <h2 className="text-[9px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-muted))] mb-4">Liquid Assets</h2>
                <motion.div 
                  key={cashBalance}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-black font-display tracking-tighter tabular-nums"
                >
                  ${Number(cashBalance).toLocaleString()}
                </motion.div>
              </div>

              {/* Holdings */}
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6">
                <div className="flex justify-between items-center mb-6 border-b border-[oklch(var(--border-subtle)/0.5)] pb-4">
                  <h2 className="text-[9px] uppercase font-black tracking-[0.3em] text-[oklch(var(--text-primary))]">
                    Holdings <span className="opacity-40">[{portfolio?.holdings.length || 0}]</span>
                  </h2>
                </div>
                
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {portfolio?.holdings.map(h => {
                    const priceDelta = h.livePrice - (previousPrices[h.asset.symbol] || h.livePrice);
                    const pctChange = previousPrices[h.asset.symbol] 
                      ? ((h.livePrice - previousPrices[h.asset.symbol]) / previousPrices[h.asset.symbol] * 100) 
                      : 0;
                    return (
                      <div key={h.asset.id} className="flex justify-between items-center py-3 border-b border-[oklch(var(--border-subtle)/0.3)] last:border-0 hover:bg-[oklch(var(--bg-tertiary)/0.5)] transition-colors px-2 -mx-2 rounded-sm cursor-default">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.1em]">{h.asset.symbol}</div>
                          <div className="text-[9px] font-bold text-[oklch(var(--text-muted))] uppercase tracking-widest">{h.quantity} units</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black font-mono tracking-tight">${h.currentValue.toLocaleString()}</div>
                          <PriceChangeIndicator changePct={pctChange} className="text-[9px] justify-end mt-0.5 opacity-90" />
                        </div>
                      </div>
                    );
                  })}
                  {(!portfolio?.holdings || portfolio.holdings.length === 0) && (
                    <div className="text-center py-12">
                       <Zap size={24} className="mx-auto text-[oklch(var(--text-muted)/0.3)] mb-4" />
                       <div className="text-[oklch(var(--text-muted))] text-[9px] font-black uppercase tracking-[0.2em] opacity-60">EMPTY PORTFOLIO // AWAITING SECURE EXECUTION</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Market Panel (Right) */}
            <div className="lg:col-span-8">
              <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-strong))] shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                <div className="p-5 border-b border-[oklch(var(--border-strong))] flex justify-between items-center bg-[oklch(var(--bg-main))] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-[4px] h-full bg-[oklch(var(--accent-brand))]" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-[oklch(var(--text-primary))] pl-2">
                    <Zap size={14} className="text-[oklch(var(--accent-brand))]" /> Global Exchange
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[oklch(var(--status-warning))] animate-pulse shadow-[0_0_8px_oklch(var(--status-warning))]" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[oklch(var(--status-warning))]">
                      LIVE DATA UPLINK
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[oklch(var(--border-subtle)/0.5)]">
                  {assets.map((asset) => {
                    const livePrice = prices[asset.symbol] || asset.price;
                    const prevPrice = previousPrices[asset.symbol] || livePrice;
                    const changePct = prevPrice > 0 ? ((livePrice - prevPrice) / prevPrice) * 100 : 0;

                    return (
                      <MemoizedAssetRow 
                        key={asset.id} 
                        asset={asset} 
                        livePrice={livePrice} 
                        changePct={changePct} 
                        onClick={() => { setSelectedAsset({ ...asset, price: livePrice }); setIsTradeOpen(true); }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Trade Slide-over */}
      <TradeDialog
        isOpen={isTradeOpen}
        onClose={() => setIsTradeOpen(false)}
        asset={selectedAsset}
        onExecute={handleTrade}
      />

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
