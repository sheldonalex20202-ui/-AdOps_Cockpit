# Headline Set Process

## Цель

Headline set связывает Z-группы с заголовками для `Z_GROUPED` launch structure.

## Участники

- Desktop headline UI inside launch/creatives flow.
- Go `CreateHeadlineSet`, `KeitaroSync`.
- SQLite `HeadlineSet`.
- Web API `/api/headline-sets`.
- Mock Keitaro sync.

## Manual flow

1. User creates set name.
2. Adds `headlinesJson`, usually `{ "Z1": "...", "Z2": "..." }`.
3. Optional `geo`.
4. Set is saved.
5. Launch job uses selected set to fill adset headlines.

## Keitaro mock sync flow

1. User inputs Keitaro URL/API key/campaign id/geo.
2. Current implementation generates mock headlines.
3. Set source is `KEITARO`.
4. Audit logs sync in desktop.

## Файлы реализации

- `adops-desktop/app.go`
- `src/app/api/headline-sets/route.ts`
- `src/app/api/headline-sets/keitaro-sync/route.ts`
- `src/lib/launch-engine.ts`

## Data model

- `name`
- `source`
- `externalId`
- `geo`
- `headlinesJson`

## Edge cases

- Missing headline for a Z group.
- Headline set geo differs from creative geo.
- Keitaro API key should never be stored plain in production.

## Улучшения

- Real Keitaro adapter.
- Secure token storage.
- Preview matrix: Z group -> creatives -> headline.
- Validation before launch.

