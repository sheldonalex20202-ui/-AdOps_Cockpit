# Web Resource

## Роль

Web resource - публичная и аккаунтная часть системы. Он отвечает за:

- регистрацию;
- логин (email+password и OAuth: Google, Apple);
- desktop authorization callback;
- аккаунт пользователя;
- подписку;
- оплату;
- Stripe webhooks;
- раздачу desktop download proxy.

## Технологии

- Next.js App Router.
- Supabase Auth.
- Prisma.
- Supabase Postgres.
- Stripe.
- Vercel (hosting + env secrets).

## Ключевые страницы

- `/login`
- `/register`
- `/pricing`
- `/me`
- `/desktop-callback`

## Ключевые API

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/callback` — Supabase OAuth callback
- `POST /api/auth/desktop-token`
- `POST /api/auth/issue-token`
- `GET /api/session/verify`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/stripe/webhook`
- `GET /api/version` — version manifest для auto-update
- `GET /api/download/[platform]` — download proxy для private GitHub releases

## Version manifest

`GET /api/version` — публичный endpoint, не требует auth:

```json
{
  "version": "v1.0.15",
  "windowsUrl": "https://ad-ops-cockpit.vercel.app/api/download/windows",
  "macosArmUrl": "https://ad-ops-cockpit.vercel.app/api/download/macos-arm",
  "macosIntelUrl": "https://ad-ops-cockpit.vercel.app/api/download/macos-intel"
}
```

Версия берётся из env var `LATEST_APP_VERSION`. Обновляется при каждом релизе через GitHub Actions → Vercel deploy hook.

## Download proxy

`GET /api/download/[platform]` — публичный endpoint. Параметр `platform`: `windows`, `macos-arm`, `macos-intel`.

Механизм:
1. Использует `GITHUB_RELEASES_TOKEN` (fine-grained PAT, Contents: Read-only) для запроса к GitHub API.
2. GitHub API отвечает 302 на pre-signed CDN URL.
3. Vercel proxy захватывает этот URL и возвращает клиенту `302 redirect`.
4. Клиент (desktop updater) следует за redirect и качает файл с CDN.

Нужен потому что GitHub Release ассеты в private repo требуют auth токен даже для скачивания.

## Env variables (Vercel)

- `LATEST_APP_VERSION` — текущая версия desktop app (напр. `v1.0.15`).
- `GITHUB_RELEASES_TOKEN` — GitHub fine-grained PAT с правами `Contents: Read-only` на репозиторий с релизами.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Supabase configuration

В Supabase Dashboard → Authentication → URL Configuration нужно:

- Site URL: `https://ad-ops-cockpit.vercel.app`
- Redirect URLs: `https://ad-ops-cockpit.vercel.app/api/auth/callback*` (wildcard для query params)

## Web как источник подписки

План хранится в `User.plan`, срок действия - в `User.planExpiresAt`, Stripe customer - в `User.stripeCustomerId`.

Desktop не должен принимать решение по локальному ключу. Он должен получать состояние аккаунта из web-issued JWT/session.
