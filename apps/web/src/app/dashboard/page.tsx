'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSocket } from '@/hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import TradeDialog from '@/components/dashboard/TradeDialog';
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

export default function DashboardPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState<number>(0);

  useEffect(() => {
    const savedSessionId = localStorage.getItem('current_session_id');
    if (savedSessionId) setSessionId(savedSessionId);

    const fetchData = async () => {
      try {
        // Get real user ID from JWT
        const me = await api.get<{ userId: string }>('auth/me');
        setCurrentUserId(me.userId);

        const [assetsData, portfolioData] = await Promise.all([
          api.get<Asset[]>('game/assets'),
          savedSessionId ? api.get<Portfolio>(`portfolio/${savedSessionId}`) : Promise.resolve(null)
        ]);
        setAssets(assetsData);
        setPortfolio(portfolioData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const { isConnected, lastEvent, emit } = useSocket(sessionId);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [roundSummary, setRoundSummary] = useState<any>(null);
  const [isRoundResultOpen, setIsRoundResultOpen] = useState(false);
  const [sessionRole, setSessionRole] = useState<'PLAYER' | 'FACILITATOR' | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('session_role') as 'PLAYER' | 'FACILITATOR';
    setSessionRole(role);
  }, []);
  
  // Phase 6 State
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [rankings, setRankings] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.event === 'initialState') {
      setPrices(lastEvent.data.assetPrices);
      setPreviousPrices(lastEvent.data.assetPrices);
      setCurrentRound(lastEvent.data.round);
    }

    if (lastEvent.event === 'roundStarted') {
      setPreviousPrices(prices);
      setPrices(lastEvent.data.assetPrices);
      setCurrentRound(lastEvent.data.round);
      
      if (lastEvent.data.summary) {
        setRoundSummary(lastEvent.data.summary);
        setIsRoundResultOpen(true);
      }
      
      // Refresh portfolio on round start
      if (sessionId) {
        api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio);
      }
    }

    if (lastEvent.event === 'marketOpened') {
      setIsRoundResultOpen(false); // Hide the news break screen
    }

    if (lastEvent.event === 'sessionEnded') {
      setRankings(lastEvent.data.rankings);
      setIsGameOverOpen(true);
    }

    if (lastEvent.event === 'tradeAcknowledged') {
      setTradeHistory(prev => [
        { ...lastEvent.data.trade, timestamp: Date.now() },
        ...prev
      ].slice(0, 10));

      // Refresh portfolio on trade
      if (sessionId) {
        api.get<Portfolio>(`portfolio/${sessionId}`).then(setPortfolio);
      }
    }
  }, [lastEvent, sessionId]);

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" currentRound={currentRound} totalValue={0}>
        <div className="h-[60vh] flex flex-col items-center justify-center opacity-20 uppercase tracking-[0.3em] font-black">
          <div className="w-12 h-[2px] bg-[oklch(var(--accent-brand))] mb-4 animate-pulse" />
          Synchronizing with Global Market...
        </div>
      </DashboardLayout>
    );
  }

  const totalValue = portfolio?.totalValue || 100000;
  const cashBalance = portfolio?.cashBalance || 100000;
  const returnPct = ((totalValue - 100000) / 100000) * 100;

  return (
    <>
      <DashboardLayout title="Terminal Shell" currentRound={currentRound} totalValue={totalValue}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            {/* Portfolio Section */}
            <motion.section
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1 } },
              }}
            >
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}
                className="flex justify-between items-end mb-8"
              >
                <div>
                  <h2 className="text-[10px] uppercase font-bold tracking-[0.3em] text-[oklch(var(--text-muted))] mb-2">Portfolio Overview</h2>
                  <h1 className="text-6xl font-black font-display tracking-tighter">
                    ${totalValue.toLocaleString()}<span className="text-[oklch(var(--text-muted))] text-3xl">.00</span>
                  </h1>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-2 font-bold text-xl ${returnPct >= 0 ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                    {returnPct >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                    <span>{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))]">All Time Return</div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Cash Balance', value: `$${Number(cashBalance).toLocaleString()}` },
                  { label: 'Invested Assets', value: `$${(totalValue - Number(cashBalance)).toLocaleString()}` },
                  { label: 'Active Trades', value: `${portfolio?.holdings.length || 0} Positions`, accent: true },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } }}
                    className={card.accent 
                      ? 'bg-[oklch(var(--accent-brand)/0.1)] p-6 border border-[oklch(var(--accent-brand)/0.3)]'
                      : 'bg-[oklch(var(--bg-secondary))] p-6 border border-[oklch(var(--border-subtle))]'
                    }
                  >
                    <div className={`text-[10px] uppercase font-bold tracking-widest mb-4 ${
                      card.accent ? 'text-[oklch(var(--accent-brand))]' : 'text-[oklch(var(--text-muted))]'
                    }`}>{card.label}</div>
                    <div className={`text-2xl font-black font-display tabular-nums ${
                      card.accent ? 'text-[oklch(var(--accent-brand))]' : ''
                    }`}>{card.value}</div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Market Section */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] uppercase font-bold tracking-[0.3em] text-[oklch(var(--text-muted))]">Live Market Terminal</h2>
                <div className="flex items-center gap-2 text-[oklch(var(--text-muted))] text-[10px] font-bold uppercase tracking-widest">
                  Status: {isConnected ? <span className="text-[oklch(var(--accent-up))]">Connected</span> : <span className="text-[oklch(var(--accent-down))]">Disconnected</span>}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[oklch(var(--border-subtle))]">
                      <th className="py-4 text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] w-16">Tick</th>
                      <th className="py-4 text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))]">Asset</th>
                      <th className="py-4 text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] text-right">Price</th>
                      <th className="py-4 text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] text-right">Change</th>
                      <th className="py-4 text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[oklch(var(--border-subtle))/0.5]">
                    {assets.map((asset) => {
                      const currentPrice = prices[asset.symbol] || asset.price || 100;
                      const prevPrice = previousPrices[asset.symbol] || asset.price || 100;
                      const isUp = currentPrice >= prevPrice;
                      
                      return (
                        <motion.tr 
                          key={asset.symbol}
                          initial={false}
                          className="group hover:bg-[oklch(var(--text-primary)/0.02)] transition-colors"
                        >
                          <td className="py-6">
                            {isUp ? (
                              <div className="w-2 h-2 rounded-full bg-[oklch(var(--accent-up))]" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-[oklch(var(--accent-down))]" />
                            )}
                          </td>
                          <td className="py-6">
                            <div className="font-display font-black text-lg leading-tight uppercase tracking-tight">{asset.symbol}</div>
                            <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))]">{asset.name}</div>
                          </td>
                          <td className="py-6 text-right font-display font-black text-xl tabular-nums">
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={currentPrice}
                                initial={{ opacity: 0, y: isUp ? 10 : -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={isUp ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}
                              >
                                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </motion.span>
                            </AnimatePresence>
                          </td>
                          <td className="py-6 text-right">
                            <div className={`inline-flex items-center gap-1 font-bold ${isUp ? 'text-[oklch(var(--accent-up))]' : 'text-[oklch(var(--accent-down))]'}`}>
                              {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                              <span className="text-xs uppercase tracking-tighter">
                                {((Math.abs(currentPrice - prevPrice) / prevPrice) * 100).toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-6 text-right">
                            <button 
                              onClick={() => {
                                setSelectedAsset({ ...asset, price: currentPrice });
                                setIsTradeOpen(true);
                              }}
                              className="px-4 py-2 border border-[oklch(var(--border-subtle))] hover:border-[oklch(var(--accent-brand))] hover:text-[oklch(var(--accent-brand))] transition-all uppercase text-[10px] font-bold tracking-[0.2em]"
                            >
                              Trade
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Sidebar: Recent Activity */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] flex flex-col h-[600px]">
              <div className="p-4 border-b border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-primary))]">
                <h2 className="text-[10px] uppercase font-black tracking-[0.3em] flex items-center gap-2">
                  <TrendingUp size={14} className="text-[oklch(var(--accent-brand))]" />
                  Recent Orders
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[10px]">
                {tradeHistory.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-20 uppercase tracking-widest text-center px-8">
                    No trade activity recorded in this session.
                  </div>
                )}
                {tradeHistory.map((trade, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className="p-3 border-l-2 border-[oklch(var(--accent-brand))] bg-[oklch(var(--bg-primary))] space-y-1"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-black ${trade.action === 'BUY' ? 'bg-[oklch(var(--accent-up)/0.15)] text-[oklch(var(--accent-up))]' : 'bg-[oklch(var(--accent-down)/0.15)] text-[oklch(var(--accent-down))]'}`}>
                        {trade.action}
                      </span>
                      <span className="opacity-40 tabular-nums">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between font-bold uppercase tracking-tight">
                      <span>{trade.quantity} {trade.symbol}</span>
                      <span className="text-[oklch(var(--text-muted))]">@ ${trade.price.toLocaleString()}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </DashboardLayout>

      <TradeDialog 
        isOpen={isTradeOpen}
        onClose={() => setIsTradeOpen(false)}
        asset={selectedAsset}
        onExecute={async (data) => {
          try {
            const result = await api.post('trade/execute', {
              sessionId,
              symbol: data.symbol,
              quantity: data.quantity,
              action: data.action,
            });
            // Refresh portfolio after trade
            const updatedPortfolio = await api.get<Portfolio>(`portfolio/${sessionId}`);
            setPortfolio(updatedPortfolio);
            setTradeHistory(prev => [{ ...data, price: selectedAsset?.price || 0, timestamp: Date.now() }, ...prev].slice(0, 10));
          } catch (err: any) {
            console.error('Trade failed:', err);
            alert(err.message || 'Trade execution failed');
          }
          setIsTradeOpen(false);
        }}
      />
      <RoundResultModal 
        isOpen={isRoundResultOpen}
        onClose={() => setIsRoundResultOpen(false)}
        data={roundSummary}
        role={sessionRole}
        onOpenMarket={() => {
          emit('openMarket', { sessionId });
        }}
      />
      <GameOverModal 
        isOpen={isGameOverOpen}
        rankings={rankings}
        currentUserId={currentUserId}
        sessionId={sessionId}
      />
    </>
  );
}

