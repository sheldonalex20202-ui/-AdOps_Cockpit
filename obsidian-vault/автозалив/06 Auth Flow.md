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
    B->>W: login/register (email+password или OAuth)
    W->>S: validate Supabase session
    W->>W: issue desktop JWT
    W->>B: render /desktop-callback
    B->>B: hidden iframe src=callback URL
    note over B,L: iframe обходит Chrome PNA блокировку fetch
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

## Chrome PNA fix

`fetch()` из HTTPS-страницы (`vercel.app`) к `http://127.0.0.1` заблокирован Chrome Private Network Access policy.

**Решение**: `RedirectClient.tsx` рендерит скрытый `<iframe src={callbackUrl}>` вместо `window.location.replace` или `fetch`.

Go callback server отвечает на OPTIONS preflight с заголовком:
```
Access-Control-Allow-Private-Network: true
```

Это разрешает iframe-навигацию с HTTPS на localhost.

## OAuth (Google / Apple)

- Суpabase OAuth с `prompt: "select_account"` — принудительный выбор аккаунта Google при каждом входе (не автологин сохранённой сессией).
- `redirectTo` должен быть добавлен в Redirect URLs в Supabase Dashboard (wildcard `*` для query params): `https://ad-ops-cockpit.vercel.app/api/auth/callback*`.
- Callback route `/api/auth/callback` передаёт `desktop_callback` и `desktop_state` в `/desktop-callback`.

## UX decision

Страница `/desktop-callback` показывает:

- имя;
- email;
- тариф;
- срок действия;
- кнопку `Открыть приложение вручную` (fallback, если iframe не сработал);
- кнопку оплаты/продления.

Страница автоматически уведомляет desktop через hidden iframe, а не `window.location.replace`, чтобы браузер остался на Vercel-странице.
