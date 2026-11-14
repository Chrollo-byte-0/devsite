// Dinámica: no congela un fallback si GraphQL no está disponible al construir.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles } from '@/lib/content';

export const metadata: Metadata = { title: 'Blog' };

export default async function Blog() {
  const posts = await getArticles();
  return (
    <>
      <section className="hero">
        <h1>Blog</h1>
      </section>
      {posts.length === 0 && <p className="meta">Aún no hay artículos publicados.</p>}
      {posts.map((p) => (
        <article className="post" key={p.id}>
          <h2>
            <Link href={`/blog/${p.slug}`}>{p.title}</Link>
          </h2>
          <div className="meta">
            {p.publishedAt && new Date(p.publishedAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}
            {p.readingMinutes ? ` · ${p.readingMinutes} min` : ''}
            {p.tags.length ? ` · ${p.tags.join(', ')}` : ''}
          </div>
          {p.excerpt && <p>{p.excerpt}</p>}
        </article>
      ))}
    </>
  );
}
