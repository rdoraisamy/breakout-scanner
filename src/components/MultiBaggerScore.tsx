'use client';

import { useState } from 'react';
import type { ScoreBreakdown } from '@/lib/types';
import { isStrongCandidate } from '@/lib/scorer';

interface MultiBaggerScoreProps {
  score: number;
  breakdown: ScoreBreakdown;
}

export default function MultiBaggerScore({ score, breakdown }: MultiBaggerScoreProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const strong = isStrongCandidate(score);

  const color = score >= 80
    ? 'text-green-400 border-green-500'
    : score >= 70
    ? 'text-amber-400 border-amber-500'
    : score >= 50
    ? 'text-yellow-400 border-yellow-600'
    : 'text-gray-400 border-gray-600';

  const barWidth = (val: number, max: number) => `${Math.round((val / max) * 100)}%`;

  return (
    <div className="relative" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <div className={`inline-flex items-center gap-1 border rounded px-2 py-0.5 font-mono text-sm cursor-default select-none ${color}`}>
        <span className="font-bold">{score}</span>
        {strong && <span className="text-xs">★</span>}
      </div>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-gray-900 border border-gray-700 rounded shadow-xl p-3 text-xs font-mono">
          <div className="text-gray-400 mb-2 font-semibold">SCORE BREAKDOWN</div>
          <ScoreRow label="Breakout" value={breakdown.breakoutScore} max={25} />
          <ScoreRow label="Momentum" value={breakdown.momentumScore} max={25} />
          <ScoreRow label="Volume" value={breakdown.volumeScore} max={25} />
          <ScoreRow label="Size" value={breakdown.sizeScore} max={15} />
          <ScoreRow label="Rel Strength" value={breakdown.relativeStrengthScore} max={10} />
          <ScoreRow label="MA Align" value={breakdown.smaScore} max={15} color="#a78bfa" />
          <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
            <span className="text-gray-500">TOTAL</span>
            <span className={strong ? 'text-green-400 font-bold' : 'text-amber-400'}>{score}/100</span>
          </div>
          {strong && (
            <div className="mt-1 text-green-400 text-center">★ STRONG CANDIDATE</div>
          )}
        </div>
      )}
    </div>
  );

  function ScoreRow({ label, value, max, color = '#f59e0b' }: { label: string; value: number; max: number; color?: string }) {
    return (
      <div className="mb-1.5">
        <div className="flex justify-between mb-0.5">
          <span className="text-gray-400">{label}</span>
          <span className="text-gray-300">{value}/{max}</span>
        </div>
        <div className="h-1 bg-gray-800 rounded overflow-hidden">
          <div
            className="h-full rounded"
            style={{ width: barWidth(value, max), backgroundColor: color }}
          />
        </div>
      </div>
    );
  }
}
