// src/utils/api.js

import axios from 'axios';


let globalNavigate = (path) => {
    console.error(`Router not initialized. Tried to navigate to: ${path}`);
};


export const setGlobalNavigator = (navigateFunction) => {
    globalNavigate = navigateFunction;
};


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

instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});


instance.interceptors.response.use(
    (res) => res,
    async (err) => {
        const originalRequest = err.config;

        if (!originalRequest || originalRequest.skipRefresh || originalRequest._retry) {
            return Promise.reject(err);
        }

        if (err.response?.status === 401) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return instance(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await instance.post('/api/auth/refresh', null, { skipRefresh: true });
                localStorage.setItem('token', data.access_token);
                instance.defaults.headers.Authorization = `Bearer ${data.access_token}`;
                processQueue(null, data.access_token);
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                return instance(originalRequest);
            } catch (error) {
                processQueue(error, null);
                localStorage.removeItem('token');
                globalNavigate('/signin');
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(err);
    }
);

const formatPingResponse = (responses, host) => {
    const results = responses.filter(r => r.success).map(r => r.result.latency_ms);
    const count = results.length;

    if (count === 0) {
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



/**
 * Отправка POST-запроса для создания задачи проверки.
 * POST: /api/v1/check
 */
export const createCheck = async (host, checkType, port = 0) => {
    try {
        const payload = {
            request_type: checkType,
            host: host,
            port: checkType === 'TCP_CONNECT' ? port : 0,
        };

        const response = await instance.post('/api/v1/check', payload);

        return response.data;

    } catch (error) {
        console.error(`[API] Ошибка при создании задачи ${checkType}:`, error);
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

        if (!rawResult.responses || rawResult.responses.length === 0) {
            return {
                isPending: true, // Флаг, что нужно продолжать опрос
                title: checkType.toUpperCase(),
                data: [{ label: 'Статус', value: 'Ожидаем результат от агентов...' }]
            };
        }

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
                return formatErrorResult(checkType, host);
        }

        const formattedData = formatter(rawResult.responses, host);

        return {
            isPending: false, 
            title: title,
            data: formattedData,
        };

    } catch (error) {
        console.error(`[API] Ошибка при получении результата ${taskId}:`, error);
        return formatErrorResult(checkType, host);
    }
};

export default instance;