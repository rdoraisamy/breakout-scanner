'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockResult, SortField, SortDirection } from '@/lib/types';
import {
  formatPrice, formatPercent, formatMarketCap,
  formatVolumeRatio
} from '@/lib/utils';
import MultiBaggerScore from './MultiBaggerScore';

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
        <th className="px-3 py-2 text-xs font-mono font-semibold text-gray-500 uppercase text-right">52W High</th>
        {col('proximityToHigh', 'Prox%', 'text-right')}
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

export default function StockCard({ stock, onClick }: StockCardProps) {
  const pos = stock.changePercent >= 0;

  return (
    <tr
      className="border-b border-gray-800/50 hover:bg-gray-900/80 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <td className="px-3 py-2.5">
        <span className="font-mono font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
          {stock.symbol}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-gray-400 truncate max-w-[160px] block">{stock.name}</span>
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
      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-400">
        {formatPrice(stock.fiftyTwoWeekHigh)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className={`font-mono text-xs font-medium ${
          stock.proximityToHigh <= 1 ? 'text-green-400'
          : stock.proximityToHigh <= 3 ? 'text-amber-400'
          : 'text-gray-400'
        }`}>
          -{stock.proximityToHigh.toFixed(1)}%
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
