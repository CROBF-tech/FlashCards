import express from 'express';
import multer from 'multer';
import { extractTextFromPdf } from '../utils/pdfParser.js';
import db from '../database.js';
import auth from '../middleware/auth.js';
import geminiService from '../services/geminiService.js';

const router = express.Router();

// Configurar multer para usar memoria en lugar de disco
const upload = multer({
    storage: multer.memoryStorage(), // Usar memoria en lugar de disco
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

        // Crear registro de importación
        const importId = await db.createPdfImport(req.user.id, deckId, req.file.originalname, 'processing');

        // Procesar el PDF en segundo plano usando el buffer en memoria
        processPdfAsync(importId, req.file.buffer, deckId, {
            cardCount: parseInt(cardCount),
            difficulty,
            focus,
        });

        console.log(`PDF upload initiated for user ${req.user.id}:`, {
            importId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            options: {
                cardCount: parseInt(cardCount),
                difficulty,
                focus,
            },
        });

        res.json({
            success: true,
            importId,
            message: 'PDF recibido, procesando en segundo plano',
            estimatedTime: '1-3 minutos',
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

// Función para procesar PDF de forma asíncrona usando buffer en memoria
async function processPdfAsync(importId, pdfBuffer, deckId, options) {
    try {
        console.log(`Iniciando procesamiento de PDF para importación ${importId}`);

        // Parsear el PDF directamente desde el buffer en memoria usando el nuevo parser
        const pdfText = await extractTextFromPdf(pdfBuffer);

        if (!pdfText || pdfText.trim().length < 100) {
            throw new Error('El PDF no contiene suficiente texto para generar flashcards (mínimo 100 caracteres)');
        }

        console.log(`Texto extraído exitosamente para importación ${importId}: ${pdfText.length} caracteres`);

        // Generar flashcards con Gemini
        console.log(`Generando flashcards para importación ${importId} con opciones:`, options);
        const flashcards = await geminiService.generateFlashcardsFromText(pdfText, options);

        if (!flashcards || flashcards.length === 0) {
            throw new Error(
                'No se pudieron generar flashcards del contenido. Verifica que el PDF contenga texto educativo relevante.'
            );
        }

        console.log(`Generadas ${flashcards.length} flashcards para importación ${importId}`);

        // Guardar las flashcards en la base de datos
        const cardIds = await db.createBulkCards(deckId, flashcards);

        // Actualizar el estado de la importación
        await db.updatePdfImportStatus(importId, 'completed');

        // Actualizar contador de tarjetas generadas
        await db.client.execute({
            sql: `UPDATE pdf_imports SET cards_generated = ? WHERE id = ?`,
            args: [cardIds.length, importId],
        });

        console.log(
            `✅ PDF procesado exitosamente. Generadas ${cardIds.length} flashcards para importación ${importId}`
        );

        // El buffer se liberará automáticamente por el garbage collector
    } catch (error) {
        console.error(`❌ Error procesando PDF para importación ${importId}:`, error);

        // Categorizar el error para mejor debugging
        let errorCategory = 'UNKNOWN_ERROR';
        let userFriendlyMessage = error.message;

        if (error.message.includes('PDF')) {
            errorCategory = 'PDF_PARSING_ERROR';
            userFriendlyMessage = 'Error al leer el archivo PDF. Asegúrate de que el archivo no esté dañado.';
        } else if (error.message.includes('Gemini') || error.message.includes('generateFlashcardsFromText')) {
            errorCategory = 'AI_GENERATION_ERROR';
            userFriendlyMessage = 'Error al generar las flashcards. Intenta nuevamente en unos minutos.';
        } else if (error.message.includes('database') || error.message.includes('db')) {
            errorCategory = 'DATABASE_ERROR';
            userFriendlyMessage = 'Error al guardar las flashcards. Intenta nuevamente.';
        } else if (error.message.includes('texto')) {
            errorCategory = 'INSUFFICIENT_TEXT';
            userFriendlyMessage = 'El PDF no contiene suficiente texto para generar flashcards.';
        }

        // Actualizar el estado con error
        await db.updatePdfImportStatus(importId, 'failed', userFriendlyMessage);

        console.log(`Error categorizado como: ${errorCategory} para importación ${importId}`);
    }
    // Nota: El buffer en memoria se libera automáticamente cuando sale del scope
}

// Ruta para obtener el estado de una importación
router.get('/import/:importId/status', auth, async (req, res) => {
    try {
        const { importId } = req.params;

        const result = await db.client.execute({
            sql: `SELECT * FROM pdf_imports WHERE id = ? AND user_id = ?`,
            args: [importId, req.user.id],
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Importación no encontrada' });
        }

        const importData = result.rows[0];
        res.json({
            id: importData.id,
            status: importData.status,
            cardsGenerated: importData.cards_generated,
            errorMessage: importData.error_message,
            originalName: importData.original_name,
            createdAt: importData.created_at,
            updatedAt: importData.updated_at,
        });
    } catch (error) {
        console.error('Error al obtener estado de importación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener historial de importaciones
router.get('/imports', auth, async (req, res) => {
    try {
        const imports = await db.getPdfImportsByUser(req.user.id);
        res.json(imports);
    } catch (error) {
        console.error('Error al obtener importaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

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

export default router;
