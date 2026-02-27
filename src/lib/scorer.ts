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
  };

  const total = clamp(
    breakdown.breakoutScore +
    breakdown.momentumScore +
    breakdown.volumeScore +
    breakdown.sizeScore +
    breakdown.relativeStrengthScore,
    0,
    100
  );

  return { multiBaggerScore: total, scoreBreakdown: breakdown };
}

export function isStrongCandidate(score: number): boolean {
  return score >= 70;
}
