/**
 * Extrae texto de un buffer PDF con manejo robusto de errores
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @returns {Promise<string>} - Texto extraído del PDF
 */
export async function extractTextFromPdf(pdfBuffer) {
    try {
        // Validar que el buffer contiene un PDF válido
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Buffer de PDF vacío o inválido');
        }

        // Verificar que el buffer comience con la cabecera PDF
        const pdfHeader = pdfBuffer.slice(0, 5).toString();
        if (!pdfHeader.startsWith('%PDF')) {
            throw new Error('El archivo no parece ser un PDF válido');
        }

        // Importación dinámica con configuración específica para Vercel
        const pdfParse = (await import('pdf-parse')).default;

        // Opciones específicas para evitar problemas en entornos serverless
        const options = {
            // Configuración para entornos limitados
            max: 0, // Sin límite de páginas
            pagerender: null, // Sin renderizado de página
            normalizeWhitespace: true,
            disableCombineTextItems: false,
        };

        const data = await pdfParse(pdfBuffer, options);

        if (!data || typeof data.text !== 'string' || data.text.trim().length === 0) {
            throw new Error('No se pudo extraer texto del PDF o el PDF está vacío');
        }

        // Limpiar y normalizar el texto extraído
        const cleanedText = data.text
            .replace(/\s+/g, ' ') // Normalizar espacios en blanco
            .replace(/\n{3,}/g, '\n\n') // Limitar saltos de línea múltiples
            .trim();

        if (cleanedText.length < 20) {
            throw new Error('El texto extraído es demasiado corto para ser útil');
        }

        console.log(
            `PDF procesado exitosamente. Texto extraído: ${cleanedText.length} caracteres, ${data.numpages} páginas`
        );

        return cleanedText;
    } catch (error) {
        console.error('Error al extraer texto del PDF:', error.message);
        throw new Error(`No se pudo extraer texto del PDF: ${error.message}`);
    }
}
