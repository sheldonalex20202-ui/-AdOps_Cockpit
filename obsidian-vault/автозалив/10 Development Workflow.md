# Development Workflow

## Запуск web

```powershell
npm run dev
```

Web доступен на:

```text
http://localhost:3000
```

## Запуск desktop

```powershell
cd adops-desktop
wails dev
```

## Сборка web

```powershell
npm run build
```

## Сборка desktop

```powershell
cd adops-desktop
wails build
```

## Важный dev gotcha

Не стоит держать `next dev` живым и параллельно запускать `npm run build`. Build перезаписывает `.next`, из-за чего dev-сервер может отдавать HTML без CSS/JS, а `/_next/static/...` начнет возвращать 404.

Если стили пропали:

1. остановить процесс на port 3000;
2. удалить `.next`;
3. запустить `npm run dev` заново;
4. сделать hard refresh в браузере.

## Проверки

Минимальный набор:

```powershell
npm run build
cd adops-desktop
npm run build --prefix frontend
go test ./...
wails build
```

## Env

Смотри `.env.example`.

Для desktop auth flow важно:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADOPS_WEB_URL=http://localhost:3000
```

`ADOPS_WEB_URL` используется desktop-приложением как адрес web-ресурса.

