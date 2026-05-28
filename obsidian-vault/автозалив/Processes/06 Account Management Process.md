# Account Management Process

## Цель

Пользователь ведет базу Meta ad accounts: создает, импортирует mock accounts, фильтрует, архивирует, синкает mock status.

## Участники

- Desktop pages/accounts UI.
- Go `App` methods.
- SQLite `MetaAdAccount`.
- Audit service.
- Web API equivalents in `src/app/api/accounts`.

## Основные операции

### Create account

1. UI собирает `externalId`, `name`, `currency`, `timezone`, `notes`.
2. Desktop вызывает `CreateAccount`.
3. Go создает `MetaAdAccount` с `userId = currentUserID`.
4. Account получает default statuses.
5. Audit пишет событие `create`.

### List accounts

1. UI вызывает `GetAccounts(poolID, status, search, archived)`.
2. Go строит query by `user_id`.
3. Optional filters:
   - pool;
   - status;
   - search by name/external id;
   - archived.
4. Возвращаются accounts with pools.

### Archive accounts

1. UI передает список ids.
2. Go обновляет `archived`.
3. Список скрывается из default view.

### Mock import

1. UI вызывает `MockImportAccounts(count)`.
2. Go генерирует accounts.
3. Status/token/billing выбираются случайно.
4. Audit пишет `import`.

### Mock sync

1. UI вызывает `MockSyncAccount(id)`.
2. Go случайно обновляет account status/token/billing.
3. Обновляется `lastSyncAt`.
4. Audit пишет `sync`.

## Файлы реализации

- `adops-desktop/app.go`
- `adops-desktop/internal/db/models.go`
- `adops-desktop/frontend/src/pages/accounts/AccountsClient.tsx`
- `src/app/api/accounts/route.ts`
- `src/app/api/accounts/import/route.ts`
- `src/lib/mock-accounts.ts`

## Данные

`MetaAdAccount` содержит:

- `externalId`;
- `name`;
- `currency`;
- `timezone`;
- `status`;
- `readinessStatus`;
- `readinessScore`;
- `billingStatus`;
- `tokenStatus`;
- `spendLimit`;
- `lastSyncAt`;
- `archived`.

## Edge cases

- Duplicate `externalId` within user.
- Account belongs to another user.
- Archived account accidentally included in launch.
- Mock import creates conflicting external ids.

## Улучшения

- Добавить CSV import/export.
- Добавить real Meta listAdAccounts adapter.
- Добавить bulk edit.
- Добавить per-plan account limits through [[13 Entitlements Process]].

