'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Search,
  ShoppingCart,
  Zap,
  Info,
  Target,
  BarChart3
} from 'lucide-react';
import { Button } from '@hackanomics/ui';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TradeDialog from '@/components/dashboard/TradeDialog';
import { useSocket } from '@/hooks/useSocket';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  currentPrice: number;
  change24h: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

import { useSession } from '@/context/SessionContext';

export default function MarketplacePage() {
  const { sessionId: contextSessionId, isInitialized } = useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | undefined>(undefined);
  const [currentRound, setCurrentRound] = useState<number>(1);

  const { isConnected, lastEvent, emit } = useSocket(sessionId || '');

  useEffect(() => {
    if (!isInitialized) return;
    setSessionId(contextSessionId);
  }, [contextSessionId, isInitialized]);

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.event === 'game:timer_tick') {
      setSecondsLeft(lastEvent.data.secondsLeft);
    }
    
    if (lastEvent.event === 'marketOpened') {
      setSecondsLeft(lastEvent.data.timer);
      if (lastEvent.data.round) setCurrentRound(lastEvent.data.round);
    }

    if (lastEvent.event === 'game:round_start') {
      setCurrentRound(lastEvent.data.round);
      // Optional: fetchAssets again to get fresh round prices
    }
  }, [lastEvent]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const fetchAssets = async () => {
      try {
        const query = contextSessionId ? `?sessionId=${contextSessionId}` : '';
        const data = await api.get<any[]>(`game/assets${query}`);
        // Standardize the data from the API
        const realAssets = data.map(base => ({
          ...base,
          currentPrice: base.price || 100, // Use price from backend
          change24h: base.change || 0, 
          sentiment: (base.change > 0 ? 'BULLISH' : base.change < 0 ? 'BEARISH' : 'NEUTRAL') as any
        }));
        setAssets(realAssets);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, [contextSessionId, isInitialized]);

  if (isLoading || !isInitialized) return (
    <div className="min-h-screen bg-[oklch(var(--bg-main))] flex flex-col items-center justify-center gap-4 text-[oklch(var(--text-muted))]">
      <div className="w-8 h-8 border-2 border-t-[oklch(var(--accent-brand))] border-[oklch(var(--border-subtle))] rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest">Loading…</span>
    </div>
  );

  const handleTrade = async (trade: { symbol: string; quantity: number; action: 'BUY' | 'SELL' }) => {
    if (!sessionId) {
      alert('No active session found. Please join a session first.');
      return;
    }
    try {
      await api.post('trade/execute', {
        sessionId,
        symbol: trade.symbol,
        quantity: trade.quantity,
        action: trade.action,
      });
      setIsTradeOpen(false);
      alert(`${trade.action} order for ${trade.quantity} ${trade.symbol} submitted successfully.`);
    } catch (err: any) {
      alert(`Trade failed: ${err.message}`);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || asset.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout 
      title="Portfolio Marketplace" 
      currentRound={currentRound} 
      secondsLeft={secondsLeft}
    >
      <div className="space-y-8 pb-12">
        {/* Market Stats Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Market Volume', value: '$1.2B', icon: <BarChart3 size={14} />, color: 'var(--accent-brand)' },
            { label: 'Market Sentiment', value: 'Greed', icon: <TrendingUp size={14} />, color: 'var(--status-success)' },
            { label: 'Top Gainer', value: 'AAPL (+5.2%)', icon: <Zap size={14} />, color: 'var(--accent-brand)' },
            { label: 'Active Traders', value: '2,491', icon: <Target size={14} />, color: 'var(--text-primary)' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                {stat.icon}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(var(--text-muted))] mb-1">{stat.label}</p>
              <p className="text-xl font-black uppercase tracking-tighter" style={{ color: `oklch(${stat.color})` }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[oklch(var(--bg-secondary))] p-4 border border-[oklch(var(--border-subtle))]">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(var(--text-muted))]" size={16} />
            <input 
              type="text" 
              placeholder="Search assets, symbols, or indices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:border-[oklch(var(--accent-brand))] outline-none transition-colors"
            />
          </div>
          
          <div className="flex gap-2">
            {['ALL', 'STOCK', 'CRYPTO', 'COMMODITY'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                  filterType === type 
                    ? 'bg-[oklch(var(--accent-brand))] border-[oklch(var(--accent-brand))] text-black' 
                    : 'bg-transparent border-[oklch(var(--border-subtle))] text-[oklch(var(--text-muted))] hover:border-[oklch(var(--text-primary))]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAssets.map((asset) => (
              <motion.div
                key={asset.symbol}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[oklch(var(--bg-secondary))] border border-[oklch(var(--border-subtle))] p-6 hover:border-[oklch(var(--accent-brand)/0.5)] transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[oklch(var(--bg-main))] flex items-center justify-center border border-[oklch(var(--border-subtle))] text-xl font-black italic group-hover:border-[oklch(var(--accent-brand))] transition-colors">
                      {asset.symbol[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tighter italic">{asset.symbol}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[oklch(var(--text-muted))]">{asset.name}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                    asset.sentiment === 'BULLISH' ? 'text-[oklch(var(--status-success))] border-[oklch(var(--status-success)/0.3)] bg-[oklch(var(--status-success)/0.05)]' :
                    asset.sentiment === 'BEARISH' ? 'text-[oklch(var(--status-error))] border-[oklch(var(--status-error)/0.3)] bg-[oklch(var(--status-error)/0.05)]' :
                    'text-[oklch(var(--text-muted))] border-[oklch(var(--border-subtle))] bg-[oklch(var(--bg-main))]'
                  }`}>
                    {asset.sentiment}
                  </div>
                </div>

                <div className="space-y-1 mb-8">
                  <p className="text-3xl font-black uppercase tracking-tighter italic">
                    ${asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-2">
                    {asset.change24h >= 0 ? <TrendingUp size={12} className="text-[oklch(var(--status-success))]" /> : <TrendingDown size={12} className="text-[oklch(var(--status-error))]" />}
                    <span className={`text-xs font-black italic ${asset.change24h >= 0 ? 'text-[oklch(var(--status-success))]' : 'text-[oklch(var(--status-error))]'}`}>
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-[oklch(var(--text-muted))] font-bold uppercase">LAST ROUND</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => { setSelectedAsset({ ...asset, price: asset.currentPrice }); setIsTradeOpen(false); /* placeholder for details */ }}
                    className="w-full border-[oklch(var(--border-subtle))] uppercase text-[10px] font-black tracking-widest h-12 hover:bg-[oklch(var(--bg-main))]"
                  >
                    Details <Info size={12} className="ml-2" />
                  </Button>
                  <Button
                    onClick={() => { setSelectedAsset({ ...asset, price: asset.currentPrice }); setIsTradeOpen(true); }}
                    className="w-full bg-[oklch(var(--accent-brand))] text-black uppercase text-[10px] font-black tracking-widest h-12 hover:bg-white hov-scale"
                  >
                    Quick Trade <ShoppingCart size={12} className="ml-2" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Info Box */}
        <div className="p-8 border-2 border-dashed border-[oklch(var(--border-subtle))] flex flex-col items-center text-center max-w-2xl mx-auto">
          <Zap className="text-[oklch(var(--accent-brand))] mb-4" size={32} />
          <h2 className="text-xl font-black uppercase tracking-tighter mb-2">Real-Time Trade Execution</h2>
          <p className="text-sm text-[oklch(var(--text-muted))] font-medium leading-relaxed">
            All trades are processed instantly through the Hackanomics simulation engine and reflected in your portfolio at the end of each round.
          </p>
        </div>
      </div>

      <TradeDialog 
        isOpen={isTradeOpen}
        onClose={() => setIsTradeOpen(false)}
        asset={selectedAsset}
        onExecute={handleTrade}
      />
    </DashboardLayout>
  );
}
