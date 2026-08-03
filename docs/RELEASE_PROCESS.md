# Выпуск релизов Smartis LMS

## Ветки и проверки

- `main` содержит только проверенное состояние production-кода.
- Работа ведётся в короткоживущих ветках `codex/*`.
- Слияние в `main` выполняется через pull request после успешного workflow
  `Smartis LMS CI`.
- CI проверяет backend-тесты, миграции, Django, production-сборку frontend и
  Compose-конфигурацию.

В настройках GitHub для `main` следует включить branch protection, запретить
прямой push и потребовать успешные jobs `Backend tests and checks`,
`Frontend production build` и `Release configuration`.

## Подготовка production-доступа

Workflow использует GitHub Environment `production`. Для него необходимо
включить required reviewer и добавить secrets:

- `SERVER_HOST` — адрес сервера;
- `SERVER_PORT` — SSH-порт;
- `SERVER_USER` — отдельный deploy-пользователь;
- `SSH_PRIVATE_KEY` — закрытый Ed25519-ключ deploy-пользователя;
- `SERVER_KNOWN_HOSTS` — заранее проверенная строка host key сервера.

Deploy-пользователь должен иметь доступ только к Docker и каталогам приложения.
Пароль root и отключение проверки host key в workflow не используются.

## Выпуск

1. Слить проверенный PR в `main`.
2. Создать подписанный или аннотированный тег формата `vMAJOR.MINOR.PATCH` на
   нужном коммите `main` и отправить тег в GitHub.
3. В Actions вручную открыть `Deploy Smartis LMS to production`.
4. Указать тег и подтверждение `DEPLOY_PRODUCTION`.
5. Назначенный reviewer подтверждает deployment в Environment `production`.

Workflow повторно запускает CI, создаёт immutable-архив, проверяет место на диске,
создаёт и проверяет backup, собирает контейнеры последовательно, запускает релиз
и проверяет внутренний и публичный health endpoint.

Релизы хранятся в `/opt/smartis-releases/<commit>`, активный релиз отмечен
ссылкой `/opt/smartis-current`, а production-секреты остаются в
`/opt/smartis/.env`. Docker volumes не удаляются и используются одним Compose
project `smartis-lms`.

## Откат

При ошибке запуска workflow возвращает код приложения на предыдущий релиз.
Миграции должны быть обратно совместимыми: сначала добавление новых полей и
таблиц, затем выпуск кода, и только в отдельном последующем релизе удаление
старых полей.

Автоматическое восстановление базы не выполняется, поскольку оно может удалить
данные, появившиеся после backup. Восстановление БД запускается отдельно после
оценки инцидента и явного решения ответственного сотрудника по инструкции
`docs/DEPLOYMENT.md`.
