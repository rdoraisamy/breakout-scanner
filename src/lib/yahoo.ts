import YahooFinanceClass from 'yahoo-finance2';
import type { StockResult, StockDetail, ChartDataPoint, EntryType } from './types';
import { classifyMarketCap, sleep } from './utils';
import { computeScore } from './scorer';
import { cache, TTL } from './cache';

// yahoo-finance2 v3 requires instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinanceClass as any)({ suppressNotices: ['yahooSurvey'] });

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 350;

type AnyRecord = Record<string, unknown>;

function getNum(obj: AnyRecord | undefined, key: string): number | undefined {
  const val = obj?.[key];
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'object' && 'raw' in (val as AnyRecord)) {
    return (val as { raw: number }).raw;
  }
  if (typeof val === 'number') return val;
  return undefined;
}

function computeProximity(price: number, high: number): number {
  if (!high || high === 0) return 100;
  return Math.max(0, ((high - price) / high) * 100);
}

// % position in the 52W high-low range (0 = at low, 100 = at high)
function computeRangePosition(price: number, low52: number, high52: number): number {
  if (!high52 || !low52 || high52 === low52) return 50;
  return Math.max(0, Math.min(100, ((price - low52) / (high52 - low52)) * 100));
}

// % above the 52W low (how much the stock has recovered from its annual bottom)
function computeDistanceFromLow(price: number, low52: number): number {
  if (!low52 || low52 === 0) return 0;
  return Math.max(0, ((price - low52) / low52) * 100);
}

// Classify the entry opportunity type based on position in the 52W range.
//
// ASML pattern: stock fell from ~$1100 to ~$600 (near 52W low), then nearly
// doubled. Launchpad catches it at the bottom; Recovery catches mid-bounce.
//
// Ranges:
//   launchpad  — bottom 20% of range: near 52W low, potential reversal
//   recovery   — 20-55% of range: bouncing from lows, momentum building
//   dip_buy    — 55-95% of range: upper half, pulled back from recent highs
//   breakout   — top 5% of range: within 5% of 52W high
function classifyEntryType(proximityToHigh: number, rangePosition: number): EntryType {
  if (proximityToHigh <= 5) return 'breakout';
  if (rangePosition < 20) return 'launchpad';
  if (rangePosition < 55) return 'recovery';
  return 'dip_buy';
}

function estimateReturns(price: number, low52: number, high52: number): {
  return1M: number;
  return3M: number;
  return6M: number;
} {
  if (!low52 || !high52 || high52 === low52) return { return1M: 0, return3M: 0, return6M: 0 };
  const range = high52 - low52;
  const positionInRange = (price - low52) / range;

  const annualReturn = positionInRange >= 0.8
    ? positionInRange * 80
    : positionInRange >= 0.5
    ? positionInRange * 40
    : positionInRange * 10;

  return {
    return6M: annualReturn / 2,
    return3M: annualReturn / 4,
    return1M: annualReturn / 12,
  };
}

function parseQuote(raw: unknown, fallbackSymbol: string) {
  const q = raw as AnyRecord;
  const price = (q.regularMarketPrice as number | undefined) ?? 0;
  const high52 = (q.fiftyTwoWeekHigh as number | undefined) ?? price;
  const low52 = (q.fiftyTwoWeekLow as number | undefined) ?? price;
  const volume = (q.regularMarketVolume as number | undefined) ?? 0;
  const avgVolume =
    (q.averageDailyVolume3Month as number | undefined) ??
    (q.averageDailyVolume10Day as number | undefined) ??
    1;
  const marketCap = (q.marketCap as number | undefined) ?? 0;
  const symbol = (q.symbol as string | undefined) ?? fallbackSymbol;

  const proximityToHigh = computeProximity(price, high52);
  const rangePosition = computeRangePosition(price, low52, high52);
  const distanceFromLow = computeDistanceFromLow(price, low52);
  const entryType = classifyEntryType(proximityToHigh, rangePosition);
  const volumeRatio = avgVolume > 0 ? volume / avgVolume : 0;
  const marketCapCategory = classifyMarketCap(marketCap);
  const { return1M, return3M, return6M } = estimateReturns(price, low52, high52);

  // Yahoo Finance provides 50-day and 200-day SMAs directly in the quote response
  const sma50 = (q.fiftyDayAverage as number | undefined) ?? 0;
  const sma200 = (q.twoHundredDayAverage as number | undefined) ?? 0;

  // Initial spread using SMA50 and SMA200 (SMA20 added later by enrichWithSma20)
  let smaSpread = 100;
  if (sma50 > 0 && sma200 > 0) {
    const hi = Math.max(sma50, sma200);
    const lo = Math.min(sma50, sma200);
    smaSpread = ((hi - lo) / lo) * 100;
  }

  return {
    symbol,
    name: (q.shortName as string | undefined) ?? (q.longName as string | undefined) ?? symbol,
    price,
    change: (q.regularMarketChange as number | undefined) ?? 0,
    changePercent: (q.regularMarketChangePercent as number | undefined) ?? 0,
    fiftyTwoWeekHigh: high52,
    fiftyTwoWeekLow: low52,
    proximityToHigh,
    rangePosition,
    distanceFromLow,
    entryType,
    volume,
    avgVolume,
    volumeRatio,
    marketCap,
    marketCapCategory,
    sector: (q.sector as string | undefined) ?? 'Unknown',
    industry: (q.industry as string | undefined) ?? 'Unknown',
    sma20: 0,
    sma50,
    sma200,
    smaSpread,
    smaBreakoutDaysAgo: -1,
    return1M,
    return3M,
    return6M,
  };
}

export async function fetchBatchedQuotes(tickers: string[]): Promise<StockResult[]> {
  const results: StockResult[] = [];
  const batches: string[][] = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    batches.push(tickers.slice(i, i + BATCH_SIZE));
  }

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    if (batchIdx > 0) await sleep(BATCH_DELAY_MS);

    try {
      const quotes = await Promise.allSettled(
        batch.map((symbol) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (yahooFinance.quote as any)(symbol, {}, { validateResult: false })
        )
      );

      for (let i = 0; i < quotes.length; i++) {
        const result = quotes[i];
        if (result.status !== 'fulfilled' || !result.value) continue;

        const raw = result.value as AnyRecord;
        if (!raw.regularMarketPrice) continue;

        const partial = parseQuote(raw, batch[i]);
        const { multiBaggerScore, scoreBreakdown } = computeScore(partial);
        results.push({ ...partial, multiBaggerScore, scoreBreakdown });
      }
    } catch (err) {
      console.error(`Batch ${batchIdx} error:`, err);
    }
  }

  return results;
}

export async function fetchStockDetail(symbol: string): Promise<StockDetail | null> {
  try {
    const [quoteResult, summaryResult] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (yahooFinance.quote as any)(symbol, {}, { validateResult: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (yahooFinance.quoteSummary as any)(symbol, {
        modules: ['defaultKeyStatistics', 'financialData', 'summaryProfile'],
      }, { validateResult: false }),
    ]);

    if (quoteResult.status !== 'fulfilled' || !quoteResult.value) return null;

    const raw = quoteResult.value as AnyRecord;
    const partial = parseQuote(raw, symbol);
    const { multiBaggerScore, scoreBreakdown } = computeScore(partial);

    const summaryRaw = summaryResult.status === 'fulfilled'
      ? (summaryResult.value as AnyRecord)
      : null;

    const ks = summaryRaw?.defaultKeyStatistics as AnyRecord | undefined;
    const fd = summaryRaw?.financialData as AnyRecord | undefined;
    const sp = summaryRaw?.summaryProfile as AnyRecord | undefined;

    return {
      ...partial,
      sector: (partial.sector !== 'Unknown' ? partial.sector : (sp?.sector as string | undefined)) ?? 'Unknown',
      industry: (partial.industry !== 'Unknown' ? partial.industry : (sp?.industry as string | undefined)) ?? 'Unknown',
      multiBaggerScore,
      scoreBreakdown,
      pe: getNum(fd, 'trailingPE') ?? getNum(ks, 'trailingPE'),
      peg: getNum(ks, 'pegRatio'),
      eps: getNum(ks, 'trailingEps'),
      revenueGrowth: getNum(fd, 'revenueGrowth') != null
        ? getNum(fd, 'revenueGrowth')! * 100
        : undefined,
      epsGrowth: getNum(fd, 'earningsGrowth') != null
        ? getNum(fd, 'earningsGrowth')! * 100
        : undefined,
      shortInterest: getNum(ks, 'shortPercentOfFloat') != null
        ? getNum(ks, 'shortPercentOfFloat')! * 100
        : undefined,
      floatShares: getNum(ks, 'floatShares'),
      beta: getNum(ks, 'beta'),
      description: sp?.longBusinessSummary as string | undefined,
    };
  } catch (err) {
    console.error(`fetchStockDetail error for ${symbol}:`, err);
    return null;
  }
}

// Two-pass enrichment: fetch chart data for squeeze-filter candidates and compute
// the real SMA20.  Results are stored back on the stock objects in-place so the
// scanner cache also benefits on subsequent requests.
//
// The pre-filter (smaSpread < 20%) keeps this set small (~20-60 stocks) so the
// extra chart fetches are fast and cheap.
export async function enrichWithSma20(stocks: StockResult[]): Promise<void> {
  const CHART_BATCH = 10;
  const CHART_DELAY_MS = 250;

  for (let i = 0; i < stocks.length; i += CHART_BATCH) {
    const batch = stocks.slice(i, i + CHART_BATCH);
    if (i > 0) await sleep(CHART_DELAY_MS);

    await Promise.allSettled(batch.map(async (stock) => {
      const cacheKey = `chart:${stock.symbol}`;
      let chartData = cache.get<ChartDataPoint[]>(cacheKey);

      if (!chartData) {
        chartData = await fetchChart(stock.symbol);
        if (chartData.length > 0) cache.set(cacheKey, chartData, TTL.CHART);
      }

      if (!chartData || chartData.length < 20) return;

      const closes = chartData.map((d) => d.close);

      // Compute SMA20 from the most recent 20 closes
      const sma20 = closes.slice(-20).reduce((s, p) => s + p, 0) / 20;
      stock.sma20 = sma20;

      // Recompute spread with all three SMAs now that we have SMA20
      const vals = [sma20, stock.sma50, stock.sma200].filter((v) => v > 0);
      if (vals.length >= 2) {
        const hi = Math.max(...vals);
        const lo = Math.min(...vals);
        stock.smaSpread = lo > 0 ? ((hi - lo) / lo) * 100 : 100;
      }

      // Detect the most recent SMA20 crossover within the last 20 trading days.
      // Requires 40 closes: 20 for rolling SMA20 base + 20-day lookback window.
      stock.smaBreakoutDaysAgo = -1;
      if (closes.length >= 40) {
        const window = closes.slice(-40);
        // Build rolling SMA20 + corresponding price for positions 19..39
        const rollingPrices: number[] = [];
        const rollingSmas: number[] = [];
        for (let i = 19; i < window.length; i++) {
          rollingPrices.push(window[i]);
          rollingSmas.push(window.slice(i - 19, i + 1).reduce((s, p) => s + p, 0) / 20);
        }
        // Scan backwards from today — find first (most recent) upward crossover
        for (let i = rollingPrices.length - 1; i >= 1; i--) {
          const daysAgo = rollingPrices.length - 1 - i;
          if (daysAgo > 20) break;
          if (rollingPrices[i] > rollingSmas[i] && rollingPrices[i - 1] <= rollingSmas[i - 1]) {
            stock.smaBreakoutDaysAgo = daysAgo;
            break;
          }
        }
      }
    }));
  }
}

export async function fetchChart(symbol: string): Promise<ChartDataPoint[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (yahooFinance.chart as any)(symbol, {
      period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      interval: '1d',
    }, { validateResult: false }) as AnyRecord;

    const quotes = result?.quotes as AnyRecord[] | undefined;
    if (!quotes || !Array.isArray(quotes)) return [];

    return quotes
      .filter((q) => q.open != null)
      .map((q) => ({
        date: new Date(q.date as string | number).toISOString().split('T')[0],
        open: (q.open as number) ?? 0,
        high: (q.high as number) ?? 0,
        low: (q.low as number) ?? 0,
        close: (q.close as number) ?? 0,
        volume: (q.volume as number) ?? 0,
      }));
  } catch (err) {
    console.error(`fetchChart error for ${symbol}:`, err);
    return [];
  }
}
