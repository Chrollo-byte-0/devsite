import { NextResponse, type NextRequest } from 'next/server';

// Protege /admin con Basic Auth (ADMIN_USER / ADMIN_PASSWORD).
export function proxy(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    return new NextResponse('Admin sin configurar', { status: 503 });
  }
  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(':');
      if (u === user && rest.join(':') === pass) return NextResponse.next();
    } catch {}
  }
  return new NextResponse('Autenticación requerida', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ['/admin/:path*'] };
