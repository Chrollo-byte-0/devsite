import pg from 'pg';
import { RANGES, type Range } from './core.ts';

let pool: pg.Pool | undefined;
let ready: Promise<void> | undefined;

function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Falta DATABASE_URL');
    // Poolers (Neon/Supabase) requieren TLS; localhost no.
    const local = /@(localhost|127\.0\.0\.1)/.test(url);
    pool = new pg.Pool({
      connectionString: url,
      max: 3,
      ssl: local ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export function ensureSchema(): Promise<void> {
  ready ??= getPool()
    .query(
      `CREATE TABLE IF NOT EXISTS pageviews (
         id bigserial PRIMARY KEY,
         ts timestamptz NOT NULL DEFAULT now(),
         host text NOT NULL,
         path text NOT NULL,
         referrer text,
         visitor text NOT NULL
       );
       CREATE INDEX IF NOT EXISTS pageviews_ts_idx ON pageviews (ts DESC);
       CREATE INDEX IF NOT EXISTS pageviews_path_idx ON pageviews (path);`,
    )
    .then(() => undefined);
  return ready;
}

export async function insertPageview(v: {
  host: string;
  path: string;
  referrer: string | null;
  visitor: string;
}) {
  await ensureSchema();
  await getPool().query(
    'INSERT INTO pageviews (host, path, referrer, visitor) VALUES ($1,$2,$3,$4)',
    [v.host, v.path, v.referrer, v.visitor],
  );
}

export async function getStats(range: Range, pathPrefix?: string) {
  await ensureSchema();
  const p = getPool();
  const days = RANGES[range];
  // Filtro común: ventana de tiempo + prefijo de ruta opcional (ej. /blog).
  const where = `ts >= now() - ($1 || ' days')::interval AND ($2::text IS NULL OR path = $2 OR path LIKE $2 || '/%')`;
  const args = [String(days), pathPrefix ?? null];

  const [totals, pages, refs, daily] = await Promise.all([
    p.query(
      `SELECT count(*)::int AS views, count(DISTINCT visitor)::int AS visitors FROM pageviews WHERE ${where}`,
      args,
    ),
    p.query(
      `SELECT path, count(*)::int AS views FROM pageviews WHERE ${where}
       GROUP BY path ORDER BY views DESC, path LIMIT 10`,
      args,
    ),
    p.query(
      `SELECT referrer, count(*)::int AS views FROM pageviews WHERE ${where} AND referrer IS NOT NULL
       GROUP BY referrer ORDER BY views DESC, referrer LIMIT 10`,
      args,
    ),
    p.query(
      `SELECT to_char(date_trunc('day', ts AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
              count(*)::int AS views, count(DISTINCT visitor)::int AS visitors
       FROM pageviews WHERE ${where} GROUP BY 1 ORDER BY 1`,
      args,
    ),
  ]);

  return {
    range,
    views: totals.rows[0].views as number,
    visitors: totals.rows[0].visitors as number,
    topPages: pages.rows as { path: string; views: number }[],
    topReferrers: refs.rows as { referrer: string; views: number }[],
    daily: daily.rows as { day: string; views: number; visitors: number }[],
  };
}
