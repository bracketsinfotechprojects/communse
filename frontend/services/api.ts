import axios, { AxiosResponse, AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      switch (status) {
        case 401:
          // Handle unauthorized - e.g., redirect to login
          console.error('Unauthorized access');
          // You can dispatch an action here to logout
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Internal server error');
          break;
        default:
          console.error(`API error: ${status}`);
      }
    } else if (error.request) {
      console.error('Network error');
    } else {
      console.error('Request error', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;