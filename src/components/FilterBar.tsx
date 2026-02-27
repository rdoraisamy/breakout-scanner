'use client';

import type { FilterState, MarketCapCategory, EntryType, SmaFilter } from '@/lib/types';

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
const SMA_FILTERS: { label: string; value: SmaFilter; desc: string }[] = [
  { label: 'Any',         value: 'any',         desc: 'No MA filter' },
  { label: 'Above 50D',   value: 'above_50',    desc: 'Price > SMA50' },
  { label: 'Above 200D',  value: 'above_200',   desc: 'Price > SMA200 (above long-term MA)' },
  { label: 'Above Both',  value: 'above_both',  desc: 'Price > SMA50 & SMA200 — bullish stack' },
  { label: 'Golden Cross',value: 'golden_cross',desc: 'SMA50 > SMA200 — major bullish signal' },
];
const VOL_RATIOS = [
  { label: 'Any Volume', value: 0 },
  { label: '1.5x+', value: 1.5 },
  { label: '2x+', value: 2 },
  { label: '3x+', value: 3 },
];

// Entry opportunity types — each represents a different stage in a stock's cycle
const ENTRY_TYPES: {
  value: 'all' | EntryType;
  label: string;
  icon: string;
  desc: string;
  color: string;
  activeColor: string;
}[] = [
  {
    value: 'all',
    label: 'ALL',
    icon: '◉',
    desc: 'All entry types near 52W high',
    color: 'text-gray-400 border-gray-700',
    activeColor: 'text-white border-gray-400 bg-gray-800',
  },
  {
    value: 'breakout',
    label: 'BREAKOUT',
    icon: '▲',
    desc: 'Within 5% of 52W high — momentum at peak',
    color: 'text-amber-500/70 border-amber-900/50',
    activeColor: 'text-amber-400 border-amber-500 bg-amber-950/50',
  },
  {
    value: 'recovery',
    label: 'RECOVERY',
    icon: '↗',
    desc: 'Bouncing from lows — 20-55% up range (ASML pattern)',
    color: 'text-green-500/70 border-green-900/50',
    activeColor: 'text-green-400 border-green-500 bg-green-950/50',
  },
  {
    value: 'dip_buy',
    label: 'DIP BUY',
    icon: '↘',
    desc: 'Upper half of range, pulled back from highs',
    color: 'text-blue-500/70 border-blue-900/50',
    activeColor: 'text-blue-400 border-blue-500 bg-blue-950/50',
  },
  {
    value: 'launchpad',
    label: 'LAUNCHPAD',
    icon: '⬛',
    desc: 'Near 52W low (<20% of range) — potential reversal',
    color: 'text-red-500/70 border-red-900/50',
    activeColor: 'text-red-400 border-red-500 bg-red-950/50',
  },
];

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const showProximity = filters.entryType === 'all' || filters.entryType === 'breakout';

  return (
    <div className="border-b border-gray-800">
      {/* Entry type selector */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
        <span className="text-xs font-mono text-gray-600 shrink-0 mr-1">ENTRY:</span>
        {ENTRY_TYPES.map((et) => {
          const active = filters.entryType === et.value;
          return (
            <button
              key={et.value}
              onClick={() => set({ entryType: et.value })}
              title={et.desc}
              className={`
                flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold
                border rounded transition-colors whitespace-nowrap shrink-0
                ${active ? et.activeColor : et.color + ' hover:opacity-90'}
              `}
            >
              <span>{et.icon}</span>
              <span>{et.label}</span>
            </button>
          );
        })}

        {/* Entry type description */}
        <span className="hidden md:inline text-xs font-mono text-gray-600 ml-2 truncate">
          {ENTRY_TYPES.find((et) => et.value === filters.entryType)?.desc}
        </span>
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-900/50">
        {showProximity && (
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
        )}

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

        <label className="flex items-center gap-1.5 text-xs font-mono" title="Filter by 50/200-day moving average alignment">
          <span className="text-gray-500">MA ALIGN:</span>
          <select
            value={filters.smaFilter}
            onChange={(e) => set({ smaFilter: e.target.value as SmaFilter })}
            className="bg-gray-800 border border-gray-700 text-purple-400 text-xs px-2 py-1 rounded focus:outline-none focus:border-purple-500"
          >
            {SMA_FILTERS.map((f) => (
              <option key={f.value} value={f.value} title={f.desc}>{f.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
