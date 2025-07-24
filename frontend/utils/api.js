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

        // Preservar el error original para que los componentes puedan manejarlo apropiadamente
        // Solo reescribir el mensaje si no hay información específica del servidor
        if (!error.response?.data?.error && !error.response?.data?.message && !error.response?.data?.code) {
            let message = error.response?.data?.message || 'Ha ocurrido un error. Por favor, intente nuevamente.';
            
            // Agregar información adicional para errores de red o timeout
            if (error.code === 'ECONNABORTED') {
                message = 'La conexión ha tardado demasiado. Verifica tu conexión a internet.';
            } else if (error.code === 'ERR_NETWORK') {
                message = 'Error de red. Verifica tu conexión a internet.';
            }
            
            // Registrar información detallada para depuración
            console.error('Error detallado:', {
                code: error.code,
                message: error.message,
                config: error.config ? {
                    url: error.config.url,
                    method: error.config.method,
                    timeout: error.config.timeout,
                } : 'No disponible'
            });
            
            return Promise.reject(new Error(message));
        }

        // Devolver el error original para preservar toda la información
        return Promise.reject(error);
    }
);

export default api;
