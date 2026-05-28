# Entitlements Process

## Цель

Entitlements переводят plan аккаунта в конкретные разрешения и лимиты продукта.

## Сейчас

Plan уже хранится:

- web `User.plan`;
- JWT payload;
- desktop `session.json`.

Но большинство функций desktop еще не ограничены по тарифу.

## Предлагаемая модель

```ts
type Entitlements = {
  maxAccounts: number | "unlimited";
  maxLaunchesPerMonth: number | "unlimited";
  auditRetentionDays: number;
  keitaroEnabled: boolean;
  teamFeaturesEnabled: boolean;
};
```

## Plan mapping

### Free

- max accounts: 5;
- launches per month: 3;
- basic health checks;
- audit retention: 7 days.

### Pro

- unlimited accounts;
- unlimited launches;
- extended health checks;
- audit retention: 90 days;
- Keitaro enabled.

### Team

- Pro features;
- team features;
- audit retention: 365 days;
- API access.

## Где применять

- Account creation/import.
- Launch job creation.
- Keitaro sync.
- Audit log list/retention.
- Future cloud sync.

## Файлы будущей реализации

- `adops-desktop/internal/entitlements`
- `src/lib/entitlements.ts`
- desktop session user model.

## Edge cases

- User paid but desktop session has old plan.
- User downgraded while desktop is open.
- Offline mode and expired subscription.

## Улучшения

- Add `RefreshSubscription` action in desktop.
- Add server-side signed entitlements in JWT.
- Add usage counters.

