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

export default instance;