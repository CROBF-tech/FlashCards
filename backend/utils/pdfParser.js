/**
 * Extrae texto de un buffer PDF con manejo robusto de errores y fallbacks
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF (desde memoria)
 * @returns {Promise<string>} - Texto extraído del PDF
 */
export async function extractTextFromPdf(pdfBuffer) {
    try {
        // Validar que el buffer contiene un PDF válido
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Buffer de PDF vacío o inválido');
        }

        // Verificar que es un Buffer válido
        if (!Buffer.isBuffer(pdfBuffer)) {
            throw new Error('El parámetro debe ser un Buffer válido');
        }

        // Verificar que el buffer comience con la cabecera PDF
        const pdfHeader = pdfBuffer.slice(0, 5).toString();
        if (!pdfHeader.startsWith('%PDF')) {
            throw new Error('El archivo no parece ser un PDF válido');
        }

        console.log(`Procesando PDF de ${pdfBuffer.length} bytes desde memoria`);

        // Intentar primero con pdf-parse
        try {
            return await extractWithPdfParse(pdfBuffer);
        } catch (pdfParseError) {
            console.warn('pdf-parse falló, intentando método alternativo:', pdfParseError.message);

            // Si pdf-parse falla, intentar extracción básica de texto
            return await extractTextBasic(pdfBuffer);
        }
    } catch (error) {
        console.error('Error detallado al extraer texto del PDF:', {
            message: error.message,
            bufferLength: pdfBuffer ? pdfBuffer.length : 'undefined',
            isBuffer: pdfBuffer ? Buffer.isBuffer(pdfBuffer) : false,
        });

        throw new Error(`No se pudo extraer texto del PDF: ${error.message}`);
    }
}

/**
 * Extrae texto usando pdf-parse con manejo específico para Vercel
 */
async function extractWithPdfParse(pdfBuffer) {
    // Crear una copia completamente nueva del buffer
    const bufferCopy = Buffer.alloc(pdfBuffer.length);
    pdfBuffer.copy(bufferCopy);

    // Importar pdf-parse de manera específica para Vercel
    let pdfParse;
    try {
        const module = await import('pdf-parse');
        pdfParse = module.default;

        // Si no hay default, usar la exportación directa
        if (!pdfParse && typeof module === 'function') {
            pdfParse = module;
        }

        // Último intento: buscar en las propiedades del módulo
        if (!pdfParse) {
            const keys = Object.keys(module);
            for (const key of keys) {
                if (typeof module[key] === 'function') {
                    pdfParse = module[key];
                    break;
                }
            }
        }
    } catch (importError) {
        throw new Error(`No se pudo importar pdf-parse: ${importError.message}`);
    }

    if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse no es una función válida');
    }

    console.log('Intentando extracción con pdf-parse...');

    // Configuración específica para evitar problemas de archivos
    const options = {
        // Configuraciones básicas
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        // Evitar cualquier configuración que pueda causar acceso a archivos
        max: 0,
    };

    // Verificar que el buffer no tenga propiedades que puedan confundir a pdf-parse
    const cleanBuffer = Buffer.from(bufferCopy);

    // Eliminar cualquier propiedad adicional que pueda tener el buffer
    Object.setPrototypeOf(cleanBuffer, Buffer.prototype);

    const data = await pdfParse(cleanBuffer, options);

    if (!data || typeof data.text !== 'string' || data.text.trim().length === 0) {
        throw new Error('pdf-parse no pudo extraer texto o el PDF está vacío');
    }

    const cleanedText = data.text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (cleanedText.length < 20) {
        throw new Error('El texto extraído con pdf-parse es demasiado corto');
    }

    console.log(`PDF procesado con pdf-parse: ${cleanedText.length} caracteres, ${data.numpages || 'N/A'} páginas`);
    return cleanedText;
}

/**
 * Extracción básica de texto como fallback
 * Busca texto plano en el buffer del PDF
 */
async function extractTextBasic(pdfBuffer) {
    console.log('Intentando extracción básica de texto...');

    // Convertir buffer a string y buscar texto plano
    const pdfString = pdfBuffer.toString('latin1');

    // Expresión regular para encontrar texto entre parentesis o espacios
    const textRegex = /\((.*?)\)|\/([A-Za-z0-9\s]+)\s/g;
    const matches = [];
    let match;

    while ((match = textRegex.exec(pdfString)) !== null) {
        if (match[1]) {
            // Texto entre paréntesis
            matches.push(match[1]);
        } else if (match[2] && match[2].length > 2) {
            // Palabras sueltas
            matches.push(match[2]);
        }
    }

    // También buscar texto después de comandos de texto comunes
    const textCommands = /(?:BT|Td|Tj|TJ)\s*(.+?)(?:ET|Td|Tj|TJ)/g;
    while ((match = textCommands.exec(pdfString)) !== null) {
        if (match[1] && match[1].trim().length > 2) {
            matches.push(match[1].trim());
        }
    }

    // Buscar strings simples en el PDF
    const simpleStrings = pdfString.match(/[A-Za-z][A-Za-z0-9\s]{3,50}/g) || [];
    matches.push(...simpleStrings.filter((s) => s.length > 5));

    if (matches.length === 0) {
        throw new Error('No se pudo extraer texto con el método básico');
    }

    // Limpiar y unir el texto encontrado
    const extractedText = matches
        .map((text) => text.trim())
        .filter((text) => text.length > 2)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (extractedText.length < 50) {
        throw new Error('El texto extraído con método básico es insuficiente');
    }

    console.log(`Extracción básica completada: ${extractedText.length} caracteres`);
    return extractedText;
}

// Función para compatibilidad (ya no necesaria en serverless)
export async function extractTextFromPdfFile(filePath) {
    throw new Error('Lectura de archivos desde disco no disponible en entorno serverless');
}
