export function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toFixed(0)}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 10) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(3)}`;
}

export function formatPercent(val: number, showSign = true): string {
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return `${vol}`;
}

export function formatMarketCap(cap: number): string {
  if (cap >= 1_000_000_000_000) return `$${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(1)}B`;
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(0)}M`;
  return `$${cap.toFixed(0)}`;
}

export function formatVolumeRatio(ratio: number): string {
  return `${ratio.toFixed(1)}x`;
}

export function classifyMarketCap(marketCap: number): 'micro' | 'small' | 'mid' | 'large' | 'mega' {
  if (marketCap < 300_000_000) return 'micro';
  if (marketCap < 2_000_000_000) return 'small';
  if (marketCap < 10_000_000_000) return 'mid';
  if (marketCap < 200_000_000_000) return 'large';
  return 'mega';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to ET
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const time = hours * 60 + minutes;
  return time >= 9 * 60 + 30 && time < 16 * 60;
}
