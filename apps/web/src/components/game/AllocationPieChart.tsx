'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AllocationPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title: string;
}

const COLORS = [
  'oklch(var(--accent-brand))',
  'oklch(var(--accent-up))',
  'oklch(var(--accent-down))',
  'oklch(var(--text-muted))',
  'oklch(var(--bg-tertiary))'
];

export default function AllocationPieChart({ data, title }: AllocationPieChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-48 bg-[oklch(var(--bg-main))] border border-[oklch(var(--border-subtle))] p-4 relative flex flex-col">
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[oklch(var(--text-muted))] z-10 mb-2">
        {title}
      </div>
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              stroke="oklch(var(--bg-main))"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'oklch(var(--bg-secondary))', 
                border: '1px solid oklch(var(--border-subtle))',
                borderRadius: '0px',
                color: 'oklch(var(--text-primary))',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
              formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Value']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
