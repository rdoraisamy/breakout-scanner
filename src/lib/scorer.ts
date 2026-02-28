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

// SMA alignment + squeeze breakout bonus (0-15 pts).
//
// The highest-scoring setup is the squeeze breakout:
//   SMA20 ≈ SMA50 ≈ SMA200 (within ~5%) → price breaks above SMA20
//   → SMAs start diverging outward (the explosive expansion after compression)
//
// When SMA20 is not available (batch scan mode), falls back to SMA50/SMA200.
function smaAlignmentScore(
  price: number,
  sma20: number,
  sma50: number,
  sma200: number,
  smaSpread: number,
): number {
  if (sma50 === 0 && sma200 === 0) return 0;

  const hasSma20 = sma20 > 0;
  const aboveSma20  = hasSma20 && price > sma20;
  const aboveSma50  = sma50 > 0 && price > sma50;
  const aboveSma200 = sma200 > 0 && price > sma200;
  const goldenCross = sma50 > 0 && sma200 > 0 && sma50 > sma200;
  const sma20AboveSma50 = hasSma20 && sma50 > 0 && sma20 > sma50;

  // ── Squeeze breakout: all three SMAs converged then price ripped above ──────
  // This is the most powerful signal — tight compression followed by expansion.
  if (hasSma20 && smaSpread < 5 && aboveSma20 && sma20AboveSma50 && aboveSma50 && aboveSma200) return 15;
  if (hasSma20 && smaSpread < 10 && aboveSma20 && aboveSma50) return 13;

  // ── Classic bullish stack (no SMA20 squeeze needed) ──────────────────────────
  // Full stack: price > SMA20 > SMA50 > SMA200
  if (hasSma20 && aboveSma20 && sma20AboveSma50 && aboveSma50 && aboveSma200 && goldenCross) return 14;

  // price > SMA50 > SMA200 (golden cross)
  if (aboveSma50 && aboveSma200 && goldenCross) return 11;

  // Golden cross but price only above 200D
  if (aboveSma200 && goldenCross) return 9;

  // Golden cross, price above 50D but not 200D (recovering)
  if (aboveSma50 && goldenCross) return 8;

  // SMA50/200 converging (<2% apart) — imminent cross
  const spread50_200 = sma50 > 0 && sma200 > 0
    ? Math.abs(sma50 - sma200) / Math.min(sma50, sma200) * 100
    : 100;
  if (spread50_200 < 2 && (aboveSma50 || aboveSma200)) return 8;

  // Price reclaimed 200D (major recovery, death cross still in place)
  if (aboveSma200 && !goldenCross) return 6;

  // Price above 50D only
  if (aboveSma50) return 3;

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
    smaScore: smaAlignmentScore(stock.price, stock.sma20, stock.sma50, stock.sma200, stock.smaSpread),
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
