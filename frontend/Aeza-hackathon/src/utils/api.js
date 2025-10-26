// src/utils/api.js

import axios from 'axios';

// --- НАВИГАЦИЯ ДЛЯ АВТОРИЗАЦИИ (для перенаправления при 401) ---

let globalNavigate = (path) => {
    console.error(`Router not initialized. Tried to navigate to: ${path}`);
};

/**
 * Устанавливает функцию навигации из роутера (например, useHistory или useNavigate)
 * для перенаправления пользователя при истечении срока действия refresh-токена.
 */
export const setGlobalNavigator = (navigateFunction) => {
    globalNavigate = navigateFunction;
};

// --- БАЗОВАЯ НАСТРОЙКА AXIOS И ИНТЕРЦЕПТОРЫ АВТОРИЗАЦИИ ---

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    timeout: 5000,
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
    failedQueue = [];
};

// Интерцептор запросов: Добавляем токен доступа
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Интерцептор ответов: Обрабатываем 401 (обновление токена)
instance.interceptors.response.use(
    (res) => res,
    async (err) => {
        const originalRequest = err.config;

        // Пропускаем, если нет запроса, или это запрос, который не требует обновления токена
        if (!originalRequest || originalRequest.skipRefresh || originalRequest._retry) {
            return Promise.reject(err);
        }

        // 401 Unauthorized
        if (err.response?.status === 401) {

            // Если токен уже обновляется, ставим запрос в очередь
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return instance(originalRequest);
                });
            }

            // Начинаем обновление токена
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // 1. Запрос на обновление токена (отмечен как skipRefresh: true)
                const { data } = await instance.post('/api/auth/refresh', null, { skipRefresh: true });
                localStorage.setItem('token', data.access_token);
                instance.defaults.headers.Authorization = `Bearer ${data.access_token}`;

                // 2. Выполняем все отложенные запросы
                processQueue(null, data.access_token);

                // 3. Повторяем оригинальный запрос с новым токеном
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                return instance(originalRequest);
            } catch (error) {
                // Ошибка обновления токена (refresh токен просрочен)
                processQueue(error, null);
                localStorage.removeItem('token');

                // Перенаправляем на страницу входа
                globalNavigate('/signin');
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(err);
    }
);

// --- ФУНКЦИИ ФОРМАТИРОВАНИЯ РЕЗУЛЬТАТОВ ДЛЯ InfoBlock (Оставлены без изменений) ---

const formatPingResponse = (responses, host) => {
    // Собираем результаты по агентам
    const results = responses.filter(r => r.success).map(r => r.result.latency_ms);
    const count = results.length;

    if (count === 0) {
        // Если нет успешных ответов, но запросы вернулись, ищем ошибку
        const errorResponse = responses.find(r => !r.success);
        return [{ label: 'Статус', value: errorResponse ? `Ошибка: ${errorResponse.error}` : 'Нет успешных ответов' }];
    }

    const min = Math.min(...results);
    const max = Math.max(...results);
    const avg = results.reduce((sum, val) => sum + val, 0) / count;

    return [
        { label: 'Host', value: host },
        { label: 'Агентов ответило', value: `${count} из ${responses.length}` },
        { label: 'Минимум (мс)', value: `${min.toFixed(2)}` },
        { label: 'Среднее (мс)', value: `${avg.toFixed(2)}` },
        { label: 'Максимум (мс)', value: `${max.toFixed(2)}` },
    ];
};

const formatHttpResponse = (responses, host) => {
    // Используем первый успешный ответ как основной
    const firstSuccess = responses.find(r => r.success);

    if (!firstSuccess) {
        const errorResponse = responses.find(r => !r.success);
        return [{ label: 'Статус', value: errorResponse ? `HTTP-ошибка: ${errorResponse.error}` : 'HTTP-ошибка' }];
    }

    const res = firstSuccess.result;
    const latency = firstSuccess.latency_ms.toFixed(2);
    const serverHeader = res.headers['Server'] || 'N/A';
    const contentType = res.headers['Content-Type'] || 'N/A';

    return [
        { label: 'Host', value: host },
        { label: 'Статус', value: `${res.status_code} ${res.redirected ? '(Перенаправлено)' : ''}` },
        { label: 'Время ответа (мс)', value: `${latency}` },
        { label: 'Сервер', value: serverHeader },
        { label: 'Content-Type', value: contentType },
        { label: 'Длина контента', value: `${res.content_length} байт` },
    ];
};

const formatTcpResponse = (responses, host, port) => {
    const successCount = responses.filter(r => r.success && r.result.success_connect).length;
    const totalCount = responses.length;

    // Собираем среднюю задержку для открытого порта
    const avgLatency = responses
        .filter(r => r.success && r.result.success_connect)
        .map(r => r.latency_ms)
        .reduce((sum, val, _, arr) => sum + val / arr.length, 0);

    let status;
    if (successCount === totalCount) {
        status = 'Полностью открыт';
    } else if (successCount > 0) {
        status = `Частично открыт (${successCount}/${totalCount})`;
    } else {
        status = 'Закрыт или фильтруется';
    }

    return [
        { label: 'Host', value: host },
        { label: 'Порт', value: String(port) || 'Не указан' },
        { label: 'Статус', value: status },
        { label: 'Средняя задержка (мс)', value: avgLatency > 0 ? avgLatency.toFixed(2) : 'N/A' },
    ];
};

const formatDnsResponse = (responses, host) => {
    // Используем первый успешный ответ, так как DNS обычно одинаков
    const firstSuccess = responses.find(r => r.success);

    if (!firstSuccess) {
        const errorResponse = responses.find(r => !r.success);
        return [{ label: 'Статус', value: errorResponse ? `DNS-ошибка: ${errorResponse.error}` : 'DNS-ошибка' }];
    }

    const res = firstSuccess.result;
    const aRecords = (res.a_records || []).join(', ');
    const mxRecords = (res.mx_records || []).map(r => r.split(' ')[0]).join(', ');

    return [
        { label: 'Host', value: host },
        { label: 'A Records', value: aRecords || 'N/A' },
        { label: 'AAAA Records', value: (res.aaaa_records || []).join(', ') || 'N/A' },
        { label: 'MX Records', value: mxRecords || 'N/A' },
        { label: 'NS Records', value: (res.ns_records || []).join(', ') || 'N/A' },
    ];
};


// 💡 НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ОБРАБОТКИ ОШИБОК API
// Возвращает форматированный объект ошибки для компонента InfoBlock
const formatErrorResult = (checkType, host) => {
    return {
        title: checkType.toUpperCase(),
        data: [
            { label: 'Host', value: host },
            { label: 'Статус', value: 'Не удалось получить данные от сервера.' },
            { label: 'Детали', value: 'Произошла ошибка сети или сервера.' },
        ],
        isPending: false,
    };
};


// --- ОСНОВНЫЕ ФУНКЦИИ API (Настоящие вызовы) ---

/**
 * Отправка POST-запроса для создания задачи проверки.
 * POST: /api/v1/check
 */
export const createCheck = async (host, checkType, port = 0) => {
    try {
        const payload = {
            request_type: checkType,
            host: host,
            // Порт используется только для TCP_CONNECT, иначе 0
            port: checkType === 'TCP_CONNECT' ? port : 0,
        };

        const response = await instance.post('/api/v1/check', payload);

        // API должен вернуть структуру с request_id
        return response.data;

    } catch (error) {
        console.error(`[API] Ошибка при создании задачи ${checkType}:`, error);
        // Бросаем ошибку, чтобы вызывающая сторона (MainContainer) могла ее поймать и показать сообщение
        throw new Error('Не удалось создать задачу на сервере.');
    }
};


/**
 * Отправка GET-запроса для получения результата проверки по ID.
 * GET: /api/v1/check/{task_id}
 */
export const getCheckResult = async (taskId, checkType, host, port) => {
    try {
        const response = await instance.get(`/api/v1/check/${taskId}`);
        const rawResult = response.data;

        // Если responses еще пуст, возвращаем флаг продолжения опроса
        if (!rawResult.responses || rawResult.responses.length === 0) {
            return {
                isPending: true, // Флаг, что нужно продолжать опрос
                title: checkType.toUpperCase(),
                data: [{ label: 'Статус', value: 'Ожидаем результат от агентов...' }]
            };
        }

        // Если ответы получены, форматируем и возвращаем готовый результат
        let formatter;
        let title = checkType.toUpperCase() + (checkType === 'TCP_CONNECT' ? ' SCAN' : ' STATUS');

        switch (checkType) {
            case 'PING':
                formatter = formatPingResponse;
                break;
            case 'HTTP':
                formatter = formatHttpResponse;
                break;
            case 'TCP_CONNECT':
                formatter = (responses) => formatTcpResponse(responses, host, port);
                break;
            case 'DNS':
                formatter = formatDnsResponse;
                break;
            default:
                // Если тип проверки не распознан, возвращаем ошибку
                return formatErrorResult(checkType, host);
        }

        const formattedData = formatter(rawResult.responses, host);

        return {
            isPending: false, // Флаг, что опрос можно остановить
            title: title,
            data: formattedData,
        };

    } catch (error) {
        console.error(`[API] Ошибка при получении результата ${taskId}:`, error);
        // В случае ошибки (например, 500, таймаут), возвращаем форматированный объект ошибки
        return formatErrorResult(checkType, host);
    }
};

// Экспортируем настроенный экземпляр axios по умолчанию
export default instance;