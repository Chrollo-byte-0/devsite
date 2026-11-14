import { revalidateTag } from 'next/cache';

// Webhook de Strapi (Settings > Webhooks): POST /api/revalidate con header
// "x-revalidate-secret" para refrescar landing y blog al publicar.
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return new Response('No autorizado', { status: 401 });
  }
  revalidateTag('content', 'max');
  return Response.json({ revalidated: true });
}
