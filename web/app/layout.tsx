import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Dev site', template: '%s · Dev site' },
  description: 'Landing y blog dev',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const metrics = process.env.NEXT_PUBLIC_METRICS_URL?.replace(/\/+$/, '');
  return (
    <html lang="es">
      <body>
        <header className="site">
          <div className="wrap">
            <strong>
              <Link href="/">Dev site</Link>
            </strong>
            <Link href="/blog">Blog</Link>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap">Sitio administrado desde Strapi.</footer>
        {metrics && <Script src={`${metrics}/track.js`} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
