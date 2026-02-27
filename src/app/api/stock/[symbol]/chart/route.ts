import { NextRequest, NextResponse } from 'next/server';
import { fetchChart } from '@/lib/yahoo';
import { cache, TTL } from '@/lib/cache';
import type { ChartDataPoint } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `chart:${upperSymbol}`;

  let data = cache.get<ChartDataPoint[]>(cacheKey);
  if (!data) {
    data = await fetchChart(upperSymbol);
    if (data.length > 0) {
      cache.set(cacheKey, data, TTL.CHART);
    }
  }

  return NextResponse.json({ symbol: upperSymbol, data });
}
