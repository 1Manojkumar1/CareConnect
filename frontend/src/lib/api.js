import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: false,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const requestId =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
  if (requestId) config.headers['X-Request-Id'] = requestId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    if (status === 401 && code !== 'INVALID_CREDENTIALS') {
      localStorage.removeItem('cc_token');
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new CustomEvent('cc:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'The server took too long to respond. Please check your connection and try again.';
  }
  if (error?.message === 'Network Error' || (!error?.response && error?.request)) {
    return 'Unable to reach the CareConnect server. Please check your internet connection.';
  }
  return error?.response?.data?.error?.message || error?.message || fallback;
}

export { api };
export default api;
