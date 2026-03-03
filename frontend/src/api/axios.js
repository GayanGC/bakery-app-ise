import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Change as per backend port (usually 5000)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add JWT token from localStorage to headers on every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // Typical Bearer format
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
