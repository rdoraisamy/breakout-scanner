import { NextRequest, NextResponse } from 'next/server';
import { fetchBatchedQuotes } from '@/lib/yahoo';
import { cache, TTL } from '@/lib/cache';
import type { StockResult } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols') ?? '';
  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ stocks: [] });
  }

  const results: StockResult[] = [];

  for (const symbol of symbols) {
    const cacheKey = `watchlist:${symbol}`;
    let stock = cache.get<StockResult>(cacheKey);
    if (!stock) {
      const fetched = await fetchBatchedQuotes([symbol]);
      stock = fetched[0] ?? null;
      if (stock) cache.set(cacheKey, stock, TTL.SCANNER);
    }
    if (stock) results.push(stock);
  }

  return NextResponse.json({ stocks: results });
}
