import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, CONFIG } from '../config';

const api = axios.create({
    baseURL: API_URL,
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem(CONFIG.tokenStorageKey);
        if (token) {
            config.headers[CONFIG.tokenHeaderKey] = token;
        }
        return config;
    } catch (error) {
        return Promise.reject(error);
    }
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem(CONFIG.tokenStorageKey);
            // Aquí podrías disparar un evento para redirigir al usuario al login
        }
        // Extract the message from the error response
        const message = error.response?.data?.message || 'A ocurrido un error. Por favor, intente nuevamente.';
        return Promise.reject(new Error(message));
    }
);

export default api;
