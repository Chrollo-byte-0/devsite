import {
  allowedHosts,
  isBot,
  normalizePath,
  referrerHost,
  visitorHash,
} from '../lib/core.ts';
import { insertPageview } from '../lib/db.ts';

// Permitimos llamadas desde cualquier origen válido; el control real es ALLOWED_HOSTS.
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
});

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req.headers.get('origin')) });
}

export async function POST(req: Request) {
  const headers = cors(req.headers.get('origin'));
  const ua = req.headers.get('user-agent');
  if (isBot(ua)) return new Response(null, { status: 202, headers });

  let body: { url?: unknown; referrer?: unknown };
  try {
    // sendBeacon envía text/plain; parseamos el texto a mano.
    body = JSON.parse(await req.text());
  } catch {
    return new Response('JSON inválido', { status: 400, headers });
  }

  let url: URL;
  try {
    url = new URL(String(body.url));
  } catch {
    return new Response('url inválida', { status: 400, headers });
  }

  const host = url.hostname.toLowerCase();
  if (!allowedHosts().includes(host)) {
    return new Response('host no permitido', { status: 403, headers });
  }

  const salt = process.env.VISITOR_SALT;
  if (!salt) return new Response('Servicio sin configurar', { status: 500, headers });

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';

  await insertPageview({
    host,
    path: normalizePath(url.pathname),
    referrer: referrerHost(typeof body.referrer === 'string' ? body.referrer : null, host),
    visitor: visitorHash(salt, ip, ua!),
  });

  return new Response(null, { status: 202, headers });
}
