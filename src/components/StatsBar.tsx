'use client';

import type { StockResult } from '@/lib/types';

interface StatsBarProps {
  stocks: StockResult[];
  totalScanned: number;
}

export default function StatsBar({ stocks, totalScanned }: StatsBarProps) {
  const avgScore = stocks.length > 0
    ? Math.round(stocks.reduce((s, x) => s + x.multiBaggerScore, 0) / stocks.length)
    : 0;
  const topStock = stocks[0];

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono px-4 py-2 bg-gray-900 border-b border-gray-800">
      <StatItem label="SCANNED" value={totalScanned.toString()} color="text-gray-300" />
      <StatItem label="BREAKOUTS" value={stocks.length.toString()} color="text-amber-400" />
      <StatItem label="AVG SCORE" value={stocks.length ? avgScore.toString() : '—'} color="text-amber-400" />
      {topStock && (
        <StatItem
          label="TOP"
          value={`${topStock.symbol} ${topStock.multiBaggerScore}`}
          color="text-green-400"
        />
      )}
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="flex gap-1.5">
      <span className="text-gray-500">{label}:</span>
      <span className={color}>{value}</span>
    </span>
  );
}
