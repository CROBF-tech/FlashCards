import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { CONFIG } from '../config';

export const AuthContext = createContext({
    isAuthenticated: false,
    user: null,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
    signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem(CONFIG.tokenStorageKey);
            if (token) {
                const response = await api.get('/auth/user');
                setUser(response.data);
                setIsAuthenticated(true);
            }
        } catch (error) {
            await AsyncStorage.removeItem(CONFIG.tokenStorageKey);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        await AsyncStorage.setItem(CONFIG.tokenStorageKey, token);
        setUser(user);
        setIsAuthenticated(true);
        return user;
    };

    const register = async (username, email, password) => {
        const response = await api.post('/auth/register', {
            username,
            email,
            password,
        });
        const { token, user } = response.data;
        await AsyncStorage.setItem(CONFIG.tokenStorageKey, token);
        setUser(user);
        setIsAuthenticated(true);
        return user;
    };

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        delete axios.defaults.headers.common['x-auth-token'];
        setUser(null);
        setIsAuthenticated(false);
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem(CONFIG.tokenStorageKey);
            setUser(null);
            setIsAuthenticated(false);
            // Limpiar el header de autorización en las peticiones API
            delete api.defaults.headers.common['Authorization'];
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
    };

    if (loading) {
        return null; // O un componente de carga
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user,
                loading,
                login,
                register,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    return useContext(AuthContext);
}
