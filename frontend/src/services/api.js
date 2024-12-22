import axios from "axios";

const API_URL = "http://127.0.0.1:8000"; // Your backend URL

// Axios instance with default settings
const api = axios.create({
  baseURL: API_URL,
});

// Add token to headers for authenticated requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// API Endpoints
export const registerUser = (userData) => api.post("/users/", userData);
export const loginUser = (credentials) => api.post("/auth/login", credentials);

export default api;
