# Error Handling Process

## Цель

Ошибки должны быть понятны пользователю и полезны для разработки.

## Web error handling

Web API uses:

- `ok(data)`
- `fail(error)`

`fail` maps:

- Zod validation -> 400;
- `UNAUTHORIZED` -> 401;
- `FORBIDDEN...` -> 403;
- other errors -> 500.

## Desktop error handling

Desktop Go methods often return:

- object + error;
- response struct with `error`;
- empty data for unauthenticated state.

## Common errors

### Web server not running

Desktop opens browser to localhost, browser cannot load page.

Action:

1. Start `npm run dev`.
2. Check `http://localhost:3000/login`.

### CSS missing in web

Cause: `npm run build` ran while `next dev` was alive and `.next` got replaced.

Action:

1. Stop process on 3000.
2. Delete `.next`.
3. Start `npm run dev`.
4. Hard refresh.

### Desktop waits after successful auth

Cause: local callback did not receive token.

Action:

1. Click `Open app` fallback.
2. Check callback URL includes `token`, `state`.
3. Check local firewall/browser blocking localhost request.

### Stripe checkout fails

Likely causes:

- missing env keys;
- invalid price id;
- user not logged in;
- Stripe customer/session creation error.

## Файлы реализации

- `src/lib/api.ts`
- `adops-desktop/app.go`
- `adops-desktop/internal/authflow/authflow.go`

## Улучшения

- Standardize error codes.
- Add toast notifications.
- Add local log file for desktop.
- Add support bundle export.

