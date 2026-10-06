import axios from "axios";
import { getToken } from "../utils/storage";

// A free Render server sleeps after 15 idle minutes and takes up to a minute to wake, so wait long enough.
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
  timeout: 90000,
});

// ── Slow-server notice: ServerWakeBanner subscribes and shows a message while requests take long ──
const SLOW_AFTER_MS = 6000;
let pendingRequests = 0;
let slowTimer = null;
const slowListeners = new Set();

const setSlow = (slow) => slowListeners.forEach((listener) => listener(slow));

export const subscribeSlowServer = (listener) => {
  slowListeners.add(listener);
  return () => slowListeners.delete(listener);
};

const requestStarted = (config) => {
  if (config.quiet) return; // uploads and translations are slow on purpose
  pendingRequests += 1;
  if (pendingRequests === 1) slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
};

const requestFinished = (config) => {
  if (!config || config.quiet) return;
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) {
    clearTimeout(slowTimer);
    setSlow(false);
  }
};

api.interceptors.request.use(async (config) => {
  requestStarted(config);
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// AuthContext registers a handler that signs the user out when the token is rejected.
let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => {
    requestFinished(response.config);
    return response;
  },
  (error) => {
    requestFinished(error.config);
    const hadToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadToken && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

// For image uploads: React Native's FormData must reach the native layer untouched.
export const multipartConfig = {
  headers: { "Content-Type": "multipart/form-data" },
  transformRequest: (data) => data,
  timeout: 180000,
  quiet: true,
};

export default api;
