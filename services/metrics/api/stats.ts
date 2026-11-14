import { bearer, normalizePath, parseRange, safeEqual } from '../lib/core.ts';
import { getStats } from '../lib/db.ts';

export async function GET(req: Request) {
  const expected = process.env.METRICS_ADMIN_TOKEN;
  if (!expected) return new Response('Servicio sin configurar', { status: 500 });
  if (!safeEqual(bearer(req.headers.get('authorization')), expected)) {
    return new Response('No autorizado', { status: 401 });
  }

  const u = new URL(req.url);
  const path = u.searchParams.get('path');
  const stats = await getStats(parseRange(u.searchParams.get('range')), path ? normalizePath(path) : undefined);

  return Response.json(stats, { headers: { 'Cache-Control': 'private, no-store' } });
}
