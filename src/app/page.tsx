'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import type { StockResult, FilterState } from '@/lib/types';
import MarketStatus from '@/components/MarketStatus';
import StatsBar from '@/components/StatsBar';
import FilterBar from '@/components/FilterBar';
import ScannerTable from '@/components/ScannerTable';
import StockDetailModal from '@/components/StockDetailModal';
import WatchlistPanel from '@/components/WatchlistPanel';

const DEFAULT_FILTERS: FilterState = {
  proximity: 5,
  minVolRatio: 0,
  marketCap: 'all',
  sector: 'all',
};

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export default function ScannerPage() {
  const [stocks, setStocks] = useState<StockResult[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load watchlist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('watchlist');
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
  }, []);

  const saveWatchlist = (list: string[]) => {
    setWatchlist(list);
    try { localStorage.setItem('watchlist', JSON.stringify(list)); } catch {}
  };

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      proximity: filters.proximity.toString(),
      minVolRatio: filters.minVolRatio.toString(),
      marketCap: filters.marketCap,
      sector: filters.sector,
    });

    try {
      const res = await fetch(`/api/scanner?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStocks(data.stocks ?? []);
      setTotalScanned(data.totalScanned ?? 0);
      setLastUpdated(data.lastUpdated ?? null);
      setCountdown(AUTO_REFRESH_MS / 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Initial fetch + refetch on filter change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchData(true);
          return AUTO_REFRESH_MS / 1000;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchData]);

  const handleManualRefresh = () => {
    setCountdown(AUTO_REFRESH_MS / 1000);
    fetchData(true);
  };

  const handleAddToWatchlist = (symbol: string) => {
    if (watchlist.includes(symbol)) {
      saveWatchlist(watchlist.filter((s) => s !== symbol));
    } else {
      saveWatchlist([...watchlist, symbol]);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Bar */}
      <header className="bg-gray-950 border-b border-gray-800 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-amber-400" />
              <span className="font-mono font-bold text-white tracking-wider text-sm">
                BREAKOUT SCANNER
              </span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-700" />
            <div className="hidden sm:block">
              <MarketStatus />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:inline text-xs font-mono text-gray-600">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <span className="text-xs font-mono text-gray-600">
              {formatTime(countdown)}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Scanning...' : 'Refresh'}
            </button>
          </div>
        </div>

        <StatsBar stocks={stocks} totalScanned={totalScanned} />
        <FilterBar filters={filters} onChange={setFilters} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Scanner Table */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="p-8 text-center">
              <div className="text-red-400 font-mono text-sm mb-2">Error: {error}</div>
              <button
                onClick={() => fetchData()}
                className="text-xs font-mono text-gray-400 hover:text-white underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <ScannerTable
              stocks={stocks}
              loading={loading}
              onSelectStock={setSelectedSymbol}
            />
          )}
        </div>

        {/* Watchlist Sidebar */}
        <aside className="hidden lg:block w-64 border-l border-gray-800 overflow-y-auto p-3 flex-shrink-0">
          <WatchlistPanel
            symbols={watchlist}
            onRemove={(s) => saveWatchlist(watchlist.filter((x) => x !== s))}
            onSelect={setSelectedSymbol}
          />
        </aside>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-mono text-gray-600">
          Data via Yahoo Finance · For informational purposes only
        </span>
        <span className="text-xs font-mono text-gray-700">
          Score ≥ 70 = Strong Multi-Bagger Candidate
        </span>
      </footer>

      {/* Stock Detail Modal */}
      {selectedSymbol && (
        <StockDetailModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          onAddToWatchlist={handleAddToWatchlist}
          isWatchlisted={watchlist.includes(selectedSymbol)}
        />
      )}
    </div>
  );
}
