// config/navigation.js
import { Platform } from 'react-native';
import { theme } from '../theme';

// Configuración específica para diferentes plataformas
export const getNavigationConfig = () => {
    const baseConfig = {
        headerStyle: {
            backgroundColor: theme.colors.background.card,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
            fontWeight: 'bold',
        },
        contentStyle: {
            backgroundColor: theme.colors.background.dark,
        },
    };

    // Configuraciones específicas por plataforma
    if (Platform.OS === 'ios') {
        return {
            ...baseConfig,
            headerLargeStyle: {
                backgroundColor: theme.colors.background.card,
            },
        };
    }

    if (Platform.OS === 'android') {
        return {
            ...baseConfig,
            headerShadowVisible: false,
        };
    }

    // Web y otras plataformas
    return baseConfig;
};

// Configuración de la status bar
export const getStatusBarConfig = () => {
    if (Platform.OS === 'ios') {
        return {
            style: 'light',
            backgroundColor: theme.colors.background.card,
        };
    }

    if (Platform.OS === 'android') {
        return {
            style: 'light',
            backgroundColor: theme.colors.background.card,
            translucent: false,
        };
    }

    return {
        style: 'light',
        backgroundColor: theme.colors.background.card,
    };
};
