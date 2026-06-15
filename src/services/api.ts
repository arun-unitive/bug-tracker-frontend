import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// const API_URL = 'https://bug-tracker-backend-iouf.onrender.com/api/';
//const API_URL = 'http://localhost:5000/api/';
 export const SERVER_URL = 'https://bug-tracker-backend-iouf.onrender.com';
// export const SERVER_URL = 'http://localhost:5000';

 const API_URL = `${SERVER_URL}/api/`;

const api = axios.create({
  baseURL: API_URL,
});

console.log("API_URL is:", API_URL);

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const user = useAuthStore.getState().user;
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
