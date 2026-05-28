# Pool Management Process

## Цель

Пулы позволяют группировать кабинеты под тесты, scale, проблемные состояния или любые рабочие категории.

## Участники

- Desktop account-pools UI.
- Go `App` methods.
- SQLite `AccountPool`, `AccountPoolItem`.
- Audit service.
- Web API equivalents.

## Operations

### Create pool

1. User enters name, description, color.
2. UI calls `CreatePool`.
3. Go creates `AccountPool`.
4. Audit logs `create`.

### List pools

1. UI calls `GetPools`.
2. Go queries by current user.
3. Preloads items and ad accounts.

### Add accounts to pool

1. User selects accounts.
2. UI calls `AddAccountsToPool(poolID, accountIDs)`.
3. Go creates `AccountPoolItem`.
4. `FirstOrCreate` prevents duplicates.

### Remove account from pool

1. UI calls `RemoveAccountFromPool(poolID, accountID)`.
2. Go deletes row scoped by current user.

### Delete pool

1. UI calls `DeletePool`.
2. Pool row is deleted.
3. Related items should cascade depending on DB constraints/migration.

## Файлы реализации

- `adops-desktop/app.go`
- `adops-desktop/frontend/src/pages/account-pools/AccountPoolsClient.tsx`
- `src/app/api/account-pools/route.ts`
- `src/app/api/account-pools/[id]/items/route.ts`

## Data model

- `AccountPool`: group metadata.
- `AccountPoolItem`: many-to-many link between pool and account.

## Edge cases

- Adding account from another user.
- Deleting pool with items.
- Duplicate pool names.
- Color validation mismatch between web/desktop.

## Улучшения

- Add pool-level launch presets.
- Add smart pools by status/readiness.
- Add bulk remove.

