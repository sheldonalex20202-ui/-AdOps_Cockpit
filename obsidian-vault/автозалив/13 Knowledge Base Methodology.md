# Knowledge Base Methodology

## Цель

Эта заметка задает правила ведения базы знаний, чтобы она оставалась полезной для разработки, а не превращалась в архив устаревших описаний.

## Правило обновления

Любое изменение кода должно обновлять одну из заметок:

- архитектурное изменение -> [[03 Architecture Map]];
- изменение авторизации -> [[06 Auth Flow]] и [[Processes/03 Desktop Auth Callback Process]];
- изменение подписок -> [[07 Billing and Subscriptions]] и [[Processes/04 Subscription Checkout Process]];
- изменение launch logic -> [[09 Launch Domain]] и [[Processes/11 Launch Job Process]];
- новая фича -> новая process note по [[Templates/Process Template]].

## Уровни документации

### Overview notes

Отвечают на вопрос “что это за часть системы”.

Примеры:

- [[01 System Overview]]
- [[04 Desktop App]]
- [[05 Web Resource]]

### Process notes

Отвечают на вопрос “как сценарий исполняется”.

Примеры:

- [[Processes/01 Desktop Startup Process]]
- [[Processes/11 Launch Job Process]]

### Decision notes

Будущая категория для архитектурных решений. Формат:

```text
Decision:
Context:
Options:
Chosen:
Consequences:
Review date:
```

## Definition of Useful Note

Заметка полезна, если по ней можно:

1. найти релевантные файлы;
2. понять flow;
3. понять source of truth;
4. увидеть edge cases;
5. понять, что тестировать.

## Что не писать

- Длинные абстрактные рассуждения без привязки к системе.
- Описания “как должно быть”, не отделенные от “как сейчас”.
- Секреты, токены, реальные ключи.

