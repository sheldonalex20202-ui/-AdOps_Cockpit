# Database and Data Model

## Web database

Web использует Supabase Postgres через Prisma.

Ключевая модель для аккаунта:

- `User`
- `authUserId`
- `email`
- `name`
- `plan`
- `planExpiresAt`
- `stripeCustomerId`

## Desktop database

Desktop использует локальную SQLite БД через GORM.

Ключевые таблицы:

- `MetaAdAccount`
- `AccountPool`
- `AccountPoolItem`
- `AccountHealthCheck`
- `AuditLog`
- `CampaignTemplate`
- `Creative`
- `HeadlineSet`
- `LaunchJob`
- `LaunchJobItem`

## Data ownership

Все рабочие данные scoped by `userId`.

Важно: теперь `userId` должен соответствовать web `User.id`, полученному из JWT, а не локально созданному desktop user.

## Supabase RLS note

В Supabase RLS уже есть политики для раннего MVP-набора таблиц. Новые таблицы вроде `CampaignTemplate`, `Creative`, `LaunchJob`, `HeadlineSet` требуют отдельной проверки RLS, если они доступны через Supabase Data API.

## Миграционный риск

В desktop еще есть legacy `User` и `PassHash` в модели. Это больше не является основным auth-механизмом. Удаление нужно делать аккуратно:

1. проверить существующие локальные БД;
2. понять, надо ли маппить старые локальные user id на web user id;
3. удалить legacy auth service и поля отдельным шагом.

