import { createSchema } from 'graphql-yoga';
import {
  configFromEnv,
  fetchArticleBySlug,
  fetchArticles,
  fetchLanding,
  type StrapiConfig,
} from './strapi.ts';

export const typeDefs = /* GraphQL */ `
  type Feature {
    id: ID!
    title: String!
    description: String
    icon: String
  }

  type Landing {
    heroTitle: String!
    heroSubtitle: String
    ctaLabel: String
    ctaUrl: String
    features: [Feature!]!
    aboutTitle: String
    aboutBody: String
    seoTitle: String
    seoDescription: String
  }

  type Article {
    id: ID!
    title: String!
    slug: String!
    excerpt: String
    body: String!
    tags: [String!]!
    readingMinutes: Int
    coverUrl: String
    publishedAt: String
  }

  type ArticlePage {
    items: [Article!]!
    total: Int!
  }

  type PageStat {
    path: String!
    views: Int!
  }

  type ReferrerStat {
    referrer: String!
    views: Int!
  }

  type DayStat {
    day: String!
    views: Int!
    visitors: Int!
  }

  type SiteStats {
    range: String!
    views: Int!
    visitors: Int!
    topPages: [PageStat!]!
    topReferrers: [ReferrerStat!]!
    daily: [DayStat!]!
  }

  type Query {
    health: String!
    landing: Landing
    articles(limit: Int = 10, offset: Int = 0, tag: String): ArticlePage!
    article(slug: String!): Article
    "Analítica de visitas (requiere METRICS_ADMIN_TOKEN en el servicio)."
    siteStats(range: String = "7d", path: String): SiteStats
  }
`;

type Ctx = { strapi: StrapiConfig };

export function buildContext(env: Record<string, string | undefined> = process.env): Ctx {
  return { strapi: configFromEnv(env) };
}

const clampInt = (n: number | null | undefined, min: number, max: number, dflt: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n as number) ? (n as number) : dflt));

export const resolvers = {
  Query: {
    health: () => 'ok',

    landing: async (_: unknown, __: unknown, ctx: Ctx) => {
      const l = await fetchLanding(ctx.strapi);
      return l ? { ...l, features: l.features ?? [] } : null;
    },

    articles: async (
      _: unknown,
      args: { limit?: number; offset?: number; tag?: string },
      ctx: Ctx,
    ) => {
      const { items, total } = await fetchArticles(
        ctx.strapi,
        clampInt(args.limit, 1, 50, 10),
        clampInt(args.offset, 0, 10_000, 0),
        args.tag,
      );
      return { items: items.map(mapArticle), total };
    },

    article: async (_: unknown, args: { slug: string }, ctx: Ctx) => {
      const a = await fetchArticleBySlug(ctx.strapi, args.slug);
      return a ? mapArticle(a) : null;
    },

    siteStats: async (_: unknown, args: { range?: string; path?: string }) => {
      const base = process.env.METRICS_URL?.replace(/\/+$/, '');
      const token = process.env.METRICS_ADMIN_TOKEN;
      if (!base || !token) throw new Error('METRICS_URL / METRICS_ADMIN_TOKEN no configurados');
      const qs = new URLSearchParams({ range: args.range ?? '7d' });
      if (args.path) qs.set('path', args.path);
      const res = await fetch(`${base}/api/stats?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Metrics respondió ${res.status}`);
      return res.json();
    },
  },
};

function mapArticle(a: Awaited<ReturnType<typeof fetchArticleBySlug>> & object) {
  return {
    id: a.documentId,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt ?? null,
    body: a.body,
    tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
    readingMinutes: a.readingMinutes ?? null,
    coverUrl: a.coverUrl ?? null,
    publishedAt: a.publishedAt,
  };
}

export const schema = createSchema<Ctx>({ typeDefs, resolvers });
