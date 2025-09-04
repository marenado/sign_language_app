import axios from 'axios';

const API_BASE = (
  import.meta.env?.VITE_API_BASE || 'https://signlearn.onrender.com'
).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,                     
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  timeout: 15000,
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    const status = error?.response?.status;
    const url = original?.url || '';

    const isAuthRoute =
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/google') ||
      url.includes('/auth/handoff') || 
      url.includes('/auth/facebook');

    const skipRefresh = original?.headers?.['x-skip-refresh'] === '1';

    
    if (status === 401 && !original._retry && !isAuthRoute && !skipRefresh) {
      original._retry = true;
      try {
        await api.post('/auth/refresh');    
        return api(original);               
      } catch {
      }
    }
    return Promise.reject(error);
  }
);

export default api;
