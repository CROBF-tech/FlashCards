import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme, styles as globalStyles } from '../theme';
import { isMobile } from 'react-device-detect';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showAppModal, setShowAppModal] = useState(false);
    const { login } = useAuth();

    useEffect(() => {
        // Mostrar el modal solo en dispositivos móviles
        if (isMobile && Platform.OS === 'web') {
            setShowAppModal(true);
        }
    }, []);

    const handleSubmit = async () => {
        if (!email || !password) {
            setError('Por favor, complete todos los campos');
            return;
        }

        setIsSubmitting(true);
        try {
            await login(email, password);
        } catch (error) {
            setError(error.response?.data?.error || 'Error al iniciar sesión');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openAPKDownload = () => {
        const apkUrl = '/apk/flashcard1.5.apk'; // Adjust the path as needed
        Linking.openURL(apkUrl);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={globalStyles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.formContainer}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Bienvenido</Text>
                            <Text style={styles.headerSubtitle}>Inicia sesión para continuar</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.inputGroup}>
                                <View style={styles.inputHeader}>
                                    <AntDesign name="mail" size={20} color={theme.colors.secondary} />
                                    <Text style={styles.label}>Email</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        setError('');
                                    }}
                                    placeholder="Ingrese su email"
                                    placeholderTextColor={theme.colors.text.disabled}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputHeader}>
                                    <AntDesign name="lock" size={20} color={theme.colors.secondary} />
                                    <Text style={styles.label}>Contraseña</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setError('');
                                    }}
                                    placeholder="Ingrese su contraseña"
                                    placeholderTextColor={theme.colors.text.disabled}
                                    secureTextEntry
                                />
                            </View>

                            {error ? (
                                <View style={styles.errorContainer}>
                                    <AntDesign name="exclamationcircle" size={16} color={theme.colors.danger} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color={theme.colors.text.primary} />
                                ) : (
                                    <Text style={styles.submitButtonText}>Iniciar Sesión</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.linkButtonText}>¿Olvidaste tu contraseña?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.linkButtonText}>¿No tienes cuenta? Regístrate</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal para recomendar la app */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showAppModal}
                onRequestClose={() => setShowAppModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>¡Descarga nuestra app!</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setShowAppModal(false)}>
                                <AntDesign name="close" size={24} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalText}>
                            Disfruta de una mejor experiencia descargando nuestra aplicación móvil desde Google Play
                            Store.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.downloadButton]}
                                onPress={openAPKDownload}
                            >
                                <Text style={styles.downloadButtonText}>Descargar APK</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowAppModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Más tarde</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        backgroundColor: theme.colors.background.dark,
    },
    formContainer: {
        flex: 1,
        padding: theme.spacing.md,
        justifyContent: 'center',
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    headerTitle: {
        ...theme.typography.h1,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
        color: theme.colors.text.secondary,
        fontSize: 16,
    },
    card: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    label: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.sm,
        fontSize: 16,
    },
    input: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        color: theme.colors.text.primary,
        fontSize: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${theme.colors.danger}20`,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    errorText: {
        color: theme.colors.danger,
        marginLeft: theme.spacing.sm,
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkButton: {
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    linkButtonText: {
        color: theme.colors.secondary,
        paddingTop: theme.spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        ...theme.typography.h3,
        color: theme.colors.text.primary,
    },
    closeButton: {
        padding: 5,
    },
    modalText: {
        color: theme.colors.text.secondary,
        fontSize: 16,
        marginBottom: theme.spacing.lg,
        lineHeight: 24,
    },
    modalButtons: {
        flexDirection: 'column',
        gap: theme.spacing.sm,
    },
    modalButton: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadButton: {
        backgroundColor: theme.colors.primary,
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    downloadButtonText: {
        color: theme.colors.text.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButtonText: {
        color: theme.colors.text.secondary,
        fontSize: 16,
    },
});
