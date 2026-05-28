# Web Resource

## Роль

Web resource - публичная и аккаунтная часть системы. Он отвечает за:

- регистрацию;
- логин;
- desktop authorization callback;
- аккаунт пользователя;
- подписку;
- оплату;
- Stripe webhooks.

## Технологии

- Next.js App Router.
- Supabase Auth.
- Prisma.
- Supabase Postgres.
- Stripe.

## Ключевые страницы

- `/login`
- `/register`
- `/pricing`
- `/me`
- `/desktop-callback`

## Ключевые API

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/desktop-token`
- `POST /api/auth/issue-token`
- `GET /api/session/verify`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/stripe/webhook`

## Web как источник подписки

План хранится в `User.plan`, срок действия - в `User.planExpiresAt`, Stripe customer - в `User.stripeCustomerId`.

Desktop не должен принимать решение по локальному ключу. Он должен получать состояние аккаунта из web-issued JWT/session.

