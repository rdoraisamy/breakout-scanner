'use client';

import { useState, useMemo } from 'react';
import type { StockResult, SortField, SortDirection } from '@/lib/types';
import StockCard, { ScannerTableHeader } from './StockCard';
import SkeletonRow from './SkeletonRow';

interface ScannerTableProps {
  stocks: StockResult[];
  loading: boolean;
  onSelectStock: (symbol: string) => void;
}

export default function ScannerTable({ stocks, loading, onSelectStock }: ScannerTableProps) {
  const [sortField, setSortField] = useState<SortField>('multiBaggerScore');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    return [...stocks].sort((a, b) => {
      const av = a[sortField] as number | string;
      const bv = b[sortField] as number | string;
      const dir = sortDir === 'desc' ? -1 : 1;
      if (typeof av === 'string' && typeof bv === 'string') {
        return dir * av.localeCompare(bv);
      }
      return dir * ((av as number) - (bv as number));
    });
  }, [stocks, sortField, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <ScannerTableHeader
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <tbody>
          {loading && stocks.length === 0 && (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          )}
          {!loading && sorted.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-12 text-center text-gray-600 font-mono text-sm">
                No stocks match your filters. Try widening the proximity % or resetting filters.
              </td>
            </tr>
          )}
          {sorted.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onClick={() => onSelectStock(stock.symbol)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
