// screens/AddEditCardScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import api from '../utils/api';
import { theme, styles as globalStyles } from '../theme';

export default function AddEditCardScreen({ route, navigation }) {
    const { deckId, card } = route.params;
    const [front, setFront] = useState(card?.front || '');
    const [back, setBack] = useState(card?.back || '');
    const [tags, setTags] = useState(card?.tags?.join(', ') || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!front.trim()) {
            newErrors.front = 'El frente de la tarjeta es obligatorio';
        }
        if (!back.trim()) {
            newErrors.back = 'El reverso de la tarjeta es obligatorio';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const tagsArray = tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag !== '');

        setIsSubmitting(true);
        try {
            if (card) {
                await api.put(`/cards/${card.id}`, {
                    front,
                    back,
                    tags: tagsArray,
                });
            } else {
                await api.post(`/decks/${deckId}/cards`, {
                    front,
                    back,
                    tags: tagsArray,
                });
            }
            navigation.goBack();
        } catch (err) {
            console.error('Error al guardar tarjeta:', err);
            Alert.alert('Error', 'No se pudo guardar la tarjeta. Intente nuevamente.', [{ text: 'OK' }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={globalStyles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>Vista Previa</Text>
                        <View style={styles.cardPreview}>
                            <Text style={styles.previewText}>{front || 'Frente de la tarjeta...'}</Text>
                        </View>
                        <View style={[styles.cardPreview, styles.cardPreviewBack]}>
                            <Text style={styles.previewText}>{back || 'Reverso de la tarjeta...'}</Text>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Frente</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={front}
                                onChangeText={(text) => {
                                    setFront(text);
                                    setErrors((prev) => ({ ...prev, front: '' }));
                                }}
                                placeholder="Ingrese la pregunta o el frente de la tarjeta"
                                placeholderTextColor={theme.colors.text.disabled}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            {errors.front && <Text style={styles.errorText}>{errors.front}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Reverso</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={back}
                                onChangeText={(text) => {
                                    setBack(text);
                                    setErrors((prev) => ({ ...prev, back: '' }));
                                }}
                                placeholder="Ingrese la respuesta o el reverso de la tarjeta"
                                placeholderTextColor={theme.colors.text.disabled}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            {errors.back && <Text style={styles.errorText}>{errors.back}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Etiquetas</Text>
                            <TextInput
                                style={styles.input}
                                value={tags}
                                onChangeText={setTags}
                                placeholder="ej: matemáticas, álgebra, fórmulas (separadas por comas)"
                                placeholderTextColor={theme.colors.text.disabled}
                            />
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
                                        name={card ? 'save' : 'plus'}
                                        size={20}
                                        color={theme.colors.text.primary}
                                        style={styles.submitButtonIcon}
                                    />
                                    <Text style={styles.submitButtonText}>
                                        {card ? 'Actualizar Tarjeta' : 'Crear Tarjeta'}
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
    previewCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    previewTitle: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        marginBottom: theme.spacing.md,
    },
    cardPreview: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        minHeight: 80,
        justifyContent: 'center',
    },
    cardPreviewBack: {
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    previewText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        textAlign: 'center',
    },
    form: {
        flex: 1,
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
    input: {
        color: theme.colors.text.primary,
        padding: theme.spacing.md,
        fontSize: 16,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: theme.colors.danger,
    },
    errorText: {
        color: theme.colors.danger,
        fontSize: 14,
        marginTop: theme.spacing.xs,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginVertical: theme.spacing.lg,
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
