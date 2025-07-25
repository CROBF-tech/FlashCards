// screens/AddEditDeckScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import WebAlert from '../components/WebAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import api from '../utils/api';
import { theme, styles as globalStyles } from '../theme';

export default function AddEditDeckScreen({ route, navigation }) {
    const existingDeck = route.params?.deck;
    const [name, setName] = useState(existingDeck?.name || '');
    const [description, setDescription] = useState(existingDeck?.description || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const validate = () => {
        if (!name.trim()) {
            setError('El nombre del mazo es obligatorio');
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            if (existingDeck) {
                await api.put(`/decks/${existingDeck.id}`, { name, description });
            } else {
                await api.post('/decks', { name, description });
            }
            navigation.goBack();
        } catch (err) {
            console.error('Error al guardar mazo:', err);
            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Error', 'No se pudo guardar el mazo. Intente nuevamente.', [{ text: 'OK' }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['bottom']}>
            <KeyboardAvoidingView
                style={globalStyles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre del Mazo</Text>
                            <View style={styles.inputContainer}>
                                <AntDesign
                                    name="folder1"
                                    size={20}
                                    color={theme.colors.text.secondary}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={(text) => {
                                        setName(text);
                                        setError('');
                                    }}
                                    placeholder="Ingrese el nombre del mazo"
                                    placeholderTextColor={theme.colors.text.disabled}
                                />
                            </View>
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Descripción (opcional)</Text>
                            <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                <AntDesign
                                    name="filetext1"
                                    size={20}
                                    color={theme.colors.text.secondary}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Ingrese una descripción"
                                    placeholderTextColor={theme.colors.text.disabled}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={theme.colors.text.primary} />
                            ) : (
                                <>
                                    <AntDesign
                                        name={existingDeck ? 'save' : 'plus'}
                                        size={20}
                                        color={theme.colors.text.primary}
                                        style={styles.submitButtonIcon}
                                    />
                                    <Text style={styles.submitButtonText}>
                                        {existingDeck ? 'Actualizar Mazo' : 'Crear Mazo'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },
    formContainer: {
        flex: 1,
        padding: theme.spacing.md,
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
        fontSize: 16,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inputIcon: {
        padding: theme.spacing.md,
    },
    input: {
        flex: 1,
        color: theme.colors.text.primary,
        paddingVertical: theme.spacing.md,
        paddingRight: theme.spacing.md,
        fontSize: 16,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
    },
    textArea: {
        height: 120,
        paddingTop: theme.spacing.md,
    },
    errorText: {
        color: theme.colors.danger,
        marginTop: theme.spacing.sm,
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.xl,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonIcon: {
        marginRight: theme.spacing.sm,
    },
    submitButtonText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});
