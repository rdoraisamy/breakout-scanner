'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ChartDataPoint } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface PriceChartProps {
  symbol: string;
}

// Compute simple moving average. Returns null for indices where there aren't
// enough data points yet (i.e. the first `period-1` values).
function computeSMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const window = closes.slice(i - period + 1, i + 1);
    return window.reduce((sum, p) => sum + p, 0) / period;
  });
}

type ChartPoint = ChartDataPoint & {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
};

const SMA_COLORS = {
  sma20:  '#60a5fa', // blue
  sma50:  '#f59e0b', // amber
  sma200: '#a78bfa', // purple
};

export default function PriceChart({ symbol }: PriceChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/stock/${symbol}/chart`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const raw: ChartDataPoint[] = json.data ?? [];
        const closes = raw.map((d) => d.close);
        const sma20vals = computeSMA(closes, 20);
        const sma50vals = computeSMA(closes, 50);
        const sma200vals = computeSMA(closes, 200);
        setData(raw.map((d, i) => ({
          ...d,
          sma20: sma20vals[i],
          sma50: sma50vals[i],
          sma200: sma200vals[i],
        })));
        setLoading(false);
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
      <div className="h-56 flex items-center justify-center text-gray-500 text-xs font-mono animate-pulse">
        Loading chart...
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-gray-600 text-xs font-mono">
        {error ?? 'No chart data available'}
      </div>
    );
  }

  const prices = data.map((d) => d.close);
  const allValues = [
    ...prices,
    ...data.map((d) => d.sma20).filter((v): v is number => v != null),
    ...data.map((d) => d.sma50).filter((v): v is number => v != null),
    ...data.map((d) => d.sma200).filter((v): v is number => v != null),
  ];
  const minPrice = Math.min(...allValues) * 0.97;
  const maxPrice = Math.max(...allValues) * 1.03;
  const first = prices[0];
  const last = prices[prices.length - 1];
  const positive = last >= first;
  const priceColor = positive ? '#00ff88' : '#ff4444';

  // Latest SMA values for the legend
  const latestSma20  = [...data].reverse().find((d) => d.sma20 != null)?.sma20  ?? null;
  const latestSma50  = [...data].reverse().find((d) => d.sma50 != null)?.sma50  ?? null;
  const latestSma200 = [...data].reverse().find((d) => d.sma200 != null)?.sma200 ?? null;

  const tickDates = data.filter((_, i) => {
    const step = Math.floor(data.length / 5);
    return i % step === 0;
  });
  const tickSet = new Set(tickDates.map((d) => d.date));

  return (
    <div className="space-y-2">
      {/* SMA legend */}
      <div className="flex flex-wrap gap-3 text-[10px] font-mono">
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: priceColor }} />
          <span className="text-gray-400">Price</span>
        </span>
        {latestSma20 != null && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: SMA_COLORS.sma20 }} />
            <span style={{ color: SMA_COLORS.sma20 }}>SMA20 {formatPrice(latestSma20)}</span>
          </span>
        )}
        {latestSma50 != null && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: SMA_COLORS.sma50 }} />
            <span style={{ color: SMA_COLORS.sma50 }}>SMA50 {formatPrice(latestSma50)}</span>
          </span>
        )}
        {latestSma200 != null && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: SMA_COLORS.sma200 }} />
            <span style={{ color: SMA_COLORS.sma200 }}>SMA200 {formatPrice(latestSma200)}</span>
          </span>
        )}
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={priceColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={priceColor} stopOpacity={0} />
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
                fontSize: 10,
                fontFamily: 'monospace',
              }}
              labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: string | undefined) => {
                if (value == null) return [null, null];
                const key = name ?? '';
                const labels: Record<string, string> = {
                  close: 'Price', sma20: 'SMA20', sma50: 'SMA50', sma200: 'SMA200',
                };
                const colors: Record<string, string> = {
                  close: priceColor, sma20: SMA_COLORS.sma20, sma50: SMA_COLORS.sma50, sma200: SMA_COLORS.sma200,
                };
                return [
                  <span key={key} style={{ color: colors[key] ?? '#fff' }}>{formatPrice(Number(value))}</span>,
                  labels[key] ?? key,
                ];
              }}
            />

            {/* Price area */}
            <Area
              type="monotone"
              dataKey="close"
              stroke={priceColor}
              strokeWidth={1.5}
              fill={`url(#grad-${symbol})`}
              dot={false}
              activeDot={{ r: 3, fill: priceColor }}
              connectNulls
            />

            {/* SMA20 — fast MA, blue */}
            <Line
              type="monotone"
              dataKey="sma20"
              stroke={SMA_COLORS.sma20}
              strokeWidth={1}
              dot={false}
              activeDot={false}
              connectNulls
              strokeDasharray="4 2"
            />

            {/* SMA50 — medium MA, amber */}
            <Line
              type="monotone"
              dataKey="sma50"
              stroke={SMA_COLORS.sma50}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls
            />

            {/* SMA200 — slow MA, purple (the most important long-term level) */}
            <Line
              type="monotone"
              dataKey="sma200"
              stroke={SMA_COLORS.sma200}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
