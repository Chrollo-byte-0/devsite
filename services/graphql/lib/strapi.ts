// Cliente mínimo de la REST API de Strapi 5.

export type StrapiConfig = { url: string; token?: string };

export function configFromEnv(env: Record<string, string | undefined> = process.env): StrapiConfig {
  const url = env.STRAPI_URL?.replace(/\/+$/, '');
  if (!url) throw new Error('Falta STRAPI_URL');
  return { url, token: env.STRAPI_API_TOKEN };
}

export async function strapiGet<T>(
  cfg: StrapiConfig,
  path: string,
  query: Record<string, string> = {},
): Promise<T> {
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`${cfg.url}/api${path}${qs ? `?${qs}` : ''}`, {
    headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {},
  });
  if (res.status === 404) return null as T;
  if (!res.ok) throw new Error(`Strapi respondió ${res.status} en ${path}`);
  return (await res.json()) as T;
}

type StrapiList<T> = { data: T[]; meta?: { pagination?: { total: number } } };
type StrapiOne<T> = { data: T | null };

export type StrapiArticle = {
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body: string;
  tags?: string[] | null;
  readingMinutes?: number | null;
  coverUrl?: string | null;
  publishedAt: string | null;
};

export type StrapiLanding = {
  heroTitle: string;
  heroSubtitle?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  features?: { id: number; title: string; description?: string | null; icon?: string | null }[];
  aboutTitle?: string | null;
  aboutBody?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export async function fetchLanding(cfg: StrapiConfig) {
  const r = await strapiGet<StrapiOne<StrapiLanding>>(cfg, '/landing', { populate: 'features' });
  return r?.data ?? null;
}

export async function fetchArticles(cfg: StrapiConfig, limit = 10, offset = 0, tag?: string) {
  const query: Record<string, string> = {
    sort: 'publishedAt:desc',
    'pagination[start]': String(offset),
    'pagination[limit]': String(limit),
  };
  // tags es un campo JSON; filtramos por coincidencia textual.
  if (tag) query['filters[tags][$containsi]'] = tag;
  const r = await strapiGet<StrapiList<StrapiArticle>>(cfg, '/articles', query);
  return { items: r?.data ?? [], total: r?.meta?.pagination?.total ?? 0 };
}

export async function fetchArticleBySlug(cfg: StrapiConfig, slug: string) {
  const r = await strapiGet<StrapiList<StrapiArticle>>(cfg, '/articles', {
    'filters[slug][$eq]': slug,
    'pagination[limit]': '1',
  });
  return r?.data?.[0] ?? null;
}
