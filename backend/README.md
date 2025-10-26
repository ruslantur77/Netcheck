# Netcheck backend

Бекенд для сервиса проверки хостов.

Позволяет администратору управлять агентами, создавать запрос на проверку хостов и сайтов. 
Реализует полноценную систему JWT аутентификации для администратора с refresh и access токенами.  

## Стек

- Python 3.12
- FastAPI
- aiohttp
- PostgreSQL
- SQLAlchemy
- Alembic
- Redis
- RabbitMQ (aio-pika)

## Функционал

- Создание запроса на проверку сайта
- API для управления агентами
- Динамическое управление учетными данными rabbitmq, создание пользователей, очередей, прав доступа для агентов
- Хранение heartbeat и информации об агентах
- Управление JWT токенами 

## Запуск


### Конфигурация

Для корректного запуска необходимо в файле `.env` указать переменные окружения.

Пример файла - `.env.example`


| Переменная                     | Значение по умолчанию                                                                 | Описание                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `LOG_LEVEL`                    | `INFO`                                                                                | Уровень логирования приложения (например: DEBUG, INFO, WARNING, ERROR). |
| `DB_USER`                      | `postgres`                                                                            | Имя пользователя для подключения к базе данных PostgreSQL.              |
| `DB_PASS`                      | `dev_password`                                                                        | Пароль для подключения к базе данных.                                   |
| `DB_NAME`                      | `netcheck_db`                                                                         | Имя базы данных PostgreSQL.                                             |
| `DB_HOST`                      | `172.17.0.1`                                                                          | Хост (адрес) сервера базы данных.                                       |
| `DB_PORT`                      | `5432`                                                                                | Порт PostgreSQL.                                                        |
| `RMQ_USER`                     | `user`                                                                                | Имя пользователя для подключения к RabbitMQ.                            |
| `RMQ_PASS`                     | `dev_password`                                                                        | Пароль для подключения к RabbitMQ.                                      |
| `RMQ_HOST`                     | `172.17.0.1`                                                                          | Хост RabbitMQ.                                                          |
| `RMQ_MANAGEMENT_HOST`          | `http://172.17.0.1`                                                                   | Адрес панели управления RabbitMQ.                                       |
| `RMQ_PORT`                     | `5672`                                                                                | Порт RabbitMQ для AMQP соединений.                                      |
| `RMQ_MANAGEMENT_PORT`          | `15672`                                                                               | Порт веб-интерфейса RabbitMQ Management.                                |
| `RMQ_RESPONSE_QUEUE`           | `agent_responses`                                                                     | Очередь, в которую агенты отправляют ответы.                            |
| `RMQ_REQUEST_EXCHANGE`         | `agent_requests_exchange`                                                             | Exchange для запросов к агентам.                                        |
| `RMQ_REQUEST_ROUTING_KEY`      | `agent.requests`                                                                      | Routing key для направления сообщений агентам.                          |
| `RMQ_AGENTS_VHOST`             | `agents_vhost`                                                                        | Виртуальный хост RabbitMQ для агентов.                                  |
| `AGENT_HEARTBEAT_INTERVAL_SEC` | `30`                                                                                  | Интервал отправки heartbeat-сообщений агентом (в секундах).             |
| `AGENT_HEARTBEAT_TIMEOUT_SEC`  | `90`                                                                                  | Таймаут для heartbeat.                                                  |
| `REDIS_HOST`                   | `172.17.0.1`                                                                          | Хост Redis.                                                             |
| `REDIS_PORT`                   | `6379`                                                                                | Порт Redis.                                                             |
| `REDIS_PASSWORD`               | `dev_password`                                                                        | Пароль для подключения к Redis.                                         |
| `ALGORITHM`                    | `HS256`                                                                               | Алгоритм подписи JWT токенов.                                           |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | `15`                                                                                  | Время жизни access-токена в минутах.                                    |
| `REFRESH_TOKEN_EXPIRE_DAYS`    | `7`                                                                                   | Время жизни refresh-токена в днях.                                      |
| `SECRET_KEY`                   | `ac8da5f03b1c478d295b927b999b5f5b3440d26b7d6cc6c96dfc8cf8f4a7415d`                    | Секретный ключ для генерации и проверки JWT токенов.                    |
| `ALLOWED_ORIGINS`              | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:80,http://127.0.0.1:80` | Разрешённые источники (CORS) для фронтенда.                             |


### Миграции БД

Перед запуском необходимо применить миграции для базы данных:

```bash
alembic upgrade head
```

Предварительно необходимо создать базу данных и указать ее в файле `.env`



### Локальный запуск

#### UV (рекомендуется)

Необходим установленный [UV](https://docs.astral.sh/uv/)

Для запуска при помощи UV необходимо выполнить:

```bash
uv sync

uv run -m uvicorn netcheck_backend.main:app --reload --port 8000 --host 0.0.0.0
```

#### pip

Необходимо создать виртуальное окружение:

```bash
python -m venv .venv
source .venv/bin/activate
```

Далее установить пакет в editable mode:

```bash
pip install -e .
```

Запустить:

```bash
uvicorn netcheck_backend.main:app --reload --port 8000 --host 0.0.0.0
```

