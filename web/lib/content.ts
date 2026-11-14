// Todo el contenido llega a través del servicio GraphQL (que a su vez lee Strapi).

export type Landing = {
  heroTitle: string;
  heroSubtitle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  features: { id: string; title: string; description: string | null; icon: string | null }[];
  aboutTitle: string | null;
  aboutBody: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  tags: string[];
  readingMinutes: number | null;
  publishedAt: string | null;
};

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const url = process.env.GRAPHQL_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      // Se revalida cada 5 min o al instante con el webhook de Strapi (tag "content").
      next: { revalidate: 300, tags: ['content'] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T; errors?: unknown[] };
    return json.errors?.length ? null : (json.data ?? null);
  } catch {
    return null;
  }
}

export async function getLanding() {
  const d = await gql<{ landing: Landing | null }>(`{
    landing { heroTitle heroSubtitle ctaLabel ctaUrl aboutTitle aboutBody seoTitle seoDescription
      features { id title description icon } }
  }`);
  return d?.landing ?? null;
}

export async function getArticles(limit = 20) {
  const d = await gql<{ articles: { items: Article[]; total: number } }>(
    `query($limit:Int){ articles(limit:$limit){ total items { id title slug excerpt tags readingMinutes publishedAt body } } }`,
    { limit },
  );
  return d?.articles.items ?? [];
}

export async function getArticle(slug: string) {
  const d = await gql<{ article: Article | null }>(
    `query($slug:String!){ article(slug:$slug){ id title slug excerpt body tags readingMinutes publishedAt } }`,
    { slug },
  );
  return d?.article ?? null;
}
