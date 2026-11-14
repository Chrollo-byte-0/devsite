// Dinámica: no congela un fallback si GraphQL no está disponible al construir.
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Markdown from 'react-markdown';
import { getLanding } from '@/lib/content';

export async function generateMetadata(): Promise<Metadata> {
  const l = await getLanding();
  return {
    title: l?.seoTitle ?? undefined,
    description: l?.seoDescription ?? undefined,
  };
}

export default async function Home() {
  const l = await getLanding();

  if (!l) {
    return (
      <section className="hero">
        <h1>Contenido no disponible</h1>
        <p>Publica el contenido de la landing en Strapi (Content Manager → Landing) y revisa GRAPHQL_URL.</p>
      </section>
    );
  }

  return (
    <>
      <section className="hero">
        <h1>{l.heroTitle}</h1>
        {l.heroSubtitle && <p>{l.heroSubtitle}</p>}
        {l.ctaLabel && l.ctaUrl && (
          <a className="btn" href={l.ctaUrl}>
            {l.ctaLabel}
          </a>
        )}
      </section>

      {l.features.length > 0 && (
        <section className="grid">
          {l.features.map((f) => (
            <div className="card" key={f.id}>
              <h3>
                {f.icon} {f.title}
              </h3>
              {f.description && <p>{f.description}</p>}
            </div>
          ))}
        </section>
      )}

      {l.aboutBody && (
        <section className="prose">
          {l.aboutTitle && <h2>{l.aboutTitle}</h2>}
          <Markdown>{l.aboutBody}</Markdown>
        </section>
      )}
    </>
  );
}
