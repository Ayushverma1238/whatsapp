import axios from 'axios'
const apiUrl = `${import.meta.env.VITE_API_URL}/api`

const getToken = () => localStorage.getItem('auth_token')

const axiosInstance = axios.create({
    baseURL: apiUrl,
    // Since you are using LocalStorage and NOT Cookies, 
    // you usually set withCredentials to false for cross-site.
    withCredentials: false 
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