# Security Notes

## Auth

- Web использует Supabase Auth.
- Desktop не хранит пароль.
- Desktop хранит JWT в `session.json`.
- JWT подписывается `JWT_SECRET`.
- Callback разрешен только на localhost.

## Supabase

Нельзя использовать user-editable metadata для authorization. Authorization state должен жить в базе или app metadata.

RLS нужно проверять для всех таблиц в exposed schema. Особенно для новых таблиц:

- `CampaignTemplate`
- `Creative`
- `HeadlineSet`
- `LaunchJob`
- `LaunchJobItem`

## Stripe

- Checkout создает платежный flow.
- Webhook является источником обновления подписки.
- `STRIPE_WEBHOOK_SECRET` обязателен.
- Нельзя доверять plan из frontend формы без проверки допустимых plan id.

## Desktop local data

SQLite БД локальная. Если в будущем появится cloud sync, потребуется:

- конфликтная модель;
- encryption-at-rest strategy;
- server-side ownership checks;
- migration from local-only to account-scoped cloud data.

## Secrets

Нельзя коммитить:

- `.env`
- `.env.local`
- Stripe secret key
- Supabase service role key
- JWT secret
- Meta tokens
- Keitaro API keys

