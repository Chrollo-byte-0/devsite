import { createHash, timingSafeEqual } from 'node:crypto';

export const RANGES = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 } as const;
export type Range = keyof typeof RANGES;

export function parseRange(v: string | null | undefined): Range {
  return v && v in RANGES ? (v as Range) : '7d';
}

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python-requests/i;
export const isBot = (ua: string | null | undefined) => !ua || BOT_RE.test(ua);

/** Quita query/hash y slash final; limita longitud. */
export function normalizePath(p: string): string {
  let path = p.split('#')[0].split('?')[0] || '/';
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path.slice(0, 200);
}

export function referrerHost(ref: string | null | undefined, ownHost: string): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    return h && h !== ownHost.replace(/^www\./, '') ? h.slice(0, 100) : null;
  } catch {
    return null;
  }
}

/**
 * Hash anónimo que rota cada día: sin cookies y sin poder seguir a una
 * persona entre días.
 */
export function visitorHash(salt: string, ip: string, ua: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function bearer(header: string | null): string {
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function allowedHosts(env = process.env): string[] {
  return (env.ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}
