// App.js
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { theme } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DeckScreen from './screens/DeckScreen';
import StudyScreen from './screens/StudyScreen';
import AddEditDeckScreen from './screens/AddEditDeckScreen';
import AddEditCardScreen from './screens/AddEditCardScreen';
import SearchScreen from './screens/SearchScreen';
import StatsScreen from './screens/StatsScreen';

const Stack = createNativeStackNavigator();

// Configuración del tema oscuro para la navegación
const NavigationDarkTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: theme.colors.background.dark,
        card: theme.colors.background.card,
        text: theme.colors.text.primary,
        border: theme.colors.border,
    },
};

// Configuración común para las pantallas
const screenOptions = {
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

function Navigation() {
    const { isAuthenticated } = useAuth();

    return (
        <Stack.Navigator screenOptions={screenOptions}>
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Mis Mazos' }} />
                    <Stack.Screen
                        name="Deck"
                        component={DeckScreen}
                        options={({ route }) => ({ title: route.params.deckName })}
                    />
                    <Stack.Screen name="Study" component={StudyScreen} options={{ title: 'Estudiar' }} />
                    <Stack.Screen
                        name="AddEditDeck"
                        component={AddEditDeckScreen}
                        options={({ route }) => ({
                            title: route.params?.deck ? 'Editar Mazo' : 'Nuevo Mazo',
                        })}
                    />
                    <Stack.Screen
                        name="AddEditCard"
                        component={AddEditCardScreen}
                        options={({ route }) => ({
                            title: route.params?.card ? 'Editar Tarjeta' : 'Nueva Tarjeta',
                        })}
                    />
                    <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Buscar' }} />
                    <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'Estadísticas' }} />
                </>
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer theme={NavigationDarkTheme}>
                <StatusBar style="light" />
                <Navigation />
            </NavigationContainer>
        </AuthProvider>
    );
}
