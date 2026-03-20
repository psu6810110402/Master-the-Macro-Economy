'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@hackanomics/ui';

interface TradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: { symbol: string; name: string; price: number } | null;
  onExecute: (data: { symbol: string; quantity: number; action: 'BUY' | 'SELL' }) => void;
}

export default function TradeDialog({ isOpen, onClose, asset, onExecute }: TradeDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');

  if (!asset) return null;

  const total = quantity * asset.price;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[oklch(var(--bg-primary)/0.8)] backdrop-blur-sm z-50 cursor-pointer"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[oklch(var(--bg-secondary))] border-l border-[oklch(var(--border-subtle))] p-8 z-50 flex flex-col"
          >
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-[10px] uppercase font-bold tracking-[0.4em] text-[oklch(var(--text-muted))]">Order Execution</h2>
              <button onClick={onClose} className="p-2 hover:bg-[oklch(var(--text-primary)/0.05)] rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="mb-12">
              <div className="text-4xl font-black font-display uppercase tracking-tight mb-2">{asset.symbol}</div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] mb-8">{asset.name}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[oklch(var(--bg-primary))] p-4 border border-[oklch(var(--border-subtle))]">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] mb-1">Live Price</div>
                  <div className="text-xl font-black font-display">${asset.price.toLocaleString()}</div>
                </div>
                <div className="bg-[oklch(var(--bg-primary))] p-4 border border-[oklch(var(--border-subtle))]">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] mb-1">Est. Total</div>
                  <div className="text-xl font-black font-display text-[oklch(var(--accent-brand))]">${total.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-8">
              <div className="grid grid-cols-2 p-1 bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))]">
                <button 
                  onClick={() => setAction('BUY')}
                  className={`py-3 text-[10px] uppercase font-bold tracking-widest transition-all ${action === 'BUY' ? 'bg-[oklch(var(--accent-up))] text-[oklch(var(--bg-primary))]' : 'text-[oklch(var(--text-muted))]'}`}
                >
                  Buy Long
                </button>
                <button 
                  onClick={() => setAction('SELL')}
                  className={`py-3 text-[10px] uppercase font-bold tracking-widest transition-all ${action === 'SELL' ? 'bg-[oklch(var(--accent-down))] text-[oklch(var(--bg-primary))]' : 'text-[oklch(var(--text-muted))]'}`}
                >
                  Sell Short
                </button>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-[oklch(var(--text-muted))] block mb-4">Quantity</label>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[oklch(var(--bg-primary))] border border-[oklch(var(--border-subtle))] p-4 text-2xl font-black font-display focus:border-[oklch(var(--accent-brand))] outline-none transition-colors"
                />
              </div>
            </div>

            <Button 
              onClick={() => onExecute({ symbol: asset.symbol, quantity, action })}
              className={`w-full py-6 text-lg tracking-widest uppercase font-black font-display ${action === 'BUY' ? 'bg-[oklch(var(--accent-up))] hover:bg-[oklch(var(--accent-up)/0.9)]' : 'bg-[oklch(var(--accent-down))] hover:bg-[oklch(var(--accent-down)/0.9)]'}`}
            >
              Order {action} {asset.symbol}
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
