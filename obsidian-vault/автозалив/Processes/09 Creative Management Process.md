# Creative Management Process

## Цель

Хранить креативы и автоматически извлекать `geo`/`zGroup` из имени файла для launch workflows.

## Участники

- Desktop creatives UI.
- Go `CreateCreative`.
- SQLite `Creative`.
- Web API `/api/creatives`.
- Launch parser.

## Create creative flow

1. User creates creative with name and metadata.
2. If `zGroup` or `geo` missing, parser tries to extract from filename.
3. Creative is saved with `userId`.
4. Later launch process can filter/group by `zGroup` and `geo`.

## Filename convention

```text
OFFER-GEO-DATE-VERSION-ZNUM
SKANDAL-ES-1805-2-Z1
```

Extracted values:

- offer;
- geo;
- date;
- version;
- zGroup.

## Файлы реализации

- `adops-desktop/app.go`
- `adops-desktop/internal/launch/engine.go`
- `adops-desktop/frontend/src/pages/creatives/CreativesClient.tsx`
- `src/app/api/creatives/route.ts`
- `src/lib/launch-engine.ts`

## Data model

- `name`
- `type`
- `zGroup`
- `geo`
- `mediaUrl`
- `headline`
- `primaryText`
- `description`
- `callToAction`
- `destinationUrl`

## Edge cases

- Filename does not match convention.
- zGroup exists but geo is missing.
- Multiple offers mixed in one launch.
- Media file storage is currently URL/text, not actual upload pipeline.

## Улучшения

- Add local file import.
- Add media storage.
- Add creative preview.
- Add validation by launch structure.

