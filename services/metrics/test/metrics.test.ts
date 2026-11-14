import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBot, normalizePath, parseRange, referrerHost, visitorHash } from '../lib/core.ts';

test('normalizePath', () => {
  assert.equal(normalizePath('/blog/post/?utm=1#x'), '/blog/post');
  assert.equal(normalizePath(''), '/');
  assert.equal(normalizePath('/'), '/');
});

test('parseRange cae a 7d', () => {
  assert.equal(parseRange('30d'), '30d');
  assert.equal(parseRange('999d'), '7d');
  assert.equal(parseRange(null), '7d');
});

test('referrerHost ignora el propio dominio', () => {
  assert.equal(referrerHost('https://www.google.com/x', 'tudominio.com'), 'google.com');
  assert.equal(referrerHost('https://tudominio.com/blog', 'tudominio.com'), null);
  assert.equal(referrerHost('basura', 'tudominio.com'), null);
});

test('isBot', () => {
  assert.equal(isBot('Googlebot/2.1'), true);
  assert.equal(isBot(null), true);
  assert.equal(isBot('Mozilla/5.0 (Macintosh) Safari/605'), false);
});

test('visitorHash rota por día y es estable dentro del día', () => {
  const d1 = new Date('2026-11-14T10:00:00Z');
  const d1b = new Date('2026-11-14T23:00:00Z');
  const d2 = new Date('2026-11-15T10:00:00Z');
  assert.equal(visitorHash('s', '1.1.1.1', 'ua', d1), visitorHash('s', '1.1.1.1', 'ua', d1b));
  assert.notEqual(visitorHash('s', '1.1.1.1', 'ua', d1), visitorHash('s', '1.1.1.1', 'ua', d2));
});

// Integración contra Postgres real: solo si TEST_DATABASE_URL está definido.
const dbUrl = process.env.TEST_DATABASE_URL;
test('collect + stats extremo a extremo', { skip: !dbUrl }, async () => {
  process.env.DATABASE_URL = dbUrl;
  process.env.ALLOWED_HOSTS = 'tudominio.com';
  process.env.METRICS_ADMIN_TOKEN = 'secret';
  process.env.VISITOR_SALT = 'salt';
  const { POST } = await import('../api/collect.ts');
  const { GET } = await import('../api/stats.ts');

  const hit = (url: string, ua: string, ip: string, referrer = '') =>
    POST(
      new Request('https://metrics.x/api/collect', {
        method: 'POST',
        headers: { 'user-agent': ua, 'x-forwarded-for': ip },
        body: JSON.stringify({ url, referrer }),
      }),
    );
  const ua = 'Mozilla/5.0 Safari';

  assert.equal((await hit('https://tudominio.com/', ua, '1.1.1.1', 'https://google.com/')).status, 202);
  assert.equal((await hit('https://tudominio.com/blog/hola?x=1', ua, '1.1.1.1')).status, 202);
  assert.equal((await hit('https://tudominio.com/blog/hola', ua, '2.2.2.2')).status, 202);
  assert.equal((await hit('https://otro.com/', ua, '3.3.3.3')).status, 403);
  await hit('https://tudominio.com/', 'Googlebot', '4.4.4.4'); // bot: se ignora

  const auth = (t: string) => ({ headers: { authorization: `Bearer ${t}` } });
  assert.equal((await GET(new Request('https://m/api/stats', auth('mal')))).status, 401);

  const all = await (await GET(new Request('https://m/api/stats?range=7d', auth('secret')))).json();
  assert.equal(all.views, 3);
  assert.equal(all.visitors, 2);
  assert.equal(all.topPages[0].path, '/blog/hola');
  assert.deepEqual(all.topReferrers, [{ referrer: 'google.com', views: 1 }]);

  const blog = await (await GET(new Request('https://m/api/stats?path=/blog', auth('secret')))).json();
  assert.equal(blog.views, 2);
});
