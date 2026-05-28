# Audit Logging Process

## Цель

Audit log фиксирует важные действия пользователя и результаты операций.

## Участники

- Desktop audit service.
- Web `audit` helper.
- `AuditLog` table.
- Audit UI.

## События

Typical actions:

- account created;
- account import;
- account sync;
- health check;
- pool created;
- launch completed;
- headline sync.

## Data model

- `userId`
- `action`
- `objectType`
- `objectId`
- `oldValueJson`
- `newValueJson`
- `result`
- `errorMessage`
- `createdAt`

## Файлы реализации

- `adops-desktop/internal/audit/audit.go`
- `adops-desktop/app.go`
- `src/lib/audit.ts`
- `src/app/api/audit-logs/route.ts`
- `adops-desktop/frontend/src/pages/audit-logs/AuditClient.tsx`

## Flow

1. Domain operation succeeds or fails.
2. Service creates audit record.
3. UI can list latest records.

## Edge cases

- Audit write fails after operation succeeds.
- Payload contains secrets.
- Large JSON payloads bloat local DB.
- Error logs missing enough context.

## Улучшения

- Never write tokens/API keys.
- Add event taxonomy.
- Add severity.
- Add retention by plan.
- Add export for support/debugging.

