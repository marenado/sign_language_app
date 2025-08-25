// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://signlearn.onrender.com",
  withCredentials: true, // send/receive HttpOnly cookies
});

// No request interceptor adding Authorization headers — cookies handle auth

// Auto-refresh on 401 (once), then retry the original request
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original || original._retry) return Promise.reject(error);

    if (error.response && error.response.status === 401) {
      try {
        original._retry = true;
        await api.post("/auth/refresh");        // uses refresh cookie
        return api(original);                   // retry with new access cookie
      } catch (e) {
        try { await api.post("/auth/logout"); } catch {}
        window.location.href = "/";             // back to login
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
