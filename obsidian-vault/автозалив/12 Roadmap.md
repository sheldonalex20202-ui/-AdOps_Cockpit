# Roadmap

## Near-term

- Удалить или заморозить legacy desktop license key UI/API.
- Добавить entitlement checks по plan.
- Добавить страницу account/subscription details в desktop.
- Обновить README под текущую архитектуру.
- Проверить Supabase RLS для новых таблиц.

## Billing

- Настроить реальные Stripe products/prices.
- Проверить webhook через Stripe CLI.
- Добавить customer portal UX.
- Добавить trial handling.
- Добавить отображение `planExpiresAt` в desktop.

## Desktop

- Очистить legacy local auth service.
- Привести `User` model к web account identity.
- Добавить refresh session action.
- Добавить logout с очисткой session и возвратом на login screen.

## Integrations

- Meta OAuth/System User token flow.
- Keitaro real API adapter.
- Token encryption.
- Retry/backoff.
- Rate limit strategy.

## Product

- Entitlements by plan.
- Usage counters.
- Launch limits.
- Audit retention.
- Team features.

