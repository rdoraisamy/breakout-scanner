'use client';

import { isMarketOpen } from '@/lib/utils';

export default function MarketStatus() {
  const open = isMarketOpen();
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span
        className={`w-2 h-2 rounded-full animate-pulse ${open ? 'bg-green-400' : 'bg-red-500'}`}
      />
      <span className={open ? 'text-green-400' : 'text-red-400'}>
        {open ? 'MARKET OPEN' : 'MARKET CLOSED'}
      </span>
      <span className="text-gray-500">9:30AM–4PM ET</span>
    </div>
  );
}
