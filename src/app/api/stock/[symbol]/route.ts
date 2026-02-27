import { NextRequest, NextResponse } from 'next/server';
import { fetchStockDetail } from '@/lib/yahoo';
import { cache, TTL } from '@/lib/cache';
import type { StockDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `stock:${upperSymbol}`;

  let detail = cache.get<StockDetail>(cacheKey);
  if (!detail) {
    detail = await fetchStockDetail(upperSymbol);
    if (detail) {
      cache.set(cacheKey, detail, TTL.STOCK_DETAIL);
    }
  }

  if (!detail) {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
