# AdOps Cockpit MVP

Упрощённый MVP для одного баера: личная база большого количества Meta/Facebook рекламных кабинетов, пулы кабинетов, readiness/health checks, mock-синхронизация Meta и аудит действий.

В MVP намеренно нет agency/team/offer/Keitaro/launch/ad-level сущностей. Фокус сейчас: быстро добавлять, группировать и проверять много кабинетов одного пользователя.

## Stack

- Next.js 14 App Router
- React + TypeScript
- Tailwind CSS
- Prisma ORM
- Supabase Postgres
- Supabase Auth
- Supabase SSR cookie sessions

## Setup

```bash
npm install
npx prisma db push
npx prisma db execute --schema prisma/schema.prisma --file supabase/migrations/202605200002_buyer_workspace_rls.sql
npm run seed
npm run dev
```

Открыть: `http://localhost:3000`

## Demo Login

- `owner@example.com`
- `password123`

## Current MVP Modules

- Auth: регистрация/логин/логаут через Supabase Auth.
- Мои кабинеты: ручное добавление, mock-загрузка 30+ Meta кабинетов, фильтры, выбор строк, архив.
- Пулы: группы кабинетов под тесты, scale, проблемные состояния.
- Health checks: readiness score 0-100 по токену, статусу кабинета, биллингу, лимиту и свежести синка.
- Интеграции: Meta mock/placeholder, test и mock sync.
- Аудит: запись create/update/import/sync/health-check/pool actions.

## Database Shape

Основные таблицы public schema:

- `User`
- `MetaConnection`
- `MetaAdAccount`
- `AccountPool`
- `AccountPoolItem`
- `AccountHealthCheck`
- `AuditLog`

Все бизнес-данные scoped by `userId`. Agency, team, роли и buyer assignment удалены из MVP.

## Mock vs Real API

Сейчас Meta работает в mock/placeholder режиме. Реальное подключение будет следующим этапом:

1. Meta OAuth/System User token flow.
2. Сохранение токена через `ENCRYPTION_KEY`.
3. Реализация adapter-методов для `listAdAccounts`, account status и insights.
4. Rate limits, retry/backoff и фоновая синхронизация.
