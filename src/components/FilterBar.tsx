'use client';

import type { FilterState, MarketCapCategory } from '@/lib/types';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const SECTORS = [
  'all', 'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Industrials', 'Energy', 'Basic Materials', 'Consumer Defensive',
  'Communication Services', 'Real Estate', 'Utilities',
];

const MARKET_CAPS: { label: string; value: FilterState['marketCap'] }[] = [
  { label: 'All Caps', value: 'all' },
  { label: 'Micro (<$300M)', value: 'micro' },
  { label: 'Small ($300M-$2B)', value: 'small' },
  { label: 'Mid ($2B-$10B)', value: 'mid' },
  { label: 'Large ($10B-$200B)', value: 'large' },
  { label: 'Mega (>$200B)', value: 'mega' },
];

const PROXIMITIES = [1, 2, 3, 5, 10];
const VOL_RATIOS = [
  { label: 'Any Volume', value: 0 },
  { label: '1.5x+', value: 1.5 },
  { label: '2x+', value: 2 },
  { label: '3x+', value: 3 },
];

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
      <label className="flex items-center gap-1.5 text-xs font-mono">
        <span className="text-gray-500">PROXIMITY:</span>
        <select
          value={filters.proximity}
          onChange={(e) => set({ proximity: parseFloat(e.target.value) })}
          className="bg-gray-800 border border-gray-700 text-amber-400 text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-500"
        >
          {PROXIMITIES.map((p) => (
            <option key={p} value={p}>&lt;{p}% from high</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs font-mono">
        <span className="text-gray-500">MARKET CAP:</span>
        <select
          value={filters.marketCap}
          onChange={(e) => set({ marketCap: e.target.value as MarketCapCategory | 'all' })}
          className="bg-gray-800 border border-gray-700 text-amber-400 text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-500"
        >
          {MARKET_CAPS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs font-mono">
        <span className="text-gray-500">SECTOR:</span>
        <select
          value={filters.sector}
          onChange={(e) => set({ sector: e.target.value })}
          className="bg-gray-800 border border-gray-700 text-amber-400 text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-500"
        >
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs font-mono">
        <span className="text-gray-500">VOL RATIO:</span>
        <select
          value={filters.minVolRatio}
          onChange={(e) => set({ minVolRatio: parseFloat(e.target.value) })}
          className="bg-gray-800 border border-gray-700 text-amber-400 text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-500"
        >
          {VOL_RATIOS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
