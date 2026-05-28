# AdOps Cockpit Knowledge Base

Эта база знаний фиксирует контекст проекта `AdOps Cockpit`: продуктовую методологию, архитектуру, доменную модель, web-авторизацию, desktop-приложение, подписки, БД и дальнейший roadmap.

## Быстрая навигация

- [[01 System Overview|Обзор системы]]
- [[02 Product Methodology|Методология продукта]]
- [[03 Architecture Map|Карта архитектуры]]
- [[04 Desktop App|Desktop приложение]]
- [[05 Web Resource|Web ресурс]]
- [[06 Auth Flow|Авторизация desktop через web]]
- [[07 Billing and Subscriptions|Оплата и подписки]]
- [[08 Database and Data Model|База данных и модель данных]]
- [[09 Launch Domain|Автозалив и launch domain]]
- [[10 Development Workflow|Разработка и запуск]]
- [[11 Security Notes|Безопасность]]
- [[12 Roadmap|Roadmap]]
- [[13 Knowledge Base Methodology|Методология базы знаний]]
- [[99 Glossary|Глоссарий]]

## Процессы системы

- [[Processes/00 Process Map|Process Map]]
- [[Processes/01 Desktop Startup Process|Desktop startup]]
- [[Processes/02 Web Login and Registration Process|Web login and registration]]
- [[Processes/03 Desktop Auth Callback Process|Desktop auth callback]]
- [[Processes/04 Subscription Checkout Process|Subscription checkout]]
- [[Processes/05 Stripe Webhook Process|Stripe webhook]]
- [[Processes/06 Account Management Process|Account management]]
- [[Processes/07 Pool Management Process|Pool management]]
- [[Processes/08 Health Check Process|Health check]]
- [[Processes/09 Creative Management Process|Creative management]]
- [[Processes/10 Headline Set Process|Headline sets]]
- [[Processes/11 Launch Job Process|Launch jobs]]
- [[Processes/12 Audit Logging Process|Audit logging]]
- [[Processes/13 Entitlements Process|Entitlements]]
- [[Processes/14 Error Handling Process|Error handling]]
- [[Processes/15 Release and Verification Process|Release and verification]]

## Текущее позиционирование

`AdOps Cockpit` - инструмент для медиабаера, который управляет большим количеством Meta/Facebook рекламных кабинетов, креативами, пулами, health checks и mock/будущим real-автозаливом.

Главное приложение с рабочим функционалом - [[04 Desktop App|desktop app]] на Wails/Go. [[05 Web Resource|Web ресурс]] отвечает за регистрацию, авторизацию, аккаунт, подписки и оплату.

## Принцип базы знаний

Каждая заметка должна отвечать на три вопроса:

1. Что это за часть системы.
2. Как она работает сейчас.
3. Какие решения и ограничения нужно помнить при развитии.
