/**
 * api/axios.js
 *
 * Axios instance with base URL and interceptors.
 *
 * Request interceptor:  Automatically attaches JWT from localStorage.
 * Response interceptor: Handles 401 (token expired) → redirects to login.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Attach JWT ───────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('af_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle 401 ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear and redirect
      localStorage.removeItem('af_token');
      localStorage.removeItem('af_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
