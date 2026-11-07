
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("exam_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url?.includes("/auth/me")
    ) {
      sessionStorage.removeItem("exam_token");
      sessionStorage.removeItem("exam_user");
    }

    return Promise.reject(error);
  }
);

export default api;

