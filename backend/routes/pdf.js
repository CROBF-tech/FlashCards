import express from 'express';
import multer from 'multer';
import { extractTextFromPdf } from '../utils/pdfParser.js';
import db from '../database.js';
import auth from '../middleware/auth.js';
import geminiService from '../services/geminiService.js';

const router = express.Router();

// Configurar multer para usar almacenamiento en memoria (compatible con Vercel)
const upload = multer({
    storage: multer.memoryStorage(), // ✅ Usar memoria en lugar de disco
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB límite
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    },
});

// Ruta para subir PDF y generar flashcards
router.post('/upload', auth, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No se proporcionó archivo PDF',
                code: 'NO_FILE',
            });
        }

        const { deckId, cardCount = 10, difficulty = 'medium', focus = 'general' } = req.body;

        if (!deckId) {
            return res.status(400).json({
                error: 'ID del mazo es requerido',
                code: 'MISSING_DECK_ID',
            });
        }

        // Validar tamaño del archivo
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                error: 'El archivo PDF es demasiado grande (máximo 10MB)',
                code: 'FILE_TOO_LARGE',
            });
        }

        // Verificar que el mazo pertenece al usuario
        const deck = await db.getDeck(deckId, req.user.id);
        if (!deck) {
            return res.status(404).json({
                error: 'Mazo no encontrado o no tienes permisos para acceder a él',
                code: 'DECK_NOT_FOUND',
            });
        }

        // Procesar el PDF directamente desde el buffer en memoria
        const result = await processPdfFromBuffer(req.file.buffer, deckId, {
            cardCount: parseInt(cardCount),
            difficulty,
            focus,
        });

        console.log(`PDF processed for user ${req.user.id}:`, {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            cardsGenerated: result.cardsGenerated,
            options: {
                cardCount: parseInt(cardCount),
                difficulty,
                focus,
            },
        });

        res.json({
            success: true,
            cardsGenerated: result.cardsGenerated,
            message: `Se generaron ${result.cardsGenerated} flashcards exitosamente`,
        });
    } catch (error) {
        console.error('Error al subir PDF:', error);

        // Diferentes tipos de error
        if (error.message.includes('PDF')) {
            return res.status(400).json({
                error: 'Error procesando el archivo PDF: ' + error.message,
                code: 'PDF_PROCESSING_ERROR',
            });
        }

        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR',
        });
    }
});

// Función para procesar PDF desde buffer en memoria
async function processPdfFromBuffer(pdfBuffer, deckId, options) {
    try {
        console.log(`Iniciando procesamiento de PDF desde buffer: ${pdfBuffer.length} bytes`);

        // Parsear el PDF usando el buffer directamente
        const pdfText = await extractTextFromPdf(pdfBuffer);

        if (!pdfText || pdfText.trim().length < 100) {
            throw new Error('El PDF no contiene suficiente texto para generar flashcards (mínimo 100 caracteres)');
        }

        console.log(`Texto extraído exitosamente: ${pdfText.length} caracteres`);

        // Generar flashcards con Gemini
        console.log(`Generando flashcards con opciones:`, options);
        const flashcards = await geminiService.generateFlashcardsFromText(pdfText, options);

        if (!flashcards || flashcards.length === 0) {
            throw new Error(
                'No se pudieron generar flashcards del contenido. Verifica que el PDF contenga texto educativo relevante.'
            );
        }

        console.log(`Generadas ${flashcards.length} flashcards`);

        // Guardar las flashcards en la base de datos
        const cardIds = await db.createBulkCards(deckId, flashcards);

        console.log(`✅ PDF procesado exitosamente. Generadas ${cardIds.length} flashcards`);

        return {
            success: true,
            cardsGenerated: cardIds.length,
            cardIds: cardIds,
        };
    } catch (error) {
        console.error(`❌ Error procesando PDF:`, error);

        // Categorizar el error para mejor debugging
        if (error.message.includes('PDF')) {
            throw new Error('Error al leer el archivo PDF. Asegúrate de que el archivo no esté dañado.');
        } else if (error.message.includes('Gemini') || error.message.includes('generateFlashcardsFromText')) {
            throw new Error('Error al generar las flashcards. Intenta nuevamente en unos minutos.');
        } else if (error.message.includes('database') || error.message.includes('db')) {
            throw new Error('Error al guardar las flashcards. Intenta nuevamente.');
        } else if (error.message.includes('texto')) {
            throw new Error('El PDF no contiene suficiente texto para generar flashcards.');
        }

        throw error;
    }
}

// Ruta para mejorar una flashcard existente con Gemini
router.post('/enhance-card/:cardId', auth, async (req, res) => {
    try {
        const { cardId } = req.params;

        // Obtener la tarjeta
        const card = await db.getCard(cardId, req.user.id);
        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        // Mejorar con Gemini
        const enhancedCard = await geminiService.enhanceFlashcard(card.front, card.back);

        // Actualizar en la base de datos
        await db.updateCard(cardId, enhancedCard.front, enhancedCard.back, enhancedCard.tags);

        res.json({
            success: true,
            card: {
                id: cardId,
                front: enhancedCard.front,
                back: enhancedCard.back,
                tags: enhancedCard.tags,
            },
        });
    } catch (error) {
        console.error('Error al mejorar tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener estadísticas de uploads (actualizada para serverless)
router.get('/uploads/stats', auth, async (req, res) => {
    try {
        res.json({
            uploads: {
                fileCount: 0,
                totalSizeMB: '0.00',
                totalSizeBytes: 0,
                message: 'Sistema de archivos en memoria - estadísticas no aplicables',
            },
            diskSpace: {
                needsCleanup: false,
                message: 'Sistema serverless - espacio gestionado automáticamente',
            },
            environment: 'serverless',
            message: 'Entorno serverless - archivos procesados en memoria',
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de uploads:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para limpieza manual (no aplicable en serverless)
router.post('/uploads/cleanup', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            filesRemoved: 0,
            message: 'Limpieza no necesaria en entorno serverless - archivos procesados en memoria',
        });
    } catch (error) {
        console.error('Error en limpieza manual:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;
