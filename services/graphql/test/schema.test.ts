import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createYoga } from 'graphql-yoga';
import { schema, buildContext } from '../lib/schema.ts';

// Strapi simulado con las mismas formas de respuesta que la REST API v5.
function mockStrapi() {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url!, 'http://x');
    res.setHeader('content-type', 'application/json');
    if (req.headers.authorization !== 'Bearer tok') {
      res.statusCode = 401;
      return res.end('{}');
    }
    if (u.pathname === '/api/landing') {
      return res.end(JSON.stringify({ data: { heroTitle: 'Hola', features: [{ id: 1, title: 'Rápido' }] } }));
    }
    if (u.pathname === '/api/articles') {
      const slug = u.searchParams.get('filters[slug][$eq]');
      const all = [
        { documentId: 'a1', title: 'Uno', slug: 'uno', body: '# uno', tags: ['js'], publishedAt: '2026-01-01' },
        { documentId: 'a2', title: 'Dos', slug: 'dos', body: '# dos', tags: null, publishedAt: '2026-01-02' },
      ];
      const data = slug ? all.filter((a) => a.slug === slug) : all;
      return res.end(JSON.stringify({ data, meta: { pagination: { total: data.length } } }));
    }
    res.statusCode = 404;
    res.end('{}');
  });
  return new Promise<http.Server>((r) => server.listen(0, () => r(server)));
}

async function run(query: string, variables?: Record<string, unknown>) {
  const server = await mockStrapi();
  const port = (server.address() as AddressInfo).port;
  const yoga = createYoga({
    schema,
    context: () => buildContext({ STRAPI_URL: `http://127.0.0.1:${port}/`, STRAPI_API_TOKEN: 'tok' }),
  });
  try {
    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return (await res.json()) as { data?: any; errors?: unknown[] };
  } finally {
    server.close();
  }
}

test('landing con features', async () => {
  const r = await run('{ landing { heroTitle features { title } } }');
  assert.equal(r.errors, undefined);
  assert.deepEqual(r.data.landing, { heroTitle: 'Hola', features: [{ title: 'Rápido' }] });
});

test('lista de artículos normaliza tags nulos', async () => {
  const r = await run('{ articles { total items { slug tags } } }');
  assert.equal(r.data.articles.total, 2);
  assert.deepEqual(r.data.articles.items[1].tags, []);
});

test('artículo por slug y slug inexistente', async () => {
  const ok = await run('query($s:String!){ article(slug:$s){ title } }', { s: 'uno' });
  assert.equal(ok.data.article.title, 'Uno');
  const none = await run('query($s:String!){ article(slug:$s){ title } }', { s: 'nope' });
  assert.equal(none.data.article, null);
});
