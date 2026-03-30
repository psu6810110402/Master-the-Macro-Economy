'use client';

import React from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';

interface AllocationPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title: string;
}

const PALETTE = [
  'oklch(72% 0.18 275)',  // accent-brand (indigo)
  'oklch(78% 0.22 145)',  // accent-up (green)
  'oklch(62% 0.25 25)',   // accent-down (red)
  'oklch(55% 0.10 260)',  // muted blue
  'oklch(65% 0.15 200)',  // teal
  'oklch(70% 0.20 60)',   // amber
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-[oklch(18%_0.04_260)] border border-[oklch(30%_0.04_260)] px-3 py-2">
      <div className="text-xs font-bold text-[oklch(72%_0.18_275)]">{item.name}</div>
      <div className="text-sm font-black tabular-nums">
        ${Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}

export default function AllocationPieChart({ data, title }: AllocationPieChartProps) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="w-full bg-[oklch(12%_0.03_260)] border border-[oklch(30%_0.04_260)] p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="text-xs font-bold uppercase tracking-widest text-[oklch(55%_0.05_260)]">
        {title}
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.map((entry, index) => ({
                  ...entry,
                  fill: entry.color || PALETTE[index % PALETTE.length],
                }))}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                stroke="oklch(12% 0.03 260)"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
              />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[oklch(55%_0.05_260)]">Total</div>
            <div className="text-sm font-black tabular-nums leading-none">
              ${(total / 1000).toFixed(0)}k
            </div>
          </div>
        </div>

        {/* Custom legend */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {data.map((entry, index) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
            const color = entry.color || PALETTE[index % PALETTE.length];
            return (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 flex items-baseline justify-between gap-2 min-w-0">
                  <span className="text-xs font-bold truncate">{entry.name}</span>
                  <span className="text-xs tabular-nums text-[oklch(55%_0.05_260)] shrink-0">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
