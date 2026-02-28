import { NextRequest, NextResponse } from 'next/server';
import { UNIQUE_TICKERS } from '@/data/tickers';
import { fetchBatchedQuotes, enrichWithSma20 } from '@/lib/yahoo';
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

  // ── Squeeze filters: two-pass enrichment ─────────────────────────────────────
  // squeeze_* modes need SMA20 (not available in batch quotes).
  // Pre-filter to candidates where SMA50/200 are already within 20%,
  // then fetch chart data to compute real SMA20 and tighten the spread.
  const isSqueezeFilter = smaFilter === 'squeeze_5' || smaFilter === 'squeeze_10' || smaFilter === 'squeeze_breakout';

  if (isSqueezeFilter) {
    const squeezeCacheKey = `scanner:squeeze:${smaFilter}`;
    const cachedSqueeze = cache.get<StockResult[]>(squeezeCacheKey);

    if (!cachedSqueeze) {
      // Pre-filter: stocks with SMA50/200 spread < 20% (fast pre-selection)
      const candidates = allStocks.filter(
        (s) => s.sma50 > 0 && s.sma200 > 0 && s.smaSpread < 20
      );
      console.log(`[scanner] Squeeze pre-filter: ${candidates.length} candidates for SMA20 enrichment`);

      // Enrich with real SMA20 from chart data (in-place mutation)
      await enrichWithSma20(candidates);

      // Cache enriched candidates for 5 minutes (same as scanner TTL)
      cache.set(squeezeCacheKey, candidates, TTL.SCANNER);

      // Patch the allStocks array so the regular filter path uses updated sma20/smaSpread
      const symbolMap = new Map(candidates.map((s) => [s.symbol, s]));
      for (let i = 0; i < allStocks.length; i++) {
        const enriched = symbolMap.get(allStocks[i].symbol);
        if (enriched) allStocks[i] = enriched;
      }
    } else {
      // Use cached enriched data
      const symbolMap = new Map(cachedSqueeze.map((s) => [s.symbol, s]));
      for (let i = 0; i < allStocks.length; i++) {
        const enriched = symbolMap.get(allStocks[i].symbol);
        if (enriched) allStocks[i] = enriched;
      }
    }
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
      const aboveSma20 = s.sma20 > 0 && s.price > s.sma20;

      if (smaFilter === 'above_50' && !aboveSma50) return false;
      if (smaFilter === 'above_200' && !aboveSma200) return false;
      if (smaFilter === 'above_both' && !(aboveSma50 && aboveSma200)) return false;
      if (smaFilter === 'golden_cross' && !goldenCross) return false;

      // Squeeze filters: require SMA20 enrichment to have run (sma20 > 0)
      if (smaFilter === 'squeeze_5') {
        if (s.sma20 === 0 || s.smaSpread >= 5) return false;
      }
      if (smaFilter === 'squeeze_10') {
        if (s.sma20 === 0 || s.smaSpread >= 10) return false;
      }
      if (smaFilter === 'squeeze_breakout') {
        // Squeezed MAs (within 10%) AND price crossed above SMA20 within the last 20 trading days
        if (s.sma20 === 0 || s.smaSpread >= 10 || !aboveSma20) return false;
        if (s.smaBreakoutDaysAgo < 0 || s.smaBreakoutDaysAgo > 20) return false;
      }
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
