# DentaQueue

DentaQueue is a browser-based appointment and walk-in queue system for the General/Outpatient
Dental Clinic, Faculty of Dentistry, Universiti Malaya.

## Foundation workspace

- `apps/api`: TypeScript Express REST API.
- `apps/web`: Next.js App Router frontend with TailwindCSS.
- `apps/api/prisma`: Prisma schema and migrations for PostgreSQL.
- `cypress`: end-to-end smoke tests.

## Local setup

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `apps/api/.env` and set `DATABASE_URL` to the pooled Neon URL and
   `DATABASE_URL_UNPOOLED` to the direct Neon URL. The pooled URL is used by the running API; Prisma
   uses the unpooled URL for migrations.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate --workspace apps/api -- --name init`.
6. Start both applications with `npm run dev`.

The API is available at `http://localhost:4000`, the web app at `http://localhost:3000`, and the
health check at `http://localhost:4000/api/health`.

## Validation

- `npm run build` builds both applications.
- `npm test` runs the API typecheck and web production build.
- `npm run test:e2e` runs Cypress against a running API.

Deployment uses NeonDB for PostgreSQL, Vercel for `apps/web`, and Render for `apps/api`. Production
migrations must run through the API release process using the configured `DATABASE_URL`; secrets are
provided by the hosting platforms and are never committed.

## Neon setup

The linked Neon project uses the `production` branch and provisions PostgreSQL. After authenticating
with the Neon CLI, refresh the API environment and deploy the branch policy with:

```powershell
neon env pull --file apps/api/.env --service postgres
neon deploy
```

`DATABASE_URL` is the pooled runtime connection and `DATABASE_URL_UNPOOLED` is the direct migration
connection. The API loads both from `apps/api/.env`; this file is ignored and must never be committed.