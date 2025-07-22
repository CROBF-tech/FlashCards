import api from '../utils/api';

// Utilidades para gestión de PDFs en el frontend

/**
 * Obtiene estadísticas de archivos temporales del servidor
 * Útil para debugging y monitoreo
 */
export const getUploadStats = async () => {
    try {
        const response = await api.get('/pdf/uploads/stats');
        return response.data;
    } catch (error) {
        console.error('Error al obtener estadísticas de uploads:', error);
        throw error;
    }
};

/**
 * Fuerza limpieza manual de archivos temporales en el servidor
 * @param {number} maxAgeMinutes - Edad máxima en minutos (opcional)
 */
export const forceCleanup = async (maxAgeMinutes = 60) => {
    try {
        const response = await api.post('/pdf/uploads/cleanup', {
            maxAgeMinutes: maxAgeMinutes,
        });
        return response.data;
    } catch (error) {
        console.error('Error al forzar limpieza:', error);
        throw error;
    }
};

/**
 * Valida un archivo PDF antes de enviarlo
 * @param {Object} file - Archivo seleccionado
 * @returns {Object} - Resultado de validación
 */
export const validatePdfFile = (file) => {
    const validation = {
        isValid: true,
        errors: [],
    };

    // Verificar que existe el archivo
    if (!file) {
        validation.isValid = false;
        validation.errors.push('No se ha seleccionado ningún archivo');
        return validation;
    }

    // Verificar URI
    if (!file.uri) {
        validation.isValid = false;
        validation.errors.push('Archivo inválido: falta URI');
    }

    // Verificar tipo MIME
    if (file.mimeType && !file.mimeType.includes('pdf')) {
        validation.isValid = false;
        validation.errors.push('El archivo debe ser un PDF');
    }

    // Verificar extensión si no hay mimeType
    if (!file.mimeType && file.name && !file.name.toLowerCase().endsWith('.pdf')) {
        validation.isValid = false;
        validation.errors.push('El archivo debe tener extensión .pdf');
    }

    // Verificar tamaño (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size && file.size > maxSize) {
        validation.isValid = false;
        validation.errors.push(`El archivo es muy grande. Máximo ${Math.round(maxSize / 1024 / 1024)}MB permitido`);
    }

    // Verificar tamaño mínimo (1KB)
    const minSize = 1024; // 1KB
    if (file.size && file.size < minSize) {
        validation.isValid = false;
        validation.errors.push('El archivo es muy pequeño para ser un PDF válido');
    }

    return validation;
};

/**
 * Formatea el tamaño de archivo para mostrar
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Obtiene sugerencias de optimización para el usuario
 * @param {Object} fileStats - Estadísticas del archivo
 * @returns {Array} - Array de sugerencias
 */
export const getOptimizationSuggestions = (fileStats) => {
    const suggestions = [];

    if (fileStats.size > 5 * 1024 * 1024) {
        // 5MB
        suggestions.push('Considera comprimir el PDF para mejorar el tiempo de procesamiento');
    }

    if (fileStats.size < 100 * 1024) {
        // 100KB
        suggestions.push('El archivo parece pequeño. Asegúrate de que contiene suficiente texto');
    }

    return suggestions;
};
