# VeloCad backend

The API is an Express service backed by MySQL through Prisma. Prisma migrations own the
database schema; the API stores inquiry and catalogue records in MySQL. Image bytes are
uploaded to Cloudinary, while their HTTPS URLs are stored with product/gallery records.

## Local setup

Use Node.js 20 or newer and a MySQL database. Copy `.env.example` to `.env`, fill in
the database credentials and generate unique `JWT_SECRET` and `ADMIN_PASSWORD` values.
URL-encode special characters in MySQL URL passwords.

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:migrate` is for development and may create migrations. Apply committed
migrations to production with `npm run db:deploy`; do not run migrations automatically
when the API starts. Seed a fresh database once with `npm run db:seed`. It creates an
admin account only if `ADMIN_EMAIL` does not already exist, and will not replace an
existing admin password.

## Existing SQLite data

The initial MySQL migration creates an empty schema. To retain an existing SQLite
database, stop the old backend, take a consistent backup/copy of its `.db` file, create
the MySQL schema, and then set `LEGACY_SQLITE_PATH` to that copy and run:

```sh
npm run db:import-sqlite
```

The importer aborts if any target table already contains records. It transfers account
password hashes and existing image URLs as well as catalogue and inquiry data. Keep the
SQLite backup unchanged until the new API and admin site have been verified. If starting
with a new database instead, run `npm run db:seed` and do not import SQLite.

## VPS deployment checklist

1. Create a dedicated MySQL database with `utf8mb4`. Keep MySQL bound to localhost or a
   private network; do not expose port 3306 to the public internet.
2. Use separate MySQL accounts: `velocad_app` needs only `SELECT`, `INSERT`, `UPDATE`,
   and `DELETE` on this database; `velocad_migrate` needs schema privileges and is used
   only by Prisma migration commands. `DATABASE_URL` is used by the running API and
   `DIRECT_DATABASE_URL` by Prisma CLI migration commands.
3. Set production secrets in the VPS service manager or a permission-restricted `.env`
   file. Never commit `.env`, database URLs, JWT secrets, or Cloudinary credentials.
   Use a different JWT secret and admin password per environment.
4. Set `NODE_ENV=production`, `FRONTEND_ORIGINS` to the exact HTTPS origins of the
   public site and admin panel, and all Cloudinary variables. Do not use `*` for CORS.
5. Install dependencies on the deployment host/runner with `npm ci`, then apply
   migrations with an environment that has both database URLs: `npm run db:deploy`.
   Run the initial seed only for a new database. For a runtime-only install, generate
   Prisma Client before pruning dev dependencies, then use `npm prune --omit=dev`.
   Start the API under a process manager such as systemd or PM2 behind Nginx/Caddy with
   TLS.
6. Point the frontend's `NEXT_PUBLIC_API_URL` and admin's `VITE_API_BASE_URL` at the
   HTTPS API base URL (for example `https://api.example.com/api`) when building them.
   These values are build-time settings for the frontend bundles.
7. Set `TRUST_PROXY=1` only when one trusted reverse proxy sits directly in front of
   Express. Keep the proxy responsible for HTTPS termination and forwarding client IPs.
   The admin API uses an HttpOnly cookie. Keep admin and API on the same site with
   `AUTH_COOKIE_SAME_SITE=lax` where possible. If they must be cross-site, use HTTPS and
   set `AUTH_COOKIE_SAME_SITE=none`; state-changing cookie-authenticated requests also
   require an allowed `Origin`.
8. Back up MySQL regularly, test restore procedures, restrict file access, and monitor
   `/api/health/ready`. The API does not automatically migrate or seed production data.

The API applies security headers, exact-origin CORS, request-size limits, rate limits,
administrator authorization, input validation, and restricted image uploads. Keep the
VPS operating system, Node.js, MySQL, and npm dependencies patched.

The built-in rate limiter stores counters in process memory. If running multiple API
workers/instances or requiring rate limits to survive restarts, configure a shared
rate-limit store such as Redis before scaling out.
