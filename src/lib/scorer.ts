import type { ScoreBreakdown, StockResult } from './types';
import { clamp } from './utils';

function breakoutScore(proximityToHigh: number): number {
  // proximityToHigh is % below the 52-week high (positive = below)
  if (proximityToHigh <= 1) return 25;
  if (proximityToHigh <= 2) return 22;
  if (proximityToHigh <= 3) return 18;
  if (proximityToHigh <= 5) return 12;
  return 0;
}

function momentumScore(return1M: number, return3M: number, return6M: number): number {
  const weighted = return1M * 0.5 + return3M * 0.3 + return6M * 0.2;
  // Normalize: 50% gain in weighted terms = max score
  const normalized = clamp(weighted / 50, 0, 1);
  return Math.round(normalized * 25);
}

function volumeScore(volumeRatio: number): number {
  if (volumeRatio >= 3) return 25;
  if (volumeRatio >= 2) return 20;
  if (volumeRatio >= 1.5) return 12;
  return 0;
}

function sizeScore(marketCapCategory: StockResult['marketCapCategory']): number {
  switch (marketCapCategory) {
    case 'micro': return 15;
    case 'small': return 12;
    case 'mid': return 8;
    case 'large': return 3;
    case 'mega': return 0;
  }
}

function relativeStrengthScore(return1M: number): number {
  // Simple approximation: strong 1-month return relative to market avg (~1%)
  const excess = return1M - 1;
  if (excess >= 20) return 10;
  if (excess >= 10) return 8;
  if (excess >= 5) return 5;
  if (excess >= 0) return 3;
  return 0;
}

// SMA alignment bonus (0-15 pts).
// Rewards stocks where the moving average stack is bullishly aligned.
//
// The ideal setup (as seen in major breakouts like ASML recovering from lows):
//   price > SMA50 > SMA200 = fully bullish stack, golden cross in place
//
// Convergence note: when SMA50 is close to SMA200 (within 2%), the cross is
// imminent — this is a high-potential setup even before full alignment.
function smaAlignmentScore(price: number, sma50: number, sma200: number): number {
  if (!sma50 || !sma200 || sma50 === 0 || sma200 === 0) return 0;

  const aboveSma50 = price > sma50;
  const aboveSma200 = price > sma200;
  const goldenCross = sma50 > sma200;   // 50D above 200D = long-term bullish
  const spreadPct = Math.abs((sma50 - sma200) / sma200) * 100;
  const convergingCross = !goldenCross && spreadPct < 2; // SMAs converging, cross imminent

  // Fully aligned bullish stack: price > SMA50 > SMA200
  if (aboveSma50 && aboveSma200 && goldenCross) return 15;

  // Golden cross in place, price above long-term MA (short-term MA lagging)
  if (aboveSma200 && goldenCross) return 11;

  // Golden cross in place, price above 50D (recovering through SMAs)
  if (aboveSma50 && goldenCross) return 9;

  // SMA50 converging toward SMA200 from below — imminent golden cross
  if (convergingCross && (aboveSma50 || aboveSma200)) return 8;

  // Price reclaimed 200D MA (major recovery signal, death cross still in place)
  if (aboveSma200 && !goldenCross) return 6;

  // Price above 50D only, death cross below
  if (aboveSma50 && !goldenCross) return 3;

  // Below both SMAs
  return 0;
}

export function computeScore(stock: Omit<StockResult, 'multiBaggerScore' | 'scoreBreakdown'>): {
  multiBaggerScore: number;
  scoreBreakdown: ScoreBreakdown;
} {
  const breakdown: ScoreBreakdown = {
    breakoutScore: breakoutScore(stock.proximityToHigh),
    momentumScore: momentumScore(stock.return1M, stock.return3M, stock.return6M),
    volumeScore: volumeScore(stock.volumeRatio),
    sizeScore: sizeScore(stock.marketCapCategory),
    relativeStrengthScore: relativeStrengthScore(stock.return1M),
    smaScore: smaAlignmentScore(stock.price, stock.sma50, stock.sma200),
  };

  const total = clamp(
    breakdown.breakoutScore +
    breakdown.momentumScore +
    breakdown.volumeScore +
    breakdown.sizeScore +
    breakdown.relativeStrengthScore +
    breakdown.smaScore,
    0,
    100
  );

  return { multiBaggerScore: total, scoreBreakdown: breakdown };
}

export function isStrongCandidate(score: number): boolean {
  return score >= 70;
}
