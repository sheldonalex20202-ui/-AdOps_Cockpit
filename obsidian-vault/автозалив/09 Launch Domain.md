# Launch Domain

## Назначение

Launch domain моделирует массовое создание рекламных структур по кабинетам и креативам. Сейчас это mock engine, но структура уже готовит будущую Meta API интеграцию.

## Сущности

- `CampaignTemplate`
- `Creative`
- `HeadlineSet`
- `LaunchJob`
- `LaunchJobItem`
- `MetaAdAccount`

## Structures

- `CBO`
- `ABO`
- `ISOLATION`
- `Z_GROUPED`

## Creative parsing

Формат имени:

```text
OFFER-GEO-DATE-VERSION-ZNUM
SKANDAL-ES-1805-2-Z1
```

Парсер достает:

- offer name;
- geo;
- date;
- version;
- Z group.

## Z grouped launch

`Z_GROUPED` группирует креативы по `zGroup`, подставляет headlines из `HeadlineSet` и создает несколько кампаний на аккаунт при `campaignsPerAccount > 1`.

## Mock errors

Mock launch симулирует ошибки Meta API:

- token expired;
- rate limit;
- billing issue;
- restricted account;
- verification needed.

## Future real adapter

Для перехода к real Meta API нужен отдельный adapter:

1. OAuth/System User token.
2. Encrypted token storage.
3. Account status fetch.
4. Campaign/adset/ad creation.
5. Retry/backoff.
6. Rate limit handling.
7. Audit log for each external mutation.

