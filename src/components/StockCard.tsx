'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockResult, SortField, SortDirection, EntryType } from '@/lib/types';
import {
  formatPrice, formatPercent, formatMarketCap,
  formatVolumeRatio
} from '@/lib/utils';
import MultiBaggerScore from './MultiBaggerScore';

// MA alignment indicator — shows 50D, 200D SMA status and squeeze convergence
function MaIndicators({ price, sma20, sma50, sma200, smaSpread, smaBreakoutDaysAgo }: {
  price: number; sma20: number; sma50: number; sma200: number; smaSpread: number; smaBreakoutDaysAgo: number;
}) {
  const above50 = sma50 > 0 && price > sma50;
  const above200 = sma200 > 0 && price > sma200;
  const above20 = sma20 > 0 && price > sma20;
  const goldenCross = sma50 > 0 && sma200 > 0 && sma50 > sma200;
  const isSqueeze = sma20 > 0 && smaSpread < 10;
  const isTightSqueeze = sma20 > 0 && smaSpread < 5;
  const recentBreakout = smaBreakoutDaysAgo >= 0 && smaBreakoutDaysAgo <= 20;
  const daysLabel = recentBreakout ? ` ${smaBreakoutDaysAgo === 0 ? 'today' : `${smaBreakoutDaysAgo}d`}` : '';

  return (
    <div className="flex items-center gap-1 mt-0.5" title={`SMA20: ${sma20 > 0 ? sma20.toFixed(2) : 'N/A'} | SMA50: ${sma50.toFixed(2)} | SMA200: ${sma200.toFixed(2)}${goldenCross ? ' | Golden Cross ★' : ''}${isSqueeze ? ` | Squeeze ${smaSpread.toFixed(1)}%` : ''}${recentBreakout ? ` | Broke above SMA20 ${daysLabel} ago` : ''}`}>
      {isTightSqueeze && (
        <span className={`text-[8px] font-mono px-0.5 rounded font-bold ${recentBreakout ? 'text-cyan-200 bg-cyan-800/70' : above20 ? 'text-cyan-300 bg-cyan-950/70' : 'text-cyan-600 bg-cyan-950/40'}`}>
          {recentBreakout ? `⟨SQZ BRK${daysLabel}⟩` : above20 ? '⟨SQZ⟩' : '⟨SQZ⟩'}
        </span>
      )}
      {!isTightSqueeze && isSqueeze && (
        <span className={`text-[8px] font-mono px-0.5 rounded ${recentBreakout ? 'text-cyan-300 bg-cyan-900/50' : above20 ? 'text-cyan-400 bg-cyan-950/50' : 'text-cyan-700 bg-cyan-950/30'}`}>
          {recentBreakout ? `SQZ BRK${daysLabel}` : above20 ? 'SQZ↑' : 'SQZ'}
        </span>
      )}
      {sma50 > 0 && (
        <span className={`text-[8px] font-mono px-0.5 rounded ${above50 ? 'text-amber-400 bg-amber-950/50' : 'text-gray-600 bg-gray-900'}`}>
          50{above50 ? '↑' : '↓'}
        </span>
      )}
      {sma200 > 0 && (
        <span className={`text-[8px] font-mono px-0.5 rounded ${above200 ? 'text-purple-400 bg-purple-950/50' : 'text-gray-600 bg-gray-900'}`}>
          200{above200 ? '↑' : '↓'}
        </span>
      )}
      {goldenCross && (
        <span className="text-[8px] font-mono text-yellow-400" title="Golden Cross: SMA50 above SMA200">★GX</span>
      )}
    </div>
  );
}

// Visual config per entry type
const ENTRY_TYPE_CONFIG: Record<EntryType, { label: string; icon: string; color: string }> = {
  breakout:  { label: 'BREAKOUT',  icon: '▲', color: 'text-amber-400 bg-amber-950/60 border-amber-800/50' },
  recovery:  { label: 'RECOVERY',  icon: '↗', color: 'text-green-400 bg-green-950/60 border-green-800/50' },
  dip_buy:   { label: 'DIP BUY',   icon: '↘', color: 'text-blue-400 bg-blue-950/60 border-blue-800/50' },
  launchpad: { label: 'LAUNCHPAD', icon: '⬛', color: 'text-red-400 bg-red-950/60 border-red-800/50' },
};

interface ScannerTableHeaderProps {
  sortField: SortField;
  sortDir: SortDirection;
  onSort: (field: SortField) => void;
}

export function ScannerTableHeader({ sortField, sortDir, onSort }: ScannerTableHeaderProps) {
  const col = (field: SortField, label: string, align = 'text-left') => {
    const active = sortField === field;
    return (
      <th
        key={field}
        className={`px-3 py-2 text-xs font-mono font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-300 transition-colors ${align}`}
        onClick={() => onSort(field)}
      >
        {label}
        {active && (
          <span className="ml-1 text-amber-400">
            {sortDir === 'desc' ? '▼' : '▲'}
          </span>
        )}
      </th>
    );
  };

  return (
    <thead>
      <tr className="border-b border-gray-800">
        {col('symbol', 'Symbol')}
        <th className="px-3 py-2 text-xs font-mono font-semibold text-gray-500 uppercase text-left">Name</th>
        {col('price', 'Price', 'text-right')}
        {col('changePercent', 'Chg%', 'text-right')}
        {col('rangePosition', 'Range%', 'text-right')}
        {col('distanceFromLow', 'From Low', 'text-right')}
        {col('volumeRatio', 'Vol/Avg', 'text-right')}
        {col('marketCap', 'Mkt Cap', 'text-right')}
        {col('multiBaggerScore', 'Score', 'text-right')}
      </tr>
    </thead>
  );
}

interface StockCardProps {
  stock: StockResult;
  onClick: () => void;
}

// Colour the range position based on where the stock sits in its 52W range
function rangePositionTextColor(pos: number): string {
  if (pos >= 80) return 'text-amber-400';
  if (pos >= 55) return 'text-blue-400';
  if (pos >= 20) return 'text-green-400';
  return 'text-red-400';
}

function rangePositionBgColor(pos: number): string {
  if (pos >= 80) return 'bg-amber-400';
  if (pos >= 55) return 'bg-blue-400';
  if (pos >= 20) return 'bg-green-400';
  return 'bg-red-400';
}

// Colour the distance-from-low based on recovery magnitude
function distanceFromLowColor(pct: number): string {
  if (pct >= 80) return 'text-amber-400';
  if (pct >= 40) return 'text-green-400';
  if (pct >= 15) return 'text-green-500/80';
  return 'text-gray-500';
}

export default function StockCard({ stock, onClick }: StockCardProps) {
  const pos = stock.changePercent >= 0;
  const et = ENTRY_TYPE_CONFIG[stock.entryType] ?? ENTRY_TYPE_CONFIG['breakout'];

  return (
    <tr
      className="border-b border-gray-800/50 hover:bg-gray-900/80 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Symbol + entry type badge + MA indicators */}
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
            {stock.symbol}
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1 py-0.5 border rounded w-fit ${et.color}`}>
            {et.icon} {et.label}
          </span>
          {/* MA alignment dots: 50D, 200D (Yahoo quote API) + squeeze badge if SMA20 enriched */}
          {(stock.sma50 > 0 || stock.sma200 > 0) && (
            <MaIndicators price={stock.price} sma20={stock.sma20} sma50={stock.sma50} sma200={stock.sma200} smaSpread={stock.smaSpread} smaBreakoutDaysAgo={stock.smaBreakoutDaysAgo} />
          )}
        </div>
      </td>

      <td className="px-3 py-2.5">
        <span className="text-xs text-gray-400 truncate max-w-[140px] block">{stock.name}</span>
        <span className="text-xs text-gray-600 font-mono">{stock.sector !== 'Unknown' ? stock.sector : ''}</span>
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-sm text-gray-200">
        {formatPrice(stock.price)}
      </td>

      <td className="px-3 py-2.5 text-right">
        <span className={`flex items-center justify-end gap-0.5 text-xs font-mono ${pos ? 'text-green-400' : 'text-red-400'}`}>
          {pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {formatPercent(stock.changePercent)}
        </span>
      </td>

      {/* Range % — position in 52W high-low range */}
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-col items-end gap-0.5">
          <span className={`font-mono text-xs font-medium ${rangePositionTextColor(stock.rangePosition)}`}>
            {stock.rangePosition.toFixed(0)}%
          </span>
          {/* Mini range bar */}
          <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${rangePositionBgColor(stock.rangePosition)}`}
              style={{ width: `${Math.max(2, stock.rangePosition)}%` }}
            />
          </div>
        </div>
      </td>

      {/* From Low — how much has recovered from 52W low */}
      <td className="px-3 py-2.5 text-right">
        <span className={`font-mono text-xs font-medium ${distanceFromLowColor(stock.distanceFromLow)}`}>
          +{stock.distanceFromLow.toFixed(1)}%
        </span>
      </td>

      <td className="px-3 py-2.5 text-right">
        <span className={`font-mono text-xs ${
          stock.volumeRatio >= 3 ? 'text-green-400'
          : stock.volumeRatio >= 2 ? 'text-amber-400'
          : stock.volumeRatio >= 1.5 ? 'text-yellow-400'
          : 'text-gray-500'
        }`}>
          {formatVolumeRatio(stock.volumeRatio)}
        </span>
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-500">
        {formatMarketCap(stock.marketCap)}
      </td>

      <td className="px-3 py-2.5 text-right">
        <MultiBaggerScore score={stock.multiBaggerScore} breakdown={stock.scoreBreakdown} />
      </td>
    </tr>
  );
}
