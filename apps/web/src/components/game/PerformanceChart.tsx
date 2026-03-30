'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface PerformanceChartProps {
  data: Array<{
    round: number;
    value: number;
    cash: number;
  }>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="bg-[oklch(18%_0.04_260)] border border-[oklch(72%_0.18_275/0.4)] px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(55%_0.05_260)] mb-1">
        Round {label}
      </div>
      <div className="text-sm font-black tabular-nums">
        ${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data || data.length === 0) return null;

  const startValue = data[0]?.value ?? 0;
  const currentValue = data[data.length - 1]?.value ?? 0;
  const change = currentValue - startValue;
  const changePct = startValue > 0 ? (change / startValue) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div className="w-full bg-[oklch(12%_0.03_260)] border border-[oklch(30%_0.04_260)] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-bold uppercase tracking-widest text-[oklch(55%_0.05_260)]">
          Portfolio Performance
        </div>
        <div className={`text-xs font-black tabular-nums ${isUp ? 'text-[oklch(78%_0.22_145)]' : 'text-[oklch(62%_0.25_25)]'}`}>
          {isUp ? '+' : ''}{changePct.toFixed(2)}%
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(72% 0.18 275)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="oklch(72% 0.18 275)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 4"
              stroke="oklch(30% 0.04 260)"
              vertical={false}
            />

            {/* Start value reference line */}
            <ReferenceLine
              y={startValue}
              stroke="oklch(55% 0.05 260)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />

            <XAxis
              dataKey="round"
              tickFormatter={(v: number) => `R${v}`}
              stroke="oklch(30% 0.04 260)"
              tick={{ fill: 'oklch(55% 0.05 260)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              stroke="oklch(30% 0.04 260)"
              tick={{ fill: 'oklch(55% 0.05 260)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'oklch(72% 0.18 275)', strokeWidth: 1, strokeDasharray: '3 3' }} />

            <Area
              type="monotone"
              dataKey="value"
              stroke="oklch(72% 0.18 275)"
              strokeWidth={2}
              fill="url(#perfGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'oklch(72% 0.18 275)', stroke: 'oklch(12% 0.03 260)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
