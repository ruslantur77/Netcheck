// src/utils/api.js
import axios from 'axios';

// ⚠️ ВАЖНО: В React нет глобального router.push(). 
// Мы создадим функцию, которая будет вызывать navigate() из компонента,
// где мы его используем. По умолчанию будет просто консольный вывод.
let globalNavigate = (path) => {
    console.error(`Router not initialized. Tried to navigate to: ${path}`);
    // В реальном приложении тут должно быть перенаправление на /signin
    // router.push({ name: 'Login' });
};

// Функция для установки навигации из React-компонента
export const setGlobalNavigator = (navigateFunction) => {
    globalNavigate = navigateFunction;
};
// ----------------------------------------------------------------------


const instance = axios.create({
  // Замените VITE_API_URL на REACT_APP_API_URL, если вы используете create-react-app.
  // Если вы используете Vite (что более вероятно), оставьте import.meta.env.VITE_API_URL.
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

// 1. Interceptor запроса: Добавляет токен из localStorage
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 2. Interceptor ответа: Логика обновления токена
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Игнорируем ошибки без ответа, ошибки с пометкой skipRefresh и уже повторенные запросы
    if (!originalRequest || originalRequest.skipRefresh || originalRequest._retry) {
      return Promise.reject(err);
    }
    
    // Если получаем 401 (Unauthorized)
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
      
      // Начинаем процесс обновления токена
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Выполняем запрос на обновление токена
        const { data } = await instance.post('/api/auth/refresh', null, { skipRefresh: true });
        
        // Обновляем токен в localStorage и заголовках
        localStorage.setItem('token', data.access_token);
        instance.defaults.headers.Authorization = `Bearer ${data.access_token}`;
        
        // Возобновляем все запросы из очереди
        processQueue(null, data.access_token);
        
        // Повторяем изначальный (оригинальный) запрос
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return instance(originalRequest);
      } catch (error) {
        // Если обновление токена не удалось, очищаем и перенаправляем на вход
        processQueue(error, null);
        localStorage.removeItem('token');
        globalNavigate('/signin'); // Используем нашу глобальную функцию навигации
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default instance;