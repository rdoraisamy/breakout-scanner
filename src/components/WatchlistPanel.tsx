'use client';

import { useEffect, useState } from 'react';
import { X, Star } from 'lucide-react';
import type { StockResult } from '@/lib/types';
import { formatPrice, formatPercent } from '@/lib/utils';

interface WatchlistPanelProps {
  symbols: string[];
  onRemove: (symbol: string) => void;
  onSelect: (symbol: string) => void;
}

export default function WatchlistPanel({ symbols, onRemove, onSelect }: WatchlistPanelProps) {
  const [stocks, setStocks] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbols.length === 0) { setStocks([]); return; }
    setLoading(true);
    fetch(`/api/watchlist?symbols=${symbols.join(',')}`)
      .then((r) => r.json())
      .then((d) => { setStocks(d.stocks ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbols.join(',')]);

  if (symbols.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} className="text-amber-400" />
          <span className="text-xs font-mono text-gray-400 font-semibold">WATCHLIST</span>
        </div>
        <p className="text-xs text-gray-600 font-mono">
          Click a stock row and add to watchlist to track it here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <Star size={14} className="text-amber-400" />
        <span className="text-xs font-mono text-gray-400 font-semibold">WATCHLIST</span>
        <span className="ml-auto text-xs font-mono text-gray-600">{symbols.length}</span>
      </div>

      {loading && (
        <div className="p-4 text-xs text-gray-600 font-mono animate-pulse">Loading...</div>
      )}

      <div className="divide-y divide-gray-800">
        {stocks.map((s) => {
          const pos = s.changePercent >= 0;
          return (
            <div
              key={s.symbol}
              className="flex items-center px-3 py-2 hover:bg-gray-800/50 cursor-pointer group"
              onClick={() => onSelect(s.symbol)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono font-bold text-white">{s.symbol}</div>
                <div className="text-xs text-gray-500 truncate">{s.name}</div>
              </div>
              <div className="text-right mr-2">
                <div className="text-xs font-mono text-gray-300">{formatPrice(s.price)}</div>
                <div className={`text-xs font-mono ${pos ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(s.changePercent)}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(s.symbol); }}
                className="p-1 text-gray-700 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
