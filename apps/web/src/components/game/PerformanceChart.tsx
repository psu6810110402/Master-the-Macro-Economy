'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface PerformanceChartProps {
  data: Array<{
    round: number;
    value: number;
    cash: number;
  }>;
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-64 bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] p-4 relative">
      <div className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] z-10">
        Portfolio Value Over Time
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(var(--accent-brand))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="oklch(var(--accent-brand))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border-subtle))" vertical={false} />
          <XAxis 
            dataKey="round" 
            tickFormatter={(val: number) => `R${val}`}
            stroke="oklch(var(--text-muted))" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="oklch(var(--text-muted))" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val: number) => `$${(val / 1000)}k`}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'oklch(var(--bg-secondary))', 
              border: '1px solid oklch(var(--accent-brand))',
              borderRadius: '0px',
              color: 'oklch(var(--text-primary))'
            }}
            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Value']}
            labelFormatter={(label: any) => `Round ${label}`}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="oklch(var(--accent-brand))" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
