# Развёртывание HCM / LMS Smartis

## Что потребуется

- Linux-сервер с Docker Engine и Docker Compose;
- два домена, направленных на сервер:
  - `lms.company.ru` — интерфейс и API;
  - `scorm.company.ru` — изолированный SCORM-контент;
- открытые TCP-порты 80 и 443;
- каталог вне репозитория для резервных копий.

## Первый запуск

1. Скопируйте проект на сервер.
2. Создайте production-конфигурацию:

   ~~~bash
   cp .env.production.example .env
   ~~~

3. В `.env` обязательно замените:

   - `APP_SITE_ADDRESS` и `SCORM_SITE_ADDRESS`;
   - `DJANGO_ALLOWED_HOSTS` и `DJANGO_CSRF_TRUSTED_ORIGINS`;
   - `SCORM_CONTENT_ORIGIN`;
   - `DJANGO_SECRET_KEY`;
   - `POSTGRES_PASSWORD`;
   - `INITIAL_ADMIN_EMAIL` и `INITIAL_ADMIN_PASSWORD`;
   - `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` и `DEFAULT_FROM_EMAIL`;
   - `CORPORATE_EMAIL_DOMAINS` — разрешённые домены через запятую;
   - `BACKUP_DIR` на каталог, который копируется на отдельный диск или хранилище.

4. Проверьте итоговую конфигурацию и запустите систему:

   ~~~bash
   docker compose config
   docker compose up -d --build
   docker compose ps
   ~~~

5. Проверьте состояние API:

   ~~~bash
   curl https://lms.company.ru/api/v1/health/
   ~~~

   Корректный ответ содержит `status: ok` и `database: ok`.

6. Войдите под первым администратором, смените временный пароль, очистите
   `INITIAL_ADMIN_EMAIL` и `INITIAL_ADMIN_PASSWORD` в `.env`, затем примените
   конфигурацию командой `docker compose up -d`.

`BOOTSTRAP_DEMO` в production должен оставаться `false`: демонстрационные
сотрудники, курсы и тестовый пароль на сервере не создаются.

HSTS preload не включайте автоматически: после добавления домена в preload-list
отказаться от HTTPS для него и затронутых поддоменов быстро не получится. Значение
`DJANGO_SECURE_HSTS_PRELOAD=true` допустимо только после утверждения постоянной
доменной политики и проверки всех поддоменов.

## Корпоративная почта Яндекса

Production-шаблон уже настроен на `smtp.yandex.ru`, порт 465 и SSL. Укажите
полный адрес корпоративного ящика в `EMAIL_HOST_USER`, а в
`EMAIL_HOST_PASSWORD` — отдельный пароль приложения Яндекса. Основной пароль
почтового аккаунта использовать не следует.

`APP_PUBLIC_URL` должен совпадать с внешним адресом LMS: он используется в
одноразовых ссылках приглашения и восстановления доступа.

После настройки создайте тестового пользователя в разделе
«Администрирование → Пользователи». Письмо должно содержать ссылку активации,
которая действует семь дней. Для пользователя со статусом «Приглашён» доступна
повторная отправка; предыдущая ссылка после этого перестаёт работать.

## Обновление

Штатные production-релизы выполняются вручную по тегу через GitHub Actions.
Полный регламент, необходимые secrets и правила отката описаны в
`docs/RELEASE_PROCESS.md`. Команды ниже предназначены для аварийного ручного
обслуживания сервера.

Данные PostgreSQL и загруженные файлы находятся в именованных Docker-томах и не
заменяются при пересборке контейнеров. Перед обновлением создайте резервную копию,
затем:

~~~bash
docker compose --profile maintenance run --rm backup
docker compose up -d --build
docker compose ps
~~~

Никогда не используйте `docker compose down -v`: флаг `-v` удаляет тома с базой
и файлами. Подробный регламент и правила безопасности описаны в
`docs/DATA_SAFETY_AND_SECURITY.md`.

Миграции базы выполняются автоматически при запуске API. Контейнер API считается
готовым только после успешного ответа healthcheck, включая соединение с PostgreSQL.

## Резервное копирование

Ручной запуск:

~~~bash
docker compose --profile maintenance run --rm backup
~~~

В `BACKUP_DIR` создаётся папка с UTC-датой, содержащая:

- `database.dump` — база PostgreSQL;
- `media.tar.gz` — видео, документы, обложки и SCORM-файлы;
- `backup-id.txt` — идентификатор копии.

Копии старше `BACKUP_RETENTION_DAYS` удаляются автоматически. Сам каталог
`BACKUP_DIR` необходимо дополнительно синхронизировать на другой сервер или в
объектное хранилище.

Для ежедневного запуска можно добавить в cron:

~~~cron
15 2 * * * cd /opt/smartis && docker compose --profile maintenance run --rm backup
~~~

## Восстановление

Остановите API и веб-интерфейс, оставив PostgreSQL запущенным:

~~~bash
docker compose stop api web proxy
docker compose --profile maintenance run --rm restore 20260729T120000Z
docker compose up -d
~~~

Замените идентификатор на название нужной папки в `BACKUP_DIR`. Восстановление
заменяет данные PostgreSQL и содержимое тома загруженных файлов, поэтому сначала
сохраните текущее состояние отдельной копией.

## Проверка после запуска

- открывается основной домен;
- `/api/v1/health/` возвращает HTTP 200;
- вход первого администратора работает;
- загружаются обложка, видео и документ;
- открывается SCORM на отдельном поддомене;
- создаётся и читается резервная копия;
- в `.env` нет демонстрационного пароля и `BOOTSTRAP_DEMO=false`.
