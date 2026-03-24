'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSocket } from '@/hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Lock } from 'lucide-react';
import TradePanel from '@/components/dashboard/TradePanel';
import BreakingNews from '@/components/game/BreakingNews';
import RoundResultModal from '@/components/game/RoundResultModal';
import GameOverModal from '@/components/game/GameOverModal';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';

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

import { useSession } from '@/context/SessionContext';

export default function DashboardPage() {
  const { sessionId: contextSessionId, role: contextRole, logout, isInitialized } = useSession();
  const [sessionId, setSessionId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('WAITING');

  useEffect(() => {
    if (contextSessionId) setSessionId(contextSessionId);
  }, [contextSessionId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const me = await api.get<{ userId: string }>('auth/me');
        setCurrentUserId(me.userId);

        const [assetsData, portfolioData] = await Promise.all([
          api.get<Asset[]>('game/assets'),
          sessionId ? api.get<Portfolio>(`portfolio/${sessionId}`) : Promise.resolve(null)
        ]);
        setAssets(assetsData);
        setPortfolio(portfolioData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  const { isConnected, lastEvent, emit } = useSocket(sessionId);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | undefined>(undefined);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [news, setNews] = useState<any>(null);
  
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [rankings, setRankings] = useState<any[]>([]);
  const sessionRole = contextRole;

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.event === 'initialState') {
      setPrices(lastEvent.data.assetPrices || {});
      setPreviousPrices(lastEvent.data.assetPrices || {});
      setCurrentRound(lastEvent.data.round || lastEvent.data.currentRound || 0);
      setGameStatus(lastEvent.data.status || 'WAITING');
      
      if (lastEvent.data.status === 'COMPLETED') {
        setRankings(lastEvent.data.rankings || []);
        setIsGameOverOpen(true);
      }
      
      if (lastEvent.data.news) {
        setNews(lastEvent.data.news);
        setIsNewsOpen(true);
      }
    }

    if (lastEvent.event === 'game:round_start') {
      setPreviousPrices(prices);
      setPrices(lastEvent.data.assetPrices);
      setCurrentRound(lastEvent.data.round);
      setIsLocked(false);
      setGameStatus('ACTIVE');
      
      if (lastEvent.data.news) {
        setNews(lastEvent.data.news);
        setIsNewsOpen(true);
      }
      
      if (sessionId) {
        api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio);
      }
    }

    if (lastEvent.event === 'game:timer_tick') {
      setSecondsLeft(lastEvent.data.secondsLeft);
    }

    if (lastEvent.event === 'trade:confirmed') {
      setIsLocked(true);
      if (sessionId) {
        api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio);
      }
    }

    if (lastEvent.event === 'game:round_end') {
      setIsLocked(true);
      setPrices(lastEvent.data.assetPrices);
      setCurrentRound(lastEvent.data.round);
    }

    if (lastEvent.event === 'sessionEnded') {
      setRankings(lastEvent.data.rankings || []);
      setIsGameOverOpen(true);
    }
  }, [lastEvent, sessionId, prices]);

  if (isLoading || !isInitialized) {
    return (
      <DashboardLayout title="Dashboard" currentRound={currentRound} totalValue={0}>
        <div className="h-[60vh] flex flex-col items-center justify-center opacity-20 uppercase tracking-[0.3em] font-black">
          <div className="w-12 h-[2px] bg-[oklch(var(--accent-brand))] mb-4 animate-pulse" />
          Synchronizing with Global Market...
        </div>
      </DashboardLayout>
    );
  }

  if (gameStatus === 'WAITING' || (isConnected && !lastEvent)) {
    return (
      <DashboardLayout title="Universal Lobby" currentRound={0} totalValue={portfolio?.totalValue || 100000}>
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 rounded-full border border-[oklch(var(--border-strong))] flex items-center justify-center bg-[oklch(var(--bg-secondary))] animate-pulse">
            <Lock className="text-[oklch(var(--text-muted))]" size={24} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-widest italic">Awaiting Facilitator</h2>
            <p className="text-[10px] text-[oklch(var(--text-muted))] uppercase tracking-[0.3em] font-bold">
              The strategic simulation will commence shortly.<br/>Please hold your position.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalValue = portfolio?.totalValue || 100000;
  const returnPct = ((totalValue - 100000) / 100000) * 100;

  return (
    <>
      <DashboardLayout title="Market Node: Active" currentRound={currentRound} totalValue={totalValue} secondsLeft={secondsLeft}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
          <div className="lg:col-span-8 flex flex-col gap-8 overflow-hidden">
            {/* Portfolio Overview */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-[10px] uppercase font-bold tracking-[0.3em] text-[oklch(var(--text-muted))] mb-4 text-glow">Net Liquid Worth</h2>
                  <h1 className="text-6xl font-black font-display tracking-tighter tabular-nums">
                    ${totalValue.toLocaleString()}<span className="text-[oklch(var(--text-muted))] text-3xl">.00</span>
                  </h1>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-2 font-black text-2xl ${returnPct >= 0 ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))]'}`}>
                    {returnPct >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                    <span>{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%</span>
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] mt-1">Total Return</div>
                </div>
              </div>
            </motion.section>

            {/* Market Prices Grid */}
            <section className="flex-1 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[10px] uppercase font-bold tracking-[0.3em] text-[oklch(var(--text-muted))]">Global Market Feed</h2>
                <div className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))] animate-pulse'}`}>
                  {isConnected ? 'NODE: CONNECTED' : 'NODE: RECONNECTING...'}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {assets.map((asset) => {
                    const currentPrice = prices[asset.symbol] || asset.price || 100;
                    const prevPrice = previousPrices[asset.symbol] || asset.price || 100;
                    const isUp = currentPrice >= prevPrice;
                    
                    return (
                      <div key={asset.symbol} className="p-3 bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] flex justify-between items-center group hover:border-[oklch(var(--accent-brand)/0.5)] transition-all">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black font-display tracking-tight uppercase italic truncate">{asset.symbol}</div>
                            <div className="text-[7px] px-1 bg-[oklch(var(--border-subtle))] font-bold rounded uppercase tracking-tighter opacity-60">
                              {asset.type}
                            </div>
                          </div>
                          <div className="text-[8px] font-bold text-[oklch(var(--text-muted))] uppercase truncate">{asset.name}</div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className={`text-sm font-black font-mono tabular-nums ${isUp ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))]'}`}>
                            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-[9px] font-bold flex items-center justify-end gap-1 ${isUp ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))]'}`}>
                            {isUp ? '+' : ''}{((currentPrice - prevPrice) / prevPrice * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Trade Terminal Sidebar */}
          <aside className="lg:col-span-4 h-full relative">
            <TradePanel 
              round={currentRound}
              assetPrices={prices}
              isLocked={isLocked}
              onCommit={(allocation) => {
                emit('trade:commit', { sessionId, allocation });
              }}
            />
          </aside>
        </div>
      </DashboardLayout>

      <BreakingNews 
        isOpen={isNewsOpen}
        headline={news?.headline || "MARKET SHIFT DETECTED"}
        description={news?.body || "Analyzing economic deltas..."}
        round={currentRound}
        macro={{
          interestRate: news?.macroDeltas?.interestRate || 0,
          inflation: news?.macroDeltas?.inflation || 0,
          gdpGrowth: news?.macroDeltas?.gdpGrowth || 0,
          blackSwanActive: !!news?.blackSwanTier,
          blackSwanEvent: news?.headline
        }}
        onDismiss={() => {
          setIsNewsOpen(false);
          emit('player:ready_ack', { sessionId });
        }}
      />

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
