import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { theme } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DeckScreen from './screens/DeckScreen';
import StudyScreen from './screens/StudyScreen';
import AddEditDeckScreen from './screens/AddEditDeckScreen';
import AddEditCardScreen from './screens/AddEditCardScreen';
import SearchScreen from './screens/SearchScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import VerifyCodeScreen from './screens/VerifyCodeScreen';

// Solo importar en web:
let BrowserRouter, Routes, Route;
if (Platform.OS === 'web') {
    const routerDom = require('react-router-dom');
    BrowserRouter = routerDom.BrowserRouter;
    Routes = routerDom.Routes;
    Route = routerDom.Route;
}

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
        height: 80,
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
                    <Stack.Screen
                        name="ForgotPassword"
                        component={ForgotPasswordScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} options={{ headerShown: false }} />
                    <Stack.Screen
                        name="ResetPassword"
                        component={ResetPasswordScreen}
                        options={{ headerShown: false }}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={({ navigation }) => ({
                            title: 'FlashCards',
                            headerRight: () => (
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Settings')}
                                    style={{
                                        padding: 10,
                                        marginRight: -10,
                                    }}
                                >
                                    <AntDesign name="setting" size={24} color={theme.colors.text.primary} />
                                </TouchableOpacity>
                            ),
                        })}
                    />
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
                    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
                </>
            )}
        </Stack.Navigator>
    );
}
// App con react-navigation
function AppWithNavigation() {
    const [fontsLoaded, setFontsLoaded] = useState(false);

    useEffect(() => {
        async function loadFonts() {
            try {
                await Font.loadAsync({
                    anticon: require('./assets/fonts/AntDesign.ttf'),
                });
                console.log('Fonts loaded successfully');
                setFontsLoaded(true);
            } catch (e) {
                console.error('Error loading fonts:', e);
                // En caso de error, permitimos que la app continúe
                setFontsLoaded(true);
            }
        }

        loadFonts();
    }, []);

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <AuthProvider>
            <SafeAreaProvider>
                <NavigationContainer theme={NavigationDarkTheme}>
                    <StatusBar style="light" />
                    <Navigation />
                </NavigationContainer>
            </SafeAreaProvider>
        </AuthProvider>
    );
}

// Export final
export default function App() {
    if (Platform.OS === 'web') {
        return (
            <BrowserRouter>
                <Routes>
                    <Route path="/politicadeprivacidad" element={<PrivacyPolicyScreen />} />
                    <Route path="*" element={<AppWithNavigation />} />
                </Routes>
            </BrowserRouter>
        );
    }

    return <AppWithNavigation />;
}
