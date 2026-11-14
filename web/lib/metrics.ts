export type Stats = {
  range: string;
  views: number;
  visitors: number;
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  daily: { day: string; views: number; visitors: number }[];
};

export async function getStats(range = '7d', path?: string): Promise<Stats | null> {
  const base = process.env.METRICS_URL?.replace(/\/+$/, '');
  const token = process.env.METRICS_ADMIN_TOKEN;
  if (!base || !token) return null;
  const qs = new URLSearchParams({ range });
  if (path) qs.set('path', path);
  try {
    const res = await fetch(`${base}/api/stats?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as Stats) : null;
  } catch {
    return null;
  }
}

export type ServiceStatus = { name: string; url: string | null; ok: boolean; detail: string };

async function ping(name: string, url: string | undefined, init?: RequestInit): Promise<ServiceStatus> {
  if (!url) return { name, url: null, ok: false, detail: 'sin configurar' };
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    return { name, url, ok: res.ok, detail: `${res.status} · ${Date.now() - t0} ms` };
  } catch (e) {
    return { name, url, ok: false, detail: e instanceof Error ? e.message : 'error' };
  }
}

export function checkServices() {
  const cms = process.env.NEXT_PUBLIC_CMS_URL?.replace(/\/+$/, '');
  const gql = process.env.GRAPHQL_URL;
  const metrics = process.env.METRICS_URL?.replace(/\/+$/, '');
  return Promise.all([
    ping('CMS (Strapi)', cms && `${cms}/_health`),
    ping('GraphQL', gql, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ health }' }),
    }),
    // Sin token el endpoint responde 401: lo contamos como "vivo" en ping simple.
    metrics ? ping('Metrics', `${metrics}/`) : ping('Metrics', undefined),
  ]);
}
