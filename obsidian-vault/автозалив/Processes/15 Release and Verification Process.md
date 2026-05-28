# Release and Verification Process

## Цель

Перед передачей сборки или деплоем убедиться, что web и desktop совместимы.

## Checklist

### Web

```powershell
npm run build
```

Проверить:

- `/login`;
- `/register`;
- `/pricing`;
- `/desktop-callback`;
- `/api/session/verify`;
- Stripe routes compile.

### Desktop frontend

```powershell
cd adops-desktop/frontend
npm run build
```

### Go

```powershell
cd adops-desktop
go test ./...
```

### Wails

```powershell
cd adops-desktop
wails build
```

## Manual auth verification

1. Start web with `npm run dev`.
2. Start desktop.
3. Click browser login.
4. Login/register.
5. Confirm web callback shows account and plan.
6. Confirm desktop enters main app.
7. Confirm `session.json` exists.

## Manual billing verification

1. Set Stripe test env.
2. Open `/pricing`.
3. Choose Pro/Team.
4. Complete test checkout.
5. Trigger webhook via Stripe CLI or configured endpoint.
6. Check `User.plan`.
7. Re-login desktop and check plan in session.

## Regression risks

- Wails generated bindings out of sync.
- Next dev/build `.next` conflict.
- Stripe API type changes.
- Supabase Auth session behavior changes.

## Release notes template

```md
## Changed
- 

## Verified
- npm run build
- desktop frontend build
- go test ./...
- wails build

## Known risks
- 
```

