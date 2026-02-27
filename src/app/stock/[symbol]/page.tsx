import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { StockDetail } from '@/lib/types';
import { formatPrice, formatPercent, formatMarketCap, formatVolume, formatVolumeRatio } from '@/lib/utils';
import { isStrongCandidate } from '@/lib/scorer';
import PriceChart from '@/components/PriceChart';
import MultiBaggerScore from '@/components/MultiBaggerScore';

interface Props {
  params: Promise<{ symbol: string }>;
}

async function getStock(symbol: string): Promise<StockDetail | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/stock/${symbol}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function StockPage({ params }: Props) {
  const { symbol } = await params;
  const detail = await getStock(symbol.toUpperCase());

  if (!detail) notFound();

  const pos = detail.changePercent >= 0;
  const strong = isStrongCandidate(detail.multiBaggerScore);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Scanner
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-mono text-white">{detail.symbol}</h1>
              {strong && (
                <span className="text-sm bg-green-900/50 border border-green-700 text-green-400 px-2 py-0.5 rounded font-mono">
                  ★ STRONG CANDIDATE
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-1">{detail.name}</p>
            <p className="text-xs font-mono text-gray-600 mt-0.5">{detail.sector} · {detail.industry}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-white">{formatPrice(detail.price)}</div>
            <div className={`text-sm font-mono mt-0.5 ${pos ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(detail.changePercent)} today
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 font-mono mb-3">MULTI-BAGGER SCORE</div>
          <div className="flex items-center gap-4">
            <MultiBaggerScore score={detail.multiBaggerScore} breakdown={detail.scoreBreakdown} />
            <div className="flex-1 space-y-1.5">
              <ScoreBar label="Breakout" value={detail.scoreBreakdown.breakoutScore} max={25} />
              <ScoreBar label="Momentum" value={detail.scoreBreakdown.momentumScore} max={25} />
              <ScoreBar label="Volume" value={detail.scoreBreakdown.volumeScore} max={25} />
              <ScoreBar label="Size Bonus" value={detail.scoreBreakdown.sizeScore} max={15} />
              <ScoreBar label="Rel Strength" value={detail.scoreBreakdown.relativeStrengthScore} max={10} />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 font-mono mb-3">1-YEAR PRICE CHART</div>
          <PriceChart symbol={detail.symbol} />
        </div>

        {/* Metrics Grid */}
        <div>
          <div className="text-xs text-gray-500 font-mono mb-2">KEY METRICS</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric label="PRICE" value={formatPrice(detail.price)} />
            <Metric label="52W HIGH" value={formatPrice(detail.fiftyTwoWeekHigh)} />
            <Metric label="52W LOW" value={formatPrice(detail.fiftyTwoWeekLow)} />
            <Metric
              label="FROM HIGH"
              value={`-${detail.proximityToHigh.toFixed(1)}%`}
              color={detail.proximityToHigh <= 2 ? 'text-green-400' : 'text-amber-400'}
            />
            <Metric label="MARKET CAP" value={formatMarketCap(detail.marketCap)} />
            <Metric label="CAP TIER" value={detail.marketCapCategory.toUpperCase()} />
            <Metric label="VOLUME" value={formatVolume(detail.volume)} />
            <Metric
              label="VOL RATIO"
              value={formatVolumeRatio(detail.volumeRatio)}
              color={detail.volumeRatio >= 2 ? 'text-green-400' : 'text-gray-300'}
            />
          </div>
        </div>

        {/* Returns */}
        <div>
          <div className="text-xs text-gray-500 font-mono mb-2">PRICE MOMENTUM</div>
          <div className="grid grid-cols-3 gap-2">
            <ReturnMetric label="1 MONTH" value={detail.return1M} />
            <ReturnMetric label="3 MONTH" value={detail.return3M} />
            <ReturnMetric label="6 MONTH" value={detail.return6M} />
          </div>
        </div>

        {/* Fundamentals */}
        {(detail.pe != null || detail.eps != null) && (
          <div>
            <div className="text-xs text-gray-500 font-mono mb-2">FUNDAMENTALS</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {detail.pe != null && <Metric label="P/E RATIO" value={detail.pe.toFixed(1)} />}
              {detail.peg != null && <Metric label="PEG RATIO" value={detail.peg.toFixed(2)} />}
              {detail.eps != null && <Metric label="EPS (TTM)" value={`$${detail.eps.toFixed(2)}`} />}
              {detail.beta != null && <Metric label="BETA" value={detail.beta.toFixed(2)} />}
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
                <Metric label="SHORT INT" value={`${detail.shortInterest.toFixed(1)}%`} />
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {detail.description && (
          <div>
            <div className="text-xs text-gray-500 font-mono mb-2">ABOUT</div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 leading-relaxed">{detail.description}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, color = 'text-gray-300' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-3">
      <div className="text-xs text-gray-500 font-mono">{label}</div>
      <div className={`text-sm font-mono font-medium mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function ReturnMetric({ label, value }: { label: string; value: number }) {
  const pos = value >= 0;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-3 text-center">
      <div className="text-xs text-gray-500 font-mono">{label}</div>
      <div className={`text-lg font-bold font-mono mt-1 ${pos ? 'text-green-400' : 'text-red-400'}`}>
        {formatPercent(value)}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 text-xs font-mono text-gray-400 text-right">{label}</div>
      <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
        <div className="h-full bg-amber-500 rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-xs font-mono text-gray-300 text-right">{value}/{max}</div>
    </div>
  );
}
