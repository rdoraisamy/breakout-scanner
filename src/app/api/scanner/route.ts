import { NextRequest, NextResponse } from 'next/server';
import { UNIQUE_TICKERS } from '@/data/tickers';
import { fetchBatchedQuotes } from '@/lib/yahoo';
import { cache, TTL } from '@/lib/cache';
import type { ScannerResponse, StockResult, MarketCapCategory, EntryType, SmaFilter } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const proximity = parseFloat(searchParams.get('proximity') ?? '5');
  const minVolRatio = parseFloat(searchParams.get('minVolRatio') ?? '0');
  const marketCap = searchParams.get('marketCap') ?? 'all';
  const sector = searchParams.get('sector') ?? 'all';
  const entryType = (searchParams.get('entryType') ?? 'breakout') as 'all' | EntryType;
  const smaFilter = (searchParams.get('smaFilter') ?? 'any') as SmaFilter;

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
    // Entry type filter — determines which stocks are eligible
    // 'all': no entry type filter, but proximity still applied
    // 'breakout': only stocks near 52W high (uses proximity slider)
    // 'recovery'/'dip_buy'/'launchpad': filter by classified entryType, no proximity filter
    if (entryType === 'all') {
      if (s.proximityToHigh > proximity) return false;
    } else if (entryType === 'breakout') {
      if (s.proximityToHigh > proximity) return false;
    } else {
      // recovery, dip_buy, launchpad — filter by the stock's classified entry type
      if (s.entryType !== entryType) return false;
    }

    if (s.volumeRatio < minVolRatio) return false;
    if (marketCap !== 'all' && s.marketCapCategory !== (marketCap as MarketCapCategory)) return false;
    if (sector !== 'all' && s.sector.toLowerCase() !== sector.toLowerCase()) return false;

    // SMA alignment filter — only apply when SMAs are available (non-zero)
    if (smaFilter !== 'any' && s.sma50 > 0 && s.sma200 > 0) {
      const aboveSma50 = s.price > s.sma50;
      const aboveSma200 = s.price > s.sma200;
      const goldenCross = s.sma50 > s.sma200;
      if (smaFilter === 'above_50' && !aboveSma50) return false;
      if (smaFilter === 'above_200' && !aboveSma200) return false;
      if (smaFilter === 'above_both' && !(aboveSma50 && aboveSma200)) return false;
      if (smaFilter === 'golden_cross' && !goldenCross) return false;
    }

    return true;
  });

  // Sort: for recovery/launchpad modes, sort by distanceFromLow desc (most recovered = top)
  // For breakout/all, sort by multiBaggerScore desc
  if (entryType === 'recovery' || entryType === 'launchpad') {
    filtered.sort((a, b) => b.distanceFromLow - a.distanceFromLow);
  } else if (entryType === 'dip_buy') {
    // Dip buy: sort by rangePosition desc (deepest in upper range = most room to recover)
    filtered.sort((a, b) => b.rangePosition - a.rangePosition);
  } else {
    filtered.sort((a, b) => b.multiBaggerScore - a.multiBaggerScore);
  }

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
