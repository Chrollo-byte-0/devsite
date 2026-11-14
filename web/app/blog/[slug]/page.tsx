import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';
import { getArticle } from '@/lib/content';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  return { title: a?.title, description: a?.excerpt ?? undefined };
}

export default async function Post({ params }: Props) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();

  return (
    <article className="prose">
      <h1 style={{ marginTop: 48 }}>{a.title}</h1>
      <div className="meta">
        {a.publishedAt && new Date(a.publishedAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}
        {a.readingMinutes ? ` · ${a.readingMinutes} min` : ''}
      </div>
      <Markdown>{a.body}</Markdown>
    </article>
  );
}
