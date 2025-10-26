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

// --- ФУНКЦИИ ФОРМАТИРОВАНИЯ РЕЗУЛЬТАТОВ ДЛЯ InfoBlock (Моки) ---

const formatPingResponse = (responses, host) => {
  // Собираем результаты по агентам
  const results = responses.filter(r => r.success).map(r => r.result.latency_ms);
  const count = results.length;

  if (count === 0) {
    return [{ label: 'Статус', value: 'Ошибка (нет ответов)' }];
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
    return [{ label: 'Статус', value: 'HTTP-ошибка' }];
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
  const successCount = responses.filter(r => r.result.success_connect).length;
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
    return [{ label: 'Статус', value: 'DNS-ошибка' }];
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

// --- ОСНОВНЫЕ ФУНКЦИИ-ЗАГЛУШКИ API (Моки) ---

// MOCK: POST /api/v1/check
export const createCheck = async (host, checkType, port = 0) => {
  await new Promise(resolve => setTimeout(resolve, 300));

  // Генерируем уникальный ID для каждой задачи
  const taskId = `task-${Math.random().toString(36).substring(2, 15)}`;

  console.log(`[API MOCK] Создание задачи: ${checkType} для ${host}:${port}`);

  // Возвращаем структуру с ID
  return {
    request_type: checkType,
    host: host,
    port: port,
    request_id: taskId,
    responses: [],
  };
};

// MOCK: GET /api/v1/check/{task_id}
export const getCheckResult = async (taskId, checkType, host, port) => {
  // Симулируем задержку сети / время выполнения задачи
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log(`[API MOCK] Получение результата для задачи ${taskId} (${checkType})`);

  // --- Моделируем данные ответа в зависимости от типа проверки ---
  let rawResult;
  let title;
  let formatter;

  switch (checkType) {
    case 'PING':
      rawResult = JSON.parse(`{ "request_type": "PING", "host": "${host}", "port": 0, "request_id": "${taskId}", "responses": [${JSON.stringify({ success: true, result: { latency_ms: 114.81 } })}, ${JSON.stringify({ success: true, result: { latency_ms: 117.56 } })}]}`);
      title = 'PING STATUS';
      formatter = formatPingResponse;
      break;
    case 'HTTP':
      rawResult = JSON.parse(`{ "request_type": "HTTP", "host": "${host}", "port": 0, "request_id": "${taskId}", "responses": [${JSON.stringify({ success: true, latency_ms: 868.49, result: { status_code: 200, redirected: true, content_length: 13496, headers: { "Server": "nginx", "Content-Type": "text/html" } } })}]}`);
      title = 'HTTP DETAILS';
      formatter = formatHttpResponse;
      break;
    case 'TCP_CONNECT':
      rawResult = JSON.parse(`{ "request_type": "TCP_CONNECT", "host": "${host}", "port": ${port}, "request_id": "${taskId}", "responses": [${JSON.stringify({ success: true, latency_ms: 211.05, result: { success_connect: true } })}, ${JSON.stringify({ success: true, latency_ms: 211.21, result: { success_connect: true } })}]}`);
      formatter = (responses) => formatTcpResponse(responses, host, port);
      title = 'TCP SCAN';
      break;
    case 'DNS':
      rawResult = JSON.parse(`{ "request_type": "DNS", "host": "${host}", "port": 0, "request_id": "${taskId}", "responses": [${JSON.stringify({ success: true, result: { a_records: ["77.88.44.242", "5.255.255.242"], mx_records: ["mx.yandex.ru (priority 10)"], ns_records: ["ns1.yandex.ru"], aaaa_records: ["2a02:6b8::2:242"] } })}]}`);
      title = 'DNS RECORDS';
      formatter = formatDnsResponse;
      break;
    default:
      return { title: 'ОШИБКА', data: [{ label: 'Ошибка', value: 'Неизвестный тип проверки' }] };
  }

  // Форматируем результат для InfoBlock
  const formattedData = formatter(rawResult.responses, host);

  return {
    title: title,
    data: formattedData,
  };
};

// Экспортируем настроенный экземпляр axios по умолчанию
export default instance;