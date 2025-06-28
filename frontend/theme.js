// theme.js
export const theme = {
    colors: {
        primary: '#7C5CBF', // Púrpura suave
        secondary: '#4A90E2', // Azul
        success: '#4CAF50', // Verde
        danger: '#FF5252', // Rojo
        warning: '#FFB74D', // Naranja
        info: '#2196F3', // Azul info
        background: {
            dark: '#121212', // Fondo principal
            card: '#1E1E1E', // Fondo de tarjetas
            elevated: '#2D2D2D', // Fondo elevado
        },
        text: {
            primary: '#FFFFFF', // Texto principal
            secondary: '#B3B3B3', // Texto secundario
            disabled: '#666666', // Texto deshabilitado
        },
        border: '#333333', // Bordes
        divider: '#2A2A2A', // Divisores
        surface: '#2A2A2A', // Superficie
        textSecondary: '#B3B3B3', // Alias para compatibilidad
        primaryLight: '#A478DF', // Variante clara del primario
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 16,
        xl: 24,
    },
    typography: {
        h1: {
            fontSize: 28,
            fontWeight: 'bold',
        },
        h2: {
            fontSize: 24,
            fontWeight: 'bold',
        },
        h3: {
            fontSize: 20,
            fontWeight: 'bold',
        },
        body: {
            fontSize: 16,
        },
        caption: {
            fontSize: 14,
        },
    },
};

// Componentes reutilizables con estilos consistentes
export const styles = {
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.dark,
        padding: theme.spacing.md,
    },
    card: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginVertical: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    button: {
        primary: {
            backgroundColor: theme.colors.primary,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
        },
        secondary: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
        },
    },
    buttonText: {
        primary: {
            color: theme.colors.text.primary,
            fontSize: theme.typography.body.fontSize,
            fontWeight: '600',
        },
        secondary: {
            color: theme.colors.primary,
            fontSize: theme.typography.body.fontSize,
            fontWeight: '600',
        },
    },
    input: {
        backgroundColor: theme.colors.background.elevated,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    title: {
        ...theme.typography.h2,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    subtitle: {
        ...theme.typography.h3,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
    },
};
