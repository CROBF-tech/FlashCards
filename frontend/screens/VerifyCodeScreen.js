import React, { useState } from 'react';
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
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL } from '../config';
import { theme, styles as globalStyles } from '../theme';
import { AntDesign } from '@expo/vector-icons';

const VerifyCodeScreen = () => {
    const [resetCode, setResetCode] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigation = useNavigation();
    const route = useRoute();
    const { email } = route.params;

    const handleVerifyCode = async () => {
        if (!resetCode) {
            setMessage('Por favor, complete todos los campos');
            Alert.alert('Error', 'Por favor, complete todos los campos');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/user/verify-reset-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, resetCode }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                Alert.alert('Success', data.message);
                // Navigate to ResetPasswordScreen after successful code verification
                navigation.navigate('ResetPassword', { email: email, resetCode: resetCode });
            } else {
                setMessage(data.message);
                Alert.alert('Error', data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('Un error ha ocurrido. Por favor, intente nuevamente.');
            Alert.alert('Error', 'Un error ha ocurrido. Por favor, intente nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={globalStyles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.formContainer}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Verificar Código</Text>
                            <Text style={styles.headerSubtitle}>
                                Por favor, ingrese el código enviado a su correo electrónico
                            </Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.inputGroup}>
                                <View style={styles.inputHeader}>
                                    <AntDesign name="lock" size={20} color={theme.colors.secondary} />
                                    <Text style={styles.label}>Código de Reseteo</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    value={resetCode}
                                    onChangeText={(text) => {
                                        setResetCode(text);
                                        setMessage('');
                                    }}
                                    placeholder="Ingrese el código de reseteo"
                                    placeholderTextColor={theme.colors.text.disabled}
                                    keyboardType="number-pad"
                                />
                            </View>

                            {message ? (
                                <View style={styles.errorContainer}>
                                    <AntDesign name="exclamationcircle" size={16} color={theme.colors.danger} />
                                    <Text style={styles.errorText}>{message}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleVerifyCode}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color={theme.colors.text.primary} />
                                ) : (
                                    <Text style={styles.submitButtonText}>Verificar Código</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

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
});

export default VerifyCodeScreen;
