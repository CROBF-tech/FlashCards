import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { theme, styles as globalStyles } from '../theme';
import api from '../utils/api';

export default function ImportPdfScreen({ route, navigation }) {
    const { deckId, deckName } = route.params;
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [options, setOptions] = useState({
        cardCount: 10,
        difficulty: 'medium',
        focus: 'general',
    });
    const [importStatus, setImportStatus] = useState(null);
    const [showOptionsModal, setShowOptionsModal] = useState(false);

    useEffect(() => {
        if (importStatus && importStatus.id) {
            const interval = setInterval(() => {
                checkImportStatus(importStatus.id);
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [importStatus]);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                if (file.size > 10 * 1024 * 1024) {
                    Alert.alert('Error', 'El archivo es muy grande. Máximo 10MB permitido.');
                    return;
                }
                setSelectedFile(file);
            }
        } catch (error) {
            console.error('Error al seleccionar archivo:', error);
            Alert.alert('Error', 'No se pudo seleccionar el archivo');
        }
    };

    const uploadPdf = async () => {
        if (!selectedFile) {
            Alert.alert('Error', 'Por favor selecciona un archivo PDF');
            return;
        }

        setLoading(true);
        setProcessing(true);

        try {
            const formData = new FormData();
            formData.append('pdf', {
                uri: selectedFile.uri,
                type: 'application/pdf',
                name: selectedFile.name,
            });
            formData.append('deckId', deckId.toString());
            formData.append('cardCount', options.cardCount.toString());
            formData.append('difficulty', options.difficulty);
            formData.append('focus', options.focus);

            const response = await api.post('/pdf/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setImportStatus({
                    id: response.data.importId,
                    status: 'processing',
                    message: 'Procesando PDF...',
                });
            }
        } catch (error) {
            console.error('Error al subir PDF:', error);
            Alert.alert('Error', error.response?.data?.error || 'Error al procesar el PDF');
            setProcessing(false);
        } finally {
            setLoading(false);
        }
    };

    const checkImportStatus = async (importId) => {
        try {
            const response = await api.get(`/pdf/import/${importId}/status`);
            const status = response.data;

            setImportStatus((prev) => ({
                ...prev,
                ...status,
                message: getStatusMessage(status.status, status.cardsGenerated),
            }));

            if (status.status === 'completed') {
                setProcessing(false);
                Alert.alert('Éxito', `Se generaron ${status.cardsGenerated} flashcards exitosamente`, [
                    {
                        text: 'Ver Mazo',
                        onPress: () => navigation.goBack(),
                    },
                ]);
            } else if (status.status === 'failed') {
                setProcessing(false);
                Alert.alert('Error', status.errorMessage || 'Error al procesar el PDF');
            }
        } catch (error) {
            console.error('Error al verificar estado:', error);
        }
    };

    const getStatusMessage = (status, cardsGenerated) => {
        switch (status) {
            case 'processing':
                return 'Analizando contenido del PDF...';
            case 'generating':
                return 'Generando flashcards con IA...';
            case 'completed':
                return `¡Completado! ${cardsGenerated} flashcards generadas`;
            case 'failed':
                return 'Error en el procesamiento';
            default:
                return 'Procesando...';
        }
    };

    const difficultyOptions = [
        { value: 'easy', label: 'Fácil', description: 'Conceptos básicos y definiciones simples' },
        { value: 'medium', label: 'Medio', description: 'Balance entre conceptos y aplicaciones' },
        { value: 'hard', label: 'Difícil', description: 'Análisis profundo y pensamiento crítico' },
    ];

    const focusOptions = [
        { value: 'general', label: 'General', description: 'Contenido variado del documento' },
        { value: 'definitions', label: 'Definiciones', description: 'Enfoque en términos y conceptos' },
        { value: 'facts', label: 'Datos', description: 'Fechas, números y hechos específicos' },
        { value: 'concepts', label: 'Conceptos', description: 'Ideas principales y teorías' },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['bottom']}>
            <KeyboardAvoidingView
                style={globalStyles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Información del mazo */}
                    <View style={styles.deckInfo}>
                        <MaterialIcons name="folder" size={24} color={theme.colors.primary} />
                        <Text style={styles.deckName}>{deckName}</Text>
                    </View>

                    {!processing ? (
                        <View style={styles.formContainer}>
                            {/* Selección de archivo */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>1. Seleccionar PDF</Text>
                                <TouchableOpacity style={styles.fileSelector} onPress={pickDocument}>
                                    <AntDesign
                                        name={selectedFile ? 'checkcircle' : 'plus'}
                                        size={24}
                                        color={selectedFile ? theme.colors.success : theme.colors.primary}
                                    />
                                    <Text style={[styles.fileSelectorText, selectedFile && styles.selectedFileText]}>
                                        {selectedFile ? selectedFile.name : 'Toca para seleccionar archivo PDF'}
                                    </Text>
                                </TouchableOpacity>
                                {selectedFile && (
                                    <Text style={styles.fileSize}>
                                        Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </Text>
                                )}
                            </View>

                            {/* Opciones de generación */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>2. Opciones de Generación</Text>
                                <TouchableOpacity
                                    style={styles.optionsButton}
                                    onPress={() => setShowOptionsModal(true)}
                                >
                                    <View>
                                        <Text style={styles.optionsButtonTitle}>Configurar Opciones</Text>
                                        <Text style={styles.optionsButtonSubtitle}>
                                            {options.cardCount} tarjetas •{' '}
                                            {difficultyOptions.find((d) => d.value === options.difficulty)?.label} •
                                            {focusOptions.find((f) => f.value === options.focus)?.label}
                                        </Text>
                                    </View>
                                    <AntDesign name="right" size={16} color={theme.colors.text.secondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Botón de generar */}
                            <TouchableOpacity
                                style={[styles.submitButton, !selectedFile && styles.submitButtonDisabled]}
                                onPress={uploadPdf}
                                disabled={!selectedFile || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator
                                        color={theme.colors.text.primary}
                                        size="small"
                                        style={styles.submitButtonIcon}
                                    />
                                ) : (
                                    <MaterialIcons
                                        name="auto-awesome"
                                        size={24}
                                        color={theme.colors.text.primary}
                                        style={styles.submitButtonIcon}
                                    />
                                )}
                                <Text style={styles.submitButtonText}>Generar Flashcards con IA</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Estado de procesamiento */
                        <View style={styles.processingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.processingTitle}>Procesando PDF</Text>
                            <Text style={styles.processingMessage}>
                                {importStatus?.message || 'Analizando contenido...'}
                            </Text>
                            <View style={styles.processingSteps}>
                                <View style={styles.step}>
                                    <AntDesign name="checkcircle" size={20} color={theme.colors.success} />
                                    <Text style={styles.stepText}>PDF subido</Text>
                                </View>
                                <View style={styles.step}>
                                    <AntDesign
                                        name={importStatus?.status !== 'processing' ? 'checkcircle' : 'loading1'}
                                        size={20}
                                        color={
                                            importStatus?.status !== 'processing'
                                                ? theme.colors.success
                                                : theme.colors.primary
                                        }
                                    />
                                    <Text style={styles.stepText}>Extrayendo texto</Text>
                                </View>
                                <View style={styles.step}>
                                    <AntDesign
                                        name={importStatus?.status === 'completed' ? 'checkcircle' : 'loading1'}
                                        size={20}
                                        color={
                                            importStatus?.status === 'completed'
                                                ? theme.colors.success
                                                : theme.colors.text.secondary
                                        }
                                    />
                                    <Text style={styles.stepText}>Generando flashcards</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal de opciones */}
            <Modal
                visible={showOptionsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowOptionsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Opciones de Generación</Text>
                            <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                                <AntDesign name="close" size={24} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {/* Número de tarjetas */}
                            <View style={styles.optionGroup}>
                                <Text style={styles.optionLabel}>Número de Flashcards</Text>
                                <View style={styles.cardCountContainer}>
                                    {[5, 10, 15, 20, 25].map((count) => (
                                        <TouchableOpacity
                                            key={count}
                                            style={[
                                                styles.cardCountOption,
                                                options.cardCount === count && styles.cardCountOptionSelected,
                                            ]}
                                            onPress={() => setOptions((prev) => ({ ...prev, cardCount: count }))}
                                        >
                                            <Text
                                                style={[
                                                    styles.cardCountText,
                                                    options.cardCount === count && styles.cardCountTextSelected,
                                                ]}
                                            >
                                                {count}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Dificultad */}
                            <View style={styles.optionGroup}>
                                <Text style={styles.optionLabel}>Dificultad</Text>
                                {difficultyOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.optionItem,
                                            options.difficulty === option.value && styles.optionItemSelected,
                                        ]}
                                        onPress={() => setOptions((prev) => ({ ...prev, difficulty: option.value }))}
                                    >
                                        <View>
                                            <Text
                                                style={[
                                                    styles.optionItemTitle,
                                                    options.difficulty === option.value &&
                                                        styles.optionItemTitleSelected,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            <Text style={styles.optionItemDescription}>{option.description}</Text>
                                        </View>
                                        {options.difficulty === option.value && (
                                            <AntDesign name="checkcircle" size={20} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Enfoque */}
                            <View style={styles.optionGroup}>
                                <Text style={styles.optionLabel}>Enfoque</Text>
                                {focusOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.optionItem,
                                            options.focus === option.value && styles.optionItemSelected,
                                        ]}
                                        onPress={() => setOptions((prev) => ({ ...prev, focus: option.value }))}
                                    >
                                        <View>
                                            <Text
                                                style={[
                                                    styles.optionItemTitle,
                                                    options.focus === option.value && styles.optionItemTitleSelected,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            <Text style={styles.optionItemDescription}>{option.description}</Text>
                                        </View>
                                        {options.focus === option.value && (
                                            <AntDesign name="checkcircle" size={20} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveOptionsButton} onPress={() => setShowOptionsModal(false)}>
                            <Text style={styles.saveOptionsButtonText}>Guardar Configuración</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl * 2,
    },
    deckInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    deckName: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginLeft: theme.spacing.md,
    },
    formContainer: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: theme.spacing.xl,
    },
    label: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: theme.spacing.md,
    },
    fileSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        padding: theme.spacing.lg,
    },
    fileSelectorText: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    selectedFileText: {
        color: theme.colors.text.primary,
        fontWeight: '500',
    },
    fileSize: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: theme.spacing.sm,
    },
    optionsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
    },
    optionsButtonTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text.primary,
    },
    optionsButtonSubtitle: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
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
    processingContainer: {
        alignItems: 'center',
        padding: theme.spacing.xl * 2,
    },
    processingTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    processingMessage: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    processingSteps: {
        width: '100%',
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
    },
    stepText: {
        fontSize: 16,
        color: theme.colors.text.primary,
        marginLeft: theme.spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background.dark,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    optionGroup: {
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    cardCountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardCountOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.background.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    cardCountOptionSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    cardCountText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    cardCountTextSelected: {
        color: theme.colors.text.primary,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    optionItemSelected: {
        backgroundColor: theme.colors.background.elevated,
        borderColor: theme.colors.primary,
    },
    optionItemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text.primary,
    },
    optionItemTitleSelected: {
        color: theme.colors.primary,
    },
    optionItemDescription: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    saveOptionsButton: {
        backgroundColor: theme.colors.primary,
        margin: theme.spacing.lg,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    saveOptionsButtonText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});
