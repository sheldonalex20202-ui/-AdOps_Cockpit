# Desktop App

## Роль

Desktop app - основное приложение с рабочим функционалом. Пользователь проводит здесь ежедневные операции: аккаунты, пулы, креативы, health checks, launch jobs.

## Технологии

- Wails/Go backend.
- React/Vite frontend.
- SQLite через GORM.
- Local session file `session.json`.

## Ключевые файлы

- `adops-desktop/app.go`
- `adops-desktop/internal/db/models.go`
- `adops-desktop/internal/session/session.go`
- `adops-desktop/internal/authflow/authflow.go`
- `adops-desktop/frontend/src/App.tsx`
- `adops-desktop/frontend/src/pages/*`

## Auth behavior

Desktop больше не регистрирует и не логинит пользователя локально. Он:

1. читает `%APPDATA%\AdOpsCockpit\session.json`;
2. проверяет JWT через web `/api/session/verify`;
3. если сессии нет - показывает экран входа;
4. при клике запускает локальный HTTP callback server;
5. открывает web `/login?callback=...&state=...`;
6. получает JWT от web callback;
7. сохраняет session и открывает основной интерфейс.

## Local database

SQLite хранит рабочие данные:

- accounts;
- pools;
- health checks;
- creatives;
- templates;
- headline sets;
- launch jobs;
- audit logs.

## Что больше не должно развиваться

- License key activation как основной способ доступа.
- Локальный bcrypt login/register.

Эти части можно удалить позже отдельной миграцией, когда будет подтверждено, что старые локальные данные не требуют переноса.

