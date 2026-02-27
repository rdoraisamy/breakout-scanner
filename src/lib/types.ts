export interface ScoreBreakdown {
  breakoutScore: number;        // proximity to 52-week high (0-25)
  momentumScore: number;        // price momentum 1M/3M/6M (0-25)
  volumeScore: number;          // volume surge (0-25)
  sizeScore: number;            // market cap bonus (0-15)
  relativeStrengthScore: number; // vs sector (0-10)
}

export type MarketCapCategory = 'micro' | 'small' | 'mid' | 'large' | 'mega';

export interface StockResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  proximityToHigh: number;      // % below 52-week high
  volume: number;
  avgVolume: number;
  volumeRatio: number;          // volume / avgVolume
  marketCap: number;
  marketCapCategory: MarketCapCategory;
  sector: string;
  industry: string;
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
  | 'volumeRatio'
  | 'marketCap'
  | 'multiBaggerScore';

export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  proximity: number;        // max % below 52-week high
  minVolRatio: number;
  marketCap: 'all' | MarketCapCategory;
  sector: string;
}
