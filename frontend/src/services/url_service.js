import axios from 'axios'

const base = import.meta.env.VITE_API_URL.replace(/\/$/, ""); // Remove trailing slash if exists
const apiUrl = `${base}/api`;


const getToken = () => localStorage.getItem('auth_token')

const axiosInstance = axios.create({
    baseURL: apiUrl,
    // withCredentials: true 
})

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            // Modern Axios handles headers best like this:
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config; // ✅ CRITICAL: You must return the config object!
    },
    (error) => {
        return Promise.reject(error); // ✅ Handle interceptor errors
    }
);

export default axiosInstance;