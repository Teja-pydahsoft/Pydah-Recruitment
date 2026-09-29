import axios from 'axios';

const getBaseUrl = () => {
  // Check for env variable from CRA (process.env) or Vite (import.meta.env)
  let envUrl = '';
  if (typeof process !== 'undefined' && process.env) {
    envUrl = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.VITE_API_BASE_URL;
  }
  try {
    if (!envUrl && typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_URL;
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }

  const isLocalHost = (() => {
    if (typeof window === 'undefined' || !window.location) return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  })();

  // Prefer local backend while running frontend locally, unless env explicitly overrides.
  let url = envUrl || (isLocalHost ? 'http://localhost:5000/api' : 'https://srs.pydah.edu.in/api');

  // Fix: If user strictly provides a domain without http:// or https:// in env file,
  // Axios will treat it as a relative path resulting in a 404/403.
  if (url && !/^https?:\/\//i.test(url)) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      url = 'http://' + url;
    } else {
      url = 'https://' + url;
    }
  }

  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

const API_BASE_URL = getBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory cache for fast section transitions & request deduplication
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds fresh cache

export const clearApiCache = () => {
  apiCache.clear();
};

const invalidateCache = () => {
  apiCache.clear();
};

const originalPost = api.post;
const originalPut = api.put;
const originalDelete = api.delete;
const originalPatch = api.patch;

api.post = function (...args) {
  invalidateCache();
  return originalPost.apply(this, args);
};
api.put = function (...args) {
  invalidateCache();
  return originalPut.apply(this, args);
};
api.delete = function (...args) {
  invalidateCache();
  return originalDelete.apply(this, args);
};
api.patch = function (...args) {
  invalidateCache();
  return originalPatch.apply(this, args);
};

const originalGet = api.get;
api.get = function (url, config = {}) {
  // Option to explicitly bypass cache (e.g., manual refresh buttons)
  if (config.skipCache || config.headers?.['x-skip-cache']) {
    return originalGet.call(this, url, config);
  }

  const cacheKey = `${url}_${JSON.stringify(config.params || {})}`;
  const now = Date.now();
  const cached = apiCache.get(cacheKey);

  // Return cached result if within TTL
  if (cached && cached.response && (now - cached.timestamp < CACHE_TTL)) {
    return Promise.resolve({
      ...cached.response,
      data: cached.response.data
    });
  }

  // Deduplicate concurrent in-flight requests for the exact same endpoint
  if (cached && cached.inFlight) {
    return cached.inFlight;
  }

  const requestPromise = originalGet.call(this, url, config)
    .then((response) => {
      apiCache.set(cacheKey, {
        timestamp: Date.now(),
        response,
        inFlight: null
      });
      return response;
    })
    .catch((error) => {
      apiCache.delete(cacheKey);
      throw error;
    });

  apiCache.set(cacheKey, {
    timestamp: now,
    inFlight: requestPromise
  });

  return requestPromise;
};

// Helper function to create an upload request with progress tracking
export const uploadWithProgress = (url, formData, onUploadProgress) => {
  invalidateCache();
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    }
  });
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = (error.response?.data?.message || '').toLowerCase();

    // Check if error is 401 Unauthorized or 403 with token expiration/auth failure messages
    const isAuthError =
      status === 401 ||
      (status === 403 &&
        (message.includes('expired') ||
          message.includes('invalid') ||
          message.includes('token') ||
          message.includes('authentication required')));

    if (isAuthError) {
      console.warn('[API Interceptor] Auth session expired or failed. Triggering automatic logout.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('dashboard_cache_data');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
