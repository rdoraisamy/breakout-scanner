export interface ScoreBreakdown {
  breakoutScore: number;        // proximity to 52-week high (0-25)
  momentumScore: number;        // price momentum 1M/3M/6M (0-25)
  volumeScore: number;          // volume surge (0-25)
  sizeScore: number;            // market cap bonus (0-15)
  relativeStrengthScore: number; // vs sector (0-10)
  smaScore: number;             // SMA alignment bonus (0-15)
}

export type MarketCapCategory = 'micro' | 'small' | 'mid' | 'large' | 'mega';

// Entry opportunity type — what kind of setup does this stock represent
export type EntryType = 'breakout' | 'recovery' | 'dip_buy' | 'launchpad';

export interface StockResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  proximityToHigh: number;      // % below 52-week high
  rangePosition: number;        // % position in 52W range (0=at low, 100=at high)
  distanceFromLow: number;      // % above 52W low (recovery amount)
  entryType: EntryType;         // classified entry opportunity
  volume: number;
  avgVolume: number;
  volumeRatio: number;          // volume / avgVolume
  marketCap: number;
  marketCapCategory: MarketCapCategory;
  sector: string;
  industry: string;
  sma20: number;                // 20-day SMA (0 unless enriched by squeeze scanner)
  sma50: number;                // 50-day SMA (from Yahoo quote API)
  sma200: number;               // 200-day SMA (from Yahoo quote API)
  smaSpread: number;            // max spread % across available SMAs — convergence metric
  return1M: number;             // 1-month price return %
  return3M: number;
  return6M: number;
  multiBaggerScore: number;     // 0-100 composite score
  scoreBreakdown: ScoreBreakdown;
}

export interface ScannerResponse {
  stocks: StockResult[];
  lastUpdated: string;
  totalScanned: number;
}

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockDetail extends StockResult {
  pe?: number;
  peg?: number;
  eps?: number;
  revenueGrowth?: number;
  epsGrowth?: number;
  shortInterest?: number;
  floatShares?: number;
  beta?: number;
  dividendYield?: number;
  description?: string;
}

export type SortField =
  | 'symbol'
  | 'price'
  | 'changePercent'
  | 'proximityToHigh'
  | 'rangePosition'
  | 'distanceFromLow'
  | 'volumeRatio'
  | 'marketCap'
  | 'multiBaggerScore';

export type SortDirection = 'asc' | 'desc';

// 'squeeze_*' modes trigger a two-pass scan: batch quotes → chart data for SMA20
export type SmaFilter =
  | 'any'
  | 'above_50'
  | 'above_200'
  | 'above_both'
  | 'golden_cross'
  | 'squeeze_5'         // SMA20/50/200 all within 5% of each other
  | 'squeeze_10'        // SMA20/50/200 all within 10%
  | 'squeeze_breakout'; // within 10% AND price crossed above SMA20 (breakout signal)

export interface FilterState {
  proximity: number;              // max % below 52-week high (breakout mode)
  minVolRatio: number;
  marketCap: 'all' | MarketCapCategory;
  sector: string;
  entryType: 'all' | EntryType;  // which entry opportunity type to show
  smaFilter: SmaFilter;          // moving average alignment filter
}
