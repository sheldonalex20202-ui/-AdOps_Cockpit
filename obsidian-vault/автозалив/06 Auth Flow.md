# Auth Flow

## Цель

Desktop должен авторизоваться через web-аккаунт, чтобы подписка применялась по аккаунту, а не через локальный ключ.

## Sequence

```mermaid
sequenceDiagram
  participant D as Desktop
  participant L as Local callback server
  participant B as Browser
  participant W as Web
  participant S as Supabase

  D->>D: read session.json
  D->>W: GET /api/session/verify
  alt valid token
    D->>D: open app
  else no/invalid token
    D->>L: start 127.0.0.1:PORT
    D->>B: open /login?callback=...
    B->>W: login/register
    W->>S: validate Supabase session
    W->>W: issue desktop JWT
    W->>B: render /desktop-callback
    B->>L: GET /callback?token=...
    L->>D: save session.json
    D->>D: open app
  end
```

## session.json

```json
{
  "token": "eyJ...",
  "userId": "uuid",
  "email": "user@example.com",
  "name": "Alex",
  "plan": "pro",
  "expiresAt": "2026-07-01T00:00:00Z"
}
```

## Security details

- Callback URL должен быть только `localhost` или `127.0.0.1`.
- `state` нужен для защиты от случайного callback.
- JWT подписывается `JWT_SECRET`.
- Desktop проверяет сохраненный token через `/api/session/verify`.

## UX decision

Страница `/desktop-callback` показывает:

- имя;
- email;
- тариф;
- срок действия;
- кнопку возврата в приложение;
- кнопку оплаты/продления.

Страница также автоматически уведомляет desktop локальным callback-запросом.

