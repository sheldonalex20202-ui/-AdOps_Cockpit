# Process Map

Эта папка описывает процессы системы на уровне исполнения: кто участвует, какие файлы отвечают за сценарий, какие данные читаются/пишутся, какие ошибки возможны.

## Группы процессов

### Identity and access

- [[01 Desktop Startup Process]]
- [[02 Web Login and Registration Process]]
- [[03 Desktop Auth Callback Process]]
- [[13 Entitlements Process]]

### Billing

- [[04 Subscription Checkout Process]]
- [[05 Stripe Webhook Process]]

### Core product workflows

- [[06 Account Management Process]]
- [[07 Pool Management Process]]
- [[08 Health Check Process]]
- [[09 Creative Management Process]]
- [[10 Headline Set Process]]
- [[11 Launch Job Process]]
- [[12 Audit Logging Process]]

### Operations

- [[14 Error Handling Process]]
- [[15 Release and Verification Process]]

## Универсальный шаблон процесса

Каждый процесс должен фиксировать:

1. Цель.
2. Участников.
3. Триггер.
4. Пошаговый flow.
5. Какие данные читаются.
6. Какие данные пишутся.
7. Ошибки и edge cases.
8. Файлы реализации.
9. Метрики/проверки.
10. Что улучшать дальше.

## Важная граница

В текущей архитектуре web и desktop разделены:

- web владеет identity, subscription, billing;
- desktop владеет операционной работой и локальными workspace данными.

Любой новый процесс должен явно указать, на какой стороне находится source of truth.

