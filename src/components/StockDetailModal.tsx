'use client';

import { useEffect, useState } from 'react';
import { X, Star, TrendingUp, TrendingDown } from 'lucide-react';
import type { StockDetail, EntryType } from '@/lib/types';
import {
  formatPrice, formatPercent, formatMarketCap,
  formatVolume, formatVolumeRatio
} from '@/lib/utils';
import { isStrongCandidate } from '@/lib/scorer';

const ENTRY_TYPE_CONFIG: Record<EntryType, { label: string; icon: string; color: string }> = {
  breakout:  { label: 'BREAKOUT',  icon: '▲', color: 'text-amber-400 bg-amber-950/60 border-amber-700' },
  recovery:  { label: 'RECOVERY',  icon: '↗', color: 'text-green-400 bg-green-950/60 border-green-700' },
  dip_buy:   { label: 'DIP BUY',   icon: '↘', color: 'text-blue-400 bg-blue-950/60 border-blue-700' },
  launchpad: { label: 'LAUNCHPAD', icon: '⬛', color: 'text-red-400 bg-red-950/60 border-red-700' },
};
import PriceChart from './PriceChart';
import MultiBaggerScore from './MultiBaggerScore';

interface StockDetailModalProps {
  symbol: string;
  onClose: () => void;
  onAddToWatchlist: (symbol: string) => void;
  isWatchlisted: boolean;
}

export default function StockDetailModal({
  symbol, onClose, onAddToWatchlist, isWatchlisted
}: StockDetailModalProps) {
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stock/${symbol}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setDetail(d); setLoading(false); })
      .catch((e) => { setError(e.message ?? 'Failed to load stock data'); setLoading(false); });
  }, [symbol]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const pos = detail ? detail.changePercent >= 0 : false;
  const strong = detail ? isStrongCandidate(detail.multiBaggerScore) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-950 border border-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono text-white">{symbol}</h2>
                {strong && (
                  <span className="text-xs bg-green-900/50 border border-green-700 text-green-400 px-1.5 py-0.5 rounded font-mono">
                    ★ STRONG CANDIDATE
                  </span>
                )}
              </div>
              {detail && (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400">{detail.name}</p>
                  {(() => {
                    const et = ENTRY_TYPE_CONFIG[detail.entryType] ?? ENTRY_TYPE_CONFIG['breakout'];
                    return (
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 border rounded ${et.color}`}>
                        {et.icon} {et.label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddToWatchlist(symbol)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded border font-mono transition-colors ${
                isWatchlisted
                  ? 'border-amber-600 text-amber-400 bg-amber-900/20'
                  : 'border-gray-700 text-gray-400 hover:border-amber-600 hover:text-amber-400'
              }`}
            >
              <Star size={12} fill={isWatchlisted ? 'currentColor' : 'none'} />
              {isWatchlisted ? 'WATCHING' : 'WATCH'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-500 font-mono text-sm animate-pulse">
            Loading {symbol}...
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-400 font-mono text-sm">{error}</div>
        )}

        {detail && !loading && (
          <div className="p-5 space-y-5">
            {/* Price + Score row */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold font-mono text-white">
                  {formatPrice(detail.price)}
                </div>
                <div className={`flex items-center gap-1 text-sm font-mono mt-0.5 ${pos ? 'text-green-400' : 'text-red-400'}`}>
                  {pos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {formatPercent(detail.changePercent)} today
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 font-mono mb-1">MULTI-BAGGER SCORE</div>
                <MultiBaggerScore score={detail.multiBaggerScore} breakdown={detail.scoreBreakdown} />
              </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
              <div className="text-xs text-gray-500 font-mono mb-2">1-YEAR PRICE CHART</div>
              <PriceChart symbol={symbol} />
            </div>

            {/* Range position visual — shows where the stock sits in its 52W range */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-mono">52W RANGE POSITION</span>
                <span className="text-xs font-mono text-gray-300">
                  {formatPrice(detail.fiftyTwoWeekLow)} → {formatPrice(detail.fiftyTwoWeekHigh)}
                </span>
              </div>
              <div className="relative h-2 bg-gray-800 rounded-full">
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-red-600 via-green-500 to-amber-400"
                  style={{ width: '100%', opacity: 0.3 }}
                />
                {/* Current position marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-white shadow-lg"
                  style={{ left: `calc(${detail.rangePosition}% - 6px)` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] font-mono text-red-400">52W LOW</span>
                <span className="text-xs font-mono text-white font-bold">
                  {detail.rangePosition.toFixed(0)}% of range
                </span>
                <span className="text-[10px] font-mono text-amber-400">52W HIGH</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs font-mono text-gray-400">
                <span>From low: <span className="text-green-400">+{detail.distanceFromLow.toFixed(1)}%</span></span>
                <span>From high: <span className="text-amber-400">-{detail.proximityToHigh.toFixed(1)}%</span></span>
              </div>
            </div>

            {/* Moving Average alignment panel */}
            {(detail.sma50 > 0 || detail.sma200 > 0) && (() => {
              const above50  = detail.sma50 > 0 && detail.price > detail.sma50;
              const above200 = detail.sma200 > 0 && detail.price > detail.sma200;
              const goldenCross = detail.sma50 > 0 && detail.sma200 > 0 && detail.sma50 > detail.sma200;
              const spreadPct = detail.sma50 > 0 && detail.sma200 > 0
                ? ((detail.sma50 - detail.sma200) / detail.sma200 * 100)
                : null;
              return (
                <div>
                  <div className="text-xs text-gray-500 font-mono mb-2">MOVING AVERAGES</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {detail.sma50 > 0 && (
                      <Metric
                        label="SMA 50D"
                        value={formatPrice(detail.sma50)}
                        color={above50 ? 'text-amber-400' : 'text-red-400'}
                        sub={above50 ? '▲ price above' : '▼ price below'}
                      />
                    )}
                    {detail.sma200 > 0 && (
                      <Metric
                        label="SMA 200D"
                        value={formatPrice(detail.sma200)}
                        color={above200 ? 'text-purple-400' : 'text-red-400'}
                        sub={above200 ? '▲ price above' : '▼ price below'}
                      />
                    )}
                    {spreadPct != null && (
                      <Metric
                        label="50/200 SPREAD"
                        value={(spreadPct >= 0 ? '+' : '') + spreadPct.toFixed(1) + '%'}
                        color={goldenCross ? 'text-yellow-400' : 'text-red-400'}
                        sub={goldenCross ? '★ Golden Cross' : '✕ Death Cross'}
                      />
                    )}
                    <Metric
                      label="MA STACK"
                      value={above50 && above200 && goldenCross ? 'Bullish ✓' : above50 || above200 ? 'Mixed' : 'Bearish'}
                      color={above50 && above200 && goldenCross ? 'text-green-400' : above50 || above200 ? 'text-amber-400' : 'text-red-400'}
                      sub="price vs 50 & 200D"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Key Metrics */}
            <div>
              <div className="text-xs text-gray-500 font-mono mb-2">KEY METRICS</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Metric label="52W HIGH" value={formatPrice(detail.fiftyTwoWeekHigh)} />
                <Metric label="52W LOW" value={formatPrice(detail.fiftyTwoWeekLow)} />
                <Metric
                  label="FROM LOW"
                  value={'+' + detail.distanceFromLow.toFixed(1) + '%'}
                  color={detail.distanceFromLow >= 40 ? 'text-green-400' : detail.distanceFromLow >= 15 ? 'text-green-500/80' : 'text-gray-400'}
                />
                <Metric
                  label="VOL RATIO"
                  value={formatVolumeRatio(detail.volumeRatio)}
                  color={detail.volumeRatio >= 2 ? 'text-green-400' : 'text-gray-300'}
                />
                <Metric label="MARKET CAP" value={formatMarketCap(detail.marketCap)} />
                <Metric label="VOLUME" value={formatVolume(detail.volume)} />
                <Metric label="AVG VOLUME" value={formatVolume(detail.avgVolume)} />
                <Metric label="SECTOR" value={detail.sector} />
              </div>
            </div>

            {/* Fundamentals */}
            {(detail.pe != null || detail.eps != null || detail.revenueGrowth != null) && (
              <div>
                <div className="text-xs text-gray-500 font-mono mb-2">FUNDAMENTALS</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {detail.pe != null && <Metric label="P/E" value={detail.pe.toFixed(1)} />}
                  {detail.peg != null && <Metric label="PEG" value={detail.peg.toFixed(2)} />}
                  {detail.eps != null && <Metric label="EPS (TTM)" value={`$${detail.eps.toFixed(2)}`} />}
                  {detail.revenueGrowth != null && (
                    <Metric
                      label="REV GROWTH"
                      value={formatPercent(detail.revenueGrowth)}
                      color={detail.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}
                    />
                  )}
                  {detail.epsGrowth != null && (
                    <Metric
                      label="EPS GROWTH"
                      value={formatPercent(detail.epsGrowth)}
                      color={detail.epsGrowth > 0 ? 'text-green-400' : 'text-red-400'}
                    />
                  )}
                  {detail.shortInterest != null && (
                    <Metric label="SHORT INT" value={formatPercent(detail.shortInterest, false)} />
                  )}
                  {detail.beta != null && <Metric label="BETA" value={detail.beta.toFixed(2)} />}
                </div>
              </div>
            )}

            {/* Returns */}
            <div>
              <div className="text-xs text-gray-500 font-mono mb-2">PRICE MOMENTUM</div>
              <div className="grid grid-cols-3 gap-2">
                <ReturnMetric label="1 MONTH" value={detail.return1M} />
                <ReturnMetric label="3 MONTH" value={detail.return3M} />
                <ReturnMetric label="6 MONTH" value={detail.return6M} />
              </div>
            </div>

            {/* Score Breakdown */}
            <div>
              <div className="text-xs text-gray-500 font-mono mb-2">SCORE BREAKDOWN</div>
              <div className="space-y-2">
                <ScoreBar label="Breakout" value={detail.scoreBreakdown.breakoutScore} max={25} />
                <ScoreBar label="Momentum" value={detail.scoreBreakdown.momentumScore} max={25} />
                <ScoreBar label="Volume" value={detail.scoreBreakdown.volumeScore} max={25} />
                <ScoreBar label="Size Bonus" value={detail.scoreBreakdown.sizeScore} max={15} />
                <ScoreBar label="Rel Strength" value={detail.scoreBreakdown.relativeStrengthScore} max={10} />
                <ScoreBar label="MA Align" value={detail.scoreBreakdown.smaScore} max={15} color="#a78bfa" />
              </div>
            </div>

            {/* Description */}
            {detail.description && (
              <div>
                <div className="text-xs text-gray-500 font-mono mb-1">ABOUT</div>
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                  {detail.description}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color = 'text-gray-300', sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-2">
      <div className="text-xs text-gray-500 font-mono">{label}</div>
      <div className={`text-sm font-mono font-medium mt-0.5 ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600 font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

function ReturnMetric({ label, value }: { label: string; value: number }) {
  const pos = value >= 0;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-2 text-center">
      <div className="text-xs text-gray-500 font-mono">{label}</div>
      <div className={`text-base font-bold font-mono mt-0.5 ${pos ? 'text-green-400' : 'text-red-400'}`}>
        {formatPercent(value)}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color = '#f59e0b' }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 text-xs font-mono text-gray-400 text-right">{label}</div>
      <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-12 text-xs font-mono text-gray-300 text-right">{value}/{max}</div>
    </div>
  );
}
