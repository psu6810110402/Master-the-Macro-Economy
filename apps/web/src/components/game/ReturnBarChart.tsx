'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ReturnBarChartProps {
  data: Array<{
    round: number;
    returnPct: number;
  }>;
}

export default function ReturnBarChart({ data }: ReturnBarChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-64 bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] p-4 relative flex flex-col">
      <div className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] z-10">
        Round-over-Round Return (%)
      </div>
      <div className="flex-1 mt-6 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
          >
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
              tickFormatter={(val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`}
            />
            <Tooltip 
              cursor={{ fill: 'oklch(var(--bg-secondary))' }}
              contentStyle={{ 
                backgroundColor: 'oklch(var(--bg-secondary))', 
                border: '1px solid oklch(var(--border-subtle))',
                borderRadius: '0px',
                color: 'oklch(var(--text-primary))',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
              formatter={(value: any) => [`${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`, 'Return']}
              labelFormatter={(label: any) => `Round ${label}`}
            />
            <Bar dataKey="returnPct" name="Return" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.returnPct >= 0 ? "oklch(var(--accent-up))" : "oklch(var(--accent-down))"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
