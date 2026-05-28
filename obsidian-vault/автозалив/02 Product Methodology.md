# Product Methodology

## Цель продукта

Сделать рабочий cockpit для медиабаера, который экономит время на повторяющихся операциях: учет кабинетов, диагностика готовности, подготовка к запуску и массовый launch flow.

## Принципы

1. Desktop-first для операционной работы.
2. Web-first для аккаунта, авторизации и оплаты.
3. Минимум ручных ключей и локальных лицензий.
4. Данные пользователя должны быть scoped по аккаунту.
5. Mock-first для сложных внешних интеграций, затем постепенная замена на реальные API.

## MVP scope

В MVP есть:

- кабинеты Meta;
- пулы кабинетов;
- health checks;
- креативы;
- headline sets;
- mock Keitaro sync;
- launch jobs;
- audit logs;
- web account and subscription.

Не является текущим MVP:

- полноценный agency/team workflow;
- real Meta OAuth/System User token flow;
- production-grade billing enforcement внутри всех функций;
- real Keitaro API adapter;
- cloud sync локальных desktop данных.

## Методология развития

Каждую крупную фичу вести по циклу:

1. Product intent: какую боль закрываем.
2. Domain model: какие сущности нужны.
3. System boundary: web, desktop или оба.
4. Mock adapter: быстрый рабочий сценарий.
5. Real adapter: интеграция с внешним API.
6. Audit and safety: логирование, ограничения, ошибки.

## Definition of Done

Фича считается готовой, когда:

- понятно, где хранится состояние;
- есть путь пользователя в UI;
- есть серверная/API-граница;
- сборки проходят;
- в базе знаний обновлена релевантная заметка.

