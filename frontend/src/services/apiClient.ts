/**
 * NWIS API Client
 * ================
 * Centralized axios instance for all backend API calls.
 * Base URL configured from environment variable — never hardcoded.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — centralised error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server returned an error response
      console.error(`[NWIS API] ${error.response.status} ${error.response.config?.url}:`, error.response.data);
    } else if (error.request) {
      // Request made but no response — likely backend is down
      console.error('[NWIS API] No response from backend. Is it running?', error.request);
    } else {
      console.error('[NWIS API] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
