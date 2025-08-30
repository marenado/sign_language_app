import axios from "axios";

const api = axios.create({
  baseURL: "https://signlearn.onrender.com",
  withCredentials: true,
});

let triedRefreshOnce = false;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || "";

    const isAuthRoute =
      url.includes("/auth/refresh") || url.includes("/auth/login") ||
      url.includes("/auth/google")  || url.includes("/auth/facebook");

    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      if (!triedRefreshOnce) {
        triedRefreshOnce = true;
        try {
          await api.post("/auth/refresh");
          return api(original); // retry once
        } catch (_) { /* not logged in → fall through */ }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
