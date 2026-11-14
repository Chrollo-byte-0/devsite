# Dev site: landing + blog con CMS, GraphQL y métricas

```
                 ┌──────────────┐   REST    ┌────────────────────┐
  Strapi (CMS) ──┤ cms/         │◄──────────┤ services/graphql   │◄── web (GRAPHQL_URL)
  landing + blog │ host con     │           │ Vercel             │
                 │ proceso fijo │           └─────────┬──────────┘
                 └──────────────┘                     │ siteStats
                                              ┌───────▼──────────┐
  web/ (landing, blog, /admin) ── track.js ──►│ services/metrics │── Postgres
  Vercel                                      │ Vercel           │
                                              └──────────────────┘
```

| Carpeta | Qué es | Dónde se despliega |
|---|---|---|
| `cms/` | Strapi 5. Un solo CMS con `Landing` (single type) y `Article` (blog). | Host con proceso persistente (Dockerfile incluido) |
| `services/graphql/` | GraphQL Yoga. Lee Strapi y expone `landing`, `articles`, `article(slug)`, `siteStats`. | Vercel (Root Directory `services/graphql`) |
| `services/metrics/` | Analítica de visitas sin cookies: `POST /api/collect`, `GET /api/stats`, `/track.js`. | Vercel (Root Directory `services/metrics`) |
| `web/` | Next.js: `/` landing, `/blog`, `/blog/[slug]`, `/admin`. | Vercel (Root Directory `web`) |

> **Por qué Strapi no va en Vercel:** Strapi es un servidor que debe estar siempre encendido y necesita conexión de base de datos persistente. Las funciones serverless de Vercel no lo soportan de forma fiable. Usa Strapi Cloud, o el `Dockerfile` de `cms/` en Railway, Render, Fly.io o un VPS, con Postgres.

## Orden de despliegue

Importa el orden: cada pieza necesita la URL de la anterior.

### 1. Postgres
Crea una base (Neon desde Vercel Marketplace, Supabase, etc.). La usan Strapi (puede ser otra base) y metrics. Copia la URL *pooled*.

### 2. CMS (Strapi)
1. Despliega `cms/` con su Dockerfile. Variables: ver `cms/.env.example` (genera cada secreto con `openssl rand -base64 32`; `APP_KEYS` lleva 4 valores separados por coma).
2. Abre `https://<cms>/admin`, crea el primer usuario administrador.
3. **Content Manager → Landing**: llena y publica. **Article**: crea y publica entradas (el campo `body` es Markdown).
4. **Settings → API Tokens → Create**: tipo *Read-only*. Guarda el token para el paso 3.
5. En el arranque, Strapi abre solo lectura pública para `landing` y `article`; el token es una capa extra opcional.

### 3. Servicio metrics (Vercel)
Proyecto nuevo, Root Directory `services/metrics`. Variables (`.env.example`): `DATABASE_URL`, `ALLOWED_HOSTS` (tu dominio), `METRICS_ADMIN_TOKEN`, `VISITOR_SALT`. La tabla se crea sola en la primera visita.

### 4. Servicio GraphQL (Vercel)
Proyecto nuevo, Root Directory `services/graphql`. Variables: `STRAPI_URL`, `STRAPI_API_TOKEN`, `METRICS_URL`, `METRICS_ADMIN_TOKEN` (el mismo del paso 3), `CORS_ORIGINS` (dominio del sitio). Endpoint: `https://<graphql>/graphql`.

### 5. Sitio web + admin (Vercel)
Proyecto nuevo, Root Directory `web`. Variables (`web/.env.example`): `GRAPHQL_URL`, `NEXT_PUBLIC_METRICS_URL`, `METRICS_URL`, `METRICS_ADMIN_TOKEN`, `NEXT_PUBLIC_CMS_URL`, `ADMIN_USER`, `ADMIN_PASSWORD`, `REVALIDATE_SECRET`.

### 6. Webhook de publicación
En Strapi: **Settings → Webhooks → Create**. URL `https://<tu-sitio>/api/revalidate`, header `x-revalidate-secret: <REVALIDATE_SECRET>`, eventos *Entry publish/unpublish/update*. Así lo que publiques aparece al instante (si no, se refresca cada 5 min).

## El apartado /admin

`https://<tu-sitio>/admin` (Basic Auth con `ADMIN_USER`/`ADMIN_PASSWORD`) reúne:
- Estado de los tres servicios (CMS, GraphQL, Metrics) con latencia.
- Botón al panel de Strapi, donde se administran **landing y blog a la vez**.
- Enlace al explorador GraphQL.
- Analítica: vistas, visitantes únicos, vistas del blog, serie diaria, páginas más vistas y referencias (1d/7d/30d/90d).

## Privacidad de la analítica
Sin cookies. El visitante es un hash de `sal + día + IP + user-agent` que cambia cada día, no hay forma de seguirlo entre días. Se ignoran bots y se respeta Do Not Track.

## Pruebas
```bash
cd services/graphql && npm test                       # GraphQL contra un Strapi simulado
cd services/metrics && TEST_DATABASE_URL=postgres://... npm test   # unitarias + integración con Postgres
```
