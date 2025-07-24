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
import WebAlert from '../components/WebAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { theme, styles as globalStyles } from '../theme';
import api from '../utils/api';
import { validatePdfFile, formatFileSize, getOptimizationSuggestions } from '../utils/pdfUtils';

export default function ImportPdfScreen({ route, navigation }) {
    const { deckId, deckName } = route.params;
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [options, setOptions] = useState({
        cardCount: 10,
        difficulty: 'medium',
        focus: 'general',
    });
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        // Verificar conectividad con el backend al montar el componente
        const checkBackendConnection = async () => {
            try {
                console.log('Verificando conexión con el backend...');
                const response = await api.get('/health');
                console.log('Backend conectado:', response.data);
            } catch (error) {
                console.warn('Error al conectar con el backend:', error.message);
                console.warn('Esto puede indicar problemas de conectividad');
            }
        };

        checkBackendConnection();
    }, []);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];

                // Validar archivo usando las nuevas utilidades
                const validation = validatePdfFile(file);

                if (!validation.isValid) {
                    // Usar WebAlert en web y Alert nativo en otras plataformas
                    const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
                    AlertToUse.alert('Error', validation.errors.join('\n'));
                    return;
                }

                setSelectedFile(file);

                // Mostrar sugerencias de optimización si las hay
                const suggestions = getOptimizationSuggestions(file);
                if (suggestions.length > 0) {
                    console.log('Sugerencias de optimización:', suggestions);
                }
            }
        } catch (error) {
            console.error('Error al seleccionar archivo:', error);
            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Error', 'No se pudo seleccionar el archivo');
        }
    };

    const uploadPdf = async () => {
        if (!selectedFile) {
            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Error', 'Por favor selecciona un archivo PDF');
            return;
        }

        // Validación adicional del archivo
        if (!selectedFile.uri) {
            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Error', 'Archivo inválido. Por favor selecciona otro archivo.');
            return;
        }

        // Verificar que deckId sea válido
        if (!deckId || isNaN(deckId)) {
            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Error', 'ID del mazo inválido. Por favor intenta nuevamente.');
            return;
        }

        setLoading(true);

        try {
            // Crear FormData específico para React Native/Web
            const formData = new FormData();

            // Diferente manejo para Web vs React Native
            if (Platform.OS === 'web') {
                // En Web, necesitamos crear un File object
                try {
                    const response = await fetch(selectedFile.uri);
                    const blob = await response.blob();
                    const file = new File([blob], selectedFile.name || 'document.pdf', {
                        type: selectedFile.mimeType || 'application/pdf',
                    });
                    formData.append('pdf', file);
                    console.log('Archivo agregado para Web:', file);
                } catch (fetchError) {
                    console.error('Error al convertir archivo para Web:', fetchError);
                    throw new Error('No se pudo procesar el archivo para upload');
                }
            } else {
                // En React Native móvil
                // Asegurarse de que todos los campos necesarios estén presentes
                const fileData = {
                    uri: selectedFile.uri,
                    type: selectedFile.mimeType || 'application/pdf',
                    name: selectedFile.name || 'document.pdf',
                    // Agregar estos campos adicionales para asegurar compatibilidad
                    size: selectedFile.size,
                };

                // En React Native, el campo debe llamarse exactamente igual que en el backend (pdf)
                formData.append('pdf', fileData);

                // Verificar que la URI es absoluta y accesible
                if (!selectedFile.uri.startsWith('file://') && !selectedFile.uri.startsWith('content://')) {
                    console.warn('La URI del archivo no parece ser una ruta absoluta:', selectedFile.uri);
                }

                console.log('Archivo agregado para React Native móvil:', fileData);
            }

            // Agregar otros campos como strings
            formData.append('deckId', String(deckId));
            formData.append('cardCount', String(options.cardCount));
            formData.append('difficulty', String(options.difficulty));
            formData.append('focus', String(options.focus));

            console.log('Enviando PDF al backend:', {
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                mimeType: selectedFile.mimeType,
                uri: selectedFile.uri,
                deckId: deckId,
                options: options,
                platform: Platform.OS,
            });

            // Debug del FormData (solo para desarrollo)
            console.log('FormData creado con:');
            console.log('- Archivo:', selectedFile.name, selectedFile.size, 'bytes');
            console.log('- DeckId:', deckId);
            console.log('- Opciones:', options);
            console.log('- Plataforma:', Platform.OS);

            // Verificar que el FormData contiene el archivo
            console.log('Verificando contenido del FormData...');
            debugFormData(formData);

            // Verificar que el archivo tiene URI válida
            if (!selectedFile.uri || selectedFile.uri.trim() === '') {
                throw new Error('El archivo seleccionado no tiene una URI válida');
            }

            // Hacer la petición con configuración optimizada para React Native
            console.log('Enviando petición a:', '/pdf/upload');
            console.log('Base URL del API:', api.defaults.baseURL);
            console.log('URL completa:', api.defaults.baseURL + '/pdf/upload');

            // Configuración específica para dispositivos móviles
            const headers = {
                Accept: 'application/json',
            };

            // En Android, a veces es necesario establecer explícitamente el Content-Type
            if (Platform.OS === 'android') {
                headers['Content-Type'] = 'multipart/form-data';
            }

            console.log('Headers de la petición:', headers);

            const response = await api.post('/pdf/upload', formData, {
                headers: headers,
                timeout: 120000, // 2 minutos para archivos grandes
            });

            console.log('Respuesta del servidor:', response.data);

            if (response.data.success) {
                // Procesamiento completado exitosamente
                setSuccessData({
                    cardsGenerated: response.data.cardsGenerated,
                    fileName: selectedFile.name,
                });
                setShowSuccessMessage(true);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error al subir PDF (completo):', error);
            console.error('Error response:', error.response);
            console.error('Error request:', error.request);
            console.error('Error config:', error.config);

            // Manejo mejorado de errores del backend
            let errorMessage = 'Error al procesar el PDF';
            let statusCode = null;

            // Información específica de la plataforma para depuración
            console.error('Error en plataforma:', Platform.OS);
            console.error('Versión de plataforma:', Platform.Version);

            // Obtener información más detallada del error
            if (error.response) {
                // El servidor respondió con un código de error
                statusCode = error.response.status;
                console.error('Status Code:', statusCode);
                console.error('Response Data:', error.response.data);
                console.error('Response Headers:', error.response.headers);

                if (error.response.data?.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.request) {
                // La petición se hizo pero no hubo respuesta
                console.error('No response received:', error.request);
                errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';

                // Errores específicos para dispositivos móviles
                if (Platform.OS === 'android' || Platform.OS === 'ios') {
                    errorMessage =
                        'No se pudo conectar al servidor. Verifica tu conexión a internet y asegúrate de que la aplicación tenga permisos para acceder a archivos.';
                }
            } else {
                // Error en la configuración de la petición
                console.error('Request setup error:', error.message);
                if (error.message) {
                    errorMessage = error.message;
                }

                // Errores específicos para FormData en dispositivos móviles
                if (error.message?.includes('FormData') || error.message?.includes('form-data')) {
                    errorMessage = 'Error al preparar el archivo para envío. Por favor, intenta con otro archivo PDF.';
                }
            }

            // Errores específicos para problemas comunes en dispositivos móviles
            if (Platform.OS !== 'web') {
                if (
                    error.message?.includes('Network Error') ||
                    error.message?.includes('network') ||
                    error.code === 'ERR_NETWORK'
                ) {
                    errorMessage = 'Error de red. Verifica tu conexión a internet y que el servidor esté disponible.';
                } else if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
                    errorMessage =
                        'La conexión ha tardado demasiado. El archivo puede ser muy grande o tu conexión es lenta.';
                } else if (error.message?.includes('permission') || error.message?.includes('permiso')) {
                    errorMessage =
                        'Error de permisos. Asegúrate de que la aplicación tenga permisos para acceder a archivos.';
                }
            }

            // Errores específicos basados en códigos del backend
            if (error.response?.data?.code) {
                switch (error.response.data.code) {
                    case 'NO_FILE':
                        errorMessage = 'No se proporcionó archivo PDF';
                        break;
                    case 'MISSING_DECK_ID':
                        errorMessage = 'Error: ID del mazo es requerido';
                        break;
                    case 'FILE_TOO_LARGE':
                        errorMessage = 'El archivo PDF es demasiado grande (máximo 10MB)';
                        break;
                    case 'DECK_NOT_FOUND':
                        errorMessage = 'Mazo no encontrado o no tienes permisos para acceder a él';
                        break;
                    case 'PDF_PROCESSING_ERROR':
                        errorMessage = 'Error procesando el archivo PDF. Verifica que el archivo no esté dañado.';
                        break;
                    case 'INTERNAL_ERROR':
                        errorMessage = 'Error interno del servidor. Intenta nuevamente.';
                        break;
                }
            }

            // Agregar información del código de estado si está disponible
            if (statusCode) {
                errorMessage += ` (Código: ${statusCode})`;
            }

            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const debugFormData = (formData) => {
        console.log('=== DEBUG FORMDATA ===');
        try {
            // Intentar enumerar el contenido del FormData
            let hasFile = false;
            let entries = [];

            try {
                // En algunas versiones de React Native, formData.entries() puede no estar disponible
                entries = Array.from(formData.entries());
            } catch (entriesError) {
                console.warn('No se pudo usar formData.entries():', entriesError.message);
                console.log('Intentando método alternativo para inspeccionar FormData...');

                // Método alternativo para plataformas móviles
                if (Platform.OS !== 'web') {
                    console.log('FormData en plataforma móvil:', formData);
                    // Intentar acceder a las propiedades internas del FormData
                    const formDataStr = formData.toString();
                    console.log('FormData como string:', formDataStr);

                    // Verificar si el FormData tiene la propiedad _parts (común en implementaciones de React Native)
                    if (formData._parts) {
                        console.log('FormData._parts:', formData._parts);
                        formData._parts.forEach((part) => {
                            if (part && part.length >= 2) {
                                const [fieldName, value] = part;
                                if (fieldName === 'pdf') {
                                    hasFile = true;
                                    console.log('Archivo encontrado en _parts:', value);
                                }
                            }
                        });
                    }
                }
            }

            // Procesar las entradas si se pudieron obtener
            for (let pair of entries) {
                console.log(`Campo: ${pair[0]}`);
                if (pair[0] === 'pdf') {
                    hasFile = true;
                    console.log('Tipo de archivo:', typeof pair[1]);
                    console.log('Archivo encontrado:', pair[1]);
                    if (pair[1] instanceof File) {
                        console.log('Es un File object');
                        console.log('- Nombre:', pair[1].name);
                        console.log('- Tamaño:', pair[1].size);
                        console.log('- Tipo:', pair[1].type);
                    } else if (typeof pair[1] === 'object') {
                        console.log('Es un objeto:', pair[1]);
                        // Mostrar propiedades específicas para depuración
                        console.log('- URI:', pair[1].uri);
                        console.log('- Nombre:', pair[1].name);
                        console.log('- Tipo:', pair[1].type);
                        console.log('- Tamaño:', pair[1].size);
                    }
                } else {
                    console.log('Valor:', pair[1]);
                }
            }

            console.log('¿Tiene archivo PDF?', hasFile);

            // Información adicional de la plataforma
            console.log('Plataforma:', Platform.OS);
            console.log('Versión:', Platform.Version);
        } catch (error) {
            console.error('Error al debuggear FormData:', error);
        }
        console.log('=== FIN DEBUG ===');
    };

    const testBackendConnection = async () => {
        try {
            console.log('Testeando conexión completa...');

            // Test 1: Health check
            const healthResponse = await api.get('/health');
            console.log('✅ Health check exitoso:', healthResponse.data);

            // Test 2: Verificar que la ruta PDF existe (sin archivo)
            try {
                await api.post('/pdf/upload', {});
            } catch (error) {
                if (error.response?.status === 400 && error.response?.data?.code === 'NO_FILE') {
                    console.log('✅ Endpoint /pdf/upload existe y responde correctamente');
                } else {
                    console.log('❌ Error inesperado en endpoint PDF:', error.response?.data);
                }
            }

            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Test Completado', 'Revisa la consola para ver los resultados');
        } catch (error) {
            console.error('❌ Error en test de conexión:', error);
            // Usar WebAlert en web y Alert nativo en otras plataformas
            const AlertToUse = Platform.OS === 'web' ? WebAlert : Alert;
            AlertToUse.alert('Error de Conexión', 'No se pudo conectar al backend. Revisa la consola.');
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
                                <Text style={styles.fileSize}>Tamaño: {formatFileSize(selectedFile.size)}</Text>
                            )}
                        </View>

                        {/* Opciones de generación */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>2. Opciones de Generación</Text>
                            <TouchableOpacity style={styles.optionsButton} onPress={() => setShowOptionsModal(true)}>
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

            {/* Modal de mensaje de éxito */}
            <Modal
                visible={showSuccessMessage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessMessage(false)}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalContent}>
                        <View style={styles.successIconContainer}>
                            <AntDesign name="checkcircle" size={60} color={theme.colors.success} />
                        </View>

                        <Text style={styles.successTitle}>¡Proceso Completado!</Text>

                        <Text style={styles.successMessage}>
                            Se generaron exitosamente{' '}
                            <Text style={styles.successNumber}>{successData?.cardsGenerated} flashcards</Text> desde el
                            archivo <Text style={styles.successFileName}>{successData?.fileName}</Text>
                        </Text>

                        <View style={styles.successButtons}>
                            <TouchableOpacity
                                style={[styles.successButton, styles.successButtonSecondary]}
                                onPress={() => {
                                    setShowSuccessMessage(false);
                                    setSelectedFile(null);
                                    setSuccessData(null);
                                }}
                            >
                                <Text style={styles.successButtonTextSecondary}>Importar Otro PDF</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.successButton, styles.successButtonPrimary]}
                                onPress={() => {
                                    setShowSuccessMessage(false);
                                    navigation.goBack();
                                }}
                            >
                                <Text style={styles.successButtonTextPrimary}>Ver Mazo</Text>
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
    // Estilos del modal de éxito
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModalContent: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        margin: theme.spacing.xl,
        maxWidth: 350,
        alignItems: 'center',
    },
    successIconContainer: {
        marginBottom: theme.spacing.xl,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.xl * 1.5,
    },
    successNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.success,
    },
    successFileName: {
        fontWeight: '600',
        color: theme.colors.text.primary,
        fontStyle: 'italic',
    },
    successButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    successButton: {
        flex: 1,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    successButtonPrimary: {
        backgroundColor: theme.colors.primary,
    },
    successButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.text.secondary,
    },
    successButtonTextPrimary: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    successButtonTextSecondary: {
        color: theme.colors.text.secondary,
        fontSize: 16,
        fontWeight: '500',
    },
});
