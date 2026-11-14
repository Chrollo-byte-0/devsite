import type { Metadata } from 'next';
import { checkServices, getStats } from '@/lib/metrics';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const RANGES = ['1d', '7d', '30d', '90d'];

export default async function Admin({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: r } = await searchParams;
  const range = RANGES.includes(r ?? '') ? r! : '7d';

  const [services, all, blog] = await Promise.all([
    checkServices(),
    getStats(range),
    getStats(range, '/blog'),
  ]);

  const cms = process.env.NEXT_PUBLIC_CMS_URL?.replace(/\/+$/, '');
  const gql = process.env.GRAPHQL_URL;
  const maxDay = Math.max(1, ...(all?.daily.map((d) => d.views) ?? [1]));

  return (
    <>
      <section className="hero">
        <h1>Admin</h1>
        <p>Un solo punto de control para el CMS, el servicio GraphQL y las métricas.</p>
      </section>

      <h2>Servicios</h2>
      <table>
        <tbody>
          {services.map((s) => (
            <tr key={s.name}>
              <td>{s.name}</td>
              <td className={s.ok ? 'ok' : 'bad'}>{s.ok ? 'activo' : 'caído'}</td>
              <td className="meta">{s.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {cms && (
          <a className="btn" href={`${cms}/admin`}>
            Abrir Strapi (landing + blog)
          </a>
        )}{' '}
        {gql && <a href={gql}>Explorador GraphQL</a>}
      </p>

      <h2>Visitas</h2>
      <p>
        {RANGES.map((x) => (
          <span key={x}>
            {x === range ? <strong>{x}</strong> : <a href={`/admin?range=${x}`}>{x}</a>}
            {'  '}
          </span>
        ))}
      </p>

      {!all ? (
        <p className="bad">No se pudieron leer las métricas (revisa METRICS_URL y METRICS_ADMIN_TOKEN).</p>
      ) : (
        <>
          <div className="grid">
            <div className="card"><div className="meta">Vistas totales</div><h3>{all.views}</h3></div>
            <div className="card"><div className="meta">Visitantes únicos</div><h3>{all.visitors}</h3></div>
            <div className="card"><div className="meta">Vistas del blog</div><h3>{blog?.views ?? '—'}</h3></div>
            <div className="card">
              <div className="meta">Landing (/)</div>
              <h3>{all.topPages.find((p) => p.path === '/')?.views ?? 0}</h3>
            </div>
          </div>

          <h3>Por día</h3>
          <table>
            <tbody>
              {all.daily.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td style={{ width: '60%' }}>
                    <div className="bar" style={{ width: `${(d.views / maxDay) * 100}%` }} />
                  </td>
                  <td className="n">{d.views}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Páginas más vistas</h3>
          <table>
            <tbody>
              {all.topPages.map((p) => (
                <tr key={p.path}><td>{p.path}</td><td className="n">{p.views}</td></tr>
              ))}
            </tbody>
          </table>

          <h3>Referencias</h3>
          <table>
            <tbody>
              {all.topReferrers.length === 0 && <tr><td className="meta">Sin referencias todavía</td></tr>}
              {all.topReferrers.map((p) => (
                <tr key={p.referrer}><td>{p.referrer}</td><td className="n">{p.views}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
