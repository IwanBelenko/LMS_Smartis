# Smartis LMS

Корпоративная LMS для обучения сотрудников Smartis.

## Что уже работает

- вход по email и паролю;
- роли администратора, автора, руководителя и сотрудника;
- отделы и приглашения сотрудников;
- административный список пользователей;
- учебный дашборд и рейтинг;
- светлая и тёмная темы;
- запуск через Docker Compose.

## Запуск через Docker

~~~bash
cp .env.example .env
docker compose up --build
~~~

Откройте http://localhost. Для первого локального входа:

- email: admin@smartis.local
- пароль: SmartisDemo123!

Перед публикацией на сервере обязательно замените пароль и секреты в .env.

## Состав проекта

- frontend — React + TypeScript;
- backend — Django REST API;
- infra — Caddy;
- compose.yaml — PostgreSQL, Redis, MinIO, API и веб-интерфейс.
