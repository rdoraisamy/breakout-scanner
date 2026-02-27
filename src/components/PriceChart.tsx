'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface PriceChartProps {
  symbol: string;
}

export default function PriceChart({ symbol }: PriceChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/stock/${symbol}/chart`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setData(json.data ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load chart');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-xs font-mono animate-pulse">
        Loading chart...
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-xs font-mono">
        {error ?? 'No chart data available'}
      </div>
    );
  }

  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;
  const first = prices[0];
  const last = prices[prices.length - 1];
  const positive = last >= first;

  const color = positive ? '#00ff88' : '#ff4444';

  const tickDates = data.filter((_, i) => {
    const step = Math.floor(data.length / 5);
    return i % step === 0;
  });
  const tickSet = new Set(tickDates.map((d) => d.date));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => tickSet.has(v) ? v.slice(5) : ''}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatPrice(v)}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color }}
            formatter={(v: number | undefined) => [v != null ? formatPrice(v) : '—', 'Close']}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${symbol})`}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
