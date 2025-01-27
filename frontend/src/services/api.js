import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // Backend API URL
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration and refresh logic
api.interceptors.response.use(
  (response) => response, // Return the response if successful
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is due to an expired access token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          // Request a new access token using the refresh token
          const response = await axios.post("http://127.0.0.1:8000/auth/refresh", {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;

          // Update tokens in localStorage
          localStorage.setItem("authToken", access_token);

          // Update Authorization header and retry original request
          originalRequest.headers["Authorization"] = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError);
          localStorage.clear(); // Clear all tokens
          window.location.href = "/"; // Redirect to login
        }
      } else {
        console.error("No refresh token available.");
        localStorage.clear(); // Clear all tokens
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
