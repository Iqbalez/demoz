import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = "http://localhost:3001";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Guard variables to queue concurrent failed requests during active refresh cycles
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// 1. Request Interceptor: Attach current JWT access token dynamically
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("user_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Gracefully bypass in non-supported testing/simulation environments
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Capture 401 and trigger silent token rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Reject immediately if the error isn't a 401 or has already been retried
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Check if we are already fetching a new access token
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject: (err: any) => {
            reject(err);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Load stored refresh token
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      const phone = await SecureStore.getItemAsync("user_phone");

      if (!refreshToken || !phone) {
        throw new Error("No secure refresh token found. User must log in manually.");
      }

      // Hit token rotation route on backend NestJS
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
        refreshToken,
        phoneNumber: phone,
      });

      const { accessToken, newRefreshToken } = response.data;

      // Update local credentials
      await SecureStore.setItemAsync("user_token", accessToken);
      if (newRefreshToken) {
        await SecureStore.setItemAsync("refresh_token", newRefreshToken);
      }

      // Re-assign header to original request
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      // Flush queue of other pending requests with new token
      processQueue(null, accessToken);
      isRefreshing = false;

      // Re-execute original request
      return apiClient(originalRequest);
    } catch (refreshErr) {
      // Token rotation failed - force clean local logout
      processQueue(refreshErr, null);
      isRefreshing = false;

      try {
        await SecureStore.deleteItemAsync("user_token");
        await SecureStore.deleteItemAsync("refresh_token");
        await SecureStore.deleteItemAsync("user_phone");
      } catch (err) {
        // Silently bypass storage clearance errors
      }

      return Promise.reject(refreshErr);
    }
  }
);

export default apiClient;
