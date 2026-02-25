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

  let url = envUrl || 'https://srs-backend.pydah.edu.in/api';

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

// Helper function to create an upload request with progress tracking
export const uploadWithProgress = (url, formData, onUploadProgress) => {
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
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
