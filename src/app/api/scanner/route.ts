import { NextRequest, NextResponse } from 'next/server';
import { UNIQUE_TICKERS } from '@/data/tickers';
import { fetchBatchedQuotes } from '@/lib/yahoo';
import { cache, TTL } from '@/lib/cache';
import type { ScannerResponse, StockResult, MarketCapCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const proximity = parseFloat(searchParams.get('proximity') ?? '5');
  const minVolRatio = parseFloat(searchParams.get('minVolRatio') ?? '0');
  const marketCap = searchParams.get('marketCap') ?? 'all';
  const sector = searchParams.get('sector') ?? 'all';

  const cacheKey = 'scanner:all';
  let allStocks = cache.get<StockResult[]>(cacheKey);

  if (!allStocks) {
    console.log(`[scanner] Fetching ${UNIQUE_TICKERS.length} tickers...`);
    allStocks = await fetchBatchedQuotes(UNIQUE_TICKERS);
    cache.set(cacheKey, allStocks, TTL.SCANNER);
    console.log(`[scanner] Fetched ${allStocks.length} stocks`);
  }

  // Apply filters
  let filtered = allStocks.filter((s) => {
    if (s.proximityToHigh > proximity) return false;
    if (s.volumeRatio < minVolRatio) return false;
    if (marketCap !== 'all' && s.marketCapCategory !== (marketCap as MarketCapCategory)) return false;
    if (sector !== 'all' && s.sector.toLowerCase() !== sector.toLowerCase()) return false;
    return true;
  });

  // Sort by score desc
  filtered.sort((a, b) => b.multiBaggerScore - a.multiBaggerScore);

  const response: ScannerResponse = {
    stocks: filtered,
    lastUpdated: new Date().toISOString(),
    totalScanned: allStocks.length,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}
