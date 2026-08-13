import axios from "axios";

const APP_ENV = (typeof process !== "undefined" && process.env?.REACT_APP_ENV) || import.meta.env.VITE_APP_ENV || "production"

let IMAGE_BASE_URL = "";
let BASE_URL = "";
let server = "";

switch (APP_ENV) {

  case "production":
    IMAGE_BASE_URL = "https://contactqube-backend.onrender.com/public";
    BASE_URL = "https://contactqube-backend.onrender.com/api/admin";
    server = "https://contactqube-backend.onrender.com";
    break;

  case "local":
  default:
    IMAGE_BASE_URL = "http://localhost:5000/public";
    BASE_URL = "http://localhost:5000/api/admin";
    server = "http://localhost:5000";
    break;
}

export { IMAGE_BASE_URL, BASE_URL, server };

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use(
  function (config) {
    const token = localStorage.getItem("userToken");

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    } else {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("networth_admin_session");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
