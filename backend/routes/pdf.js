import express from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
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
            return res.status(400).json({ error: 'No se proporcionó archivo PDF' });
        }

        const { deckId, cardCount = 10, difficulty = 'medium', focus = 'general' } = req.body;

        if (!deckId) {
            return res.status(400).json({ error: 'ID del mazo es requerido' });
        }

        // Verificar que el mazo pertenece al usuario
        const deck = await db.getDeck(deckId, req.user.id);
        if (!deck) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        // Crear registro de importación (ya no necesitamos guardar file_name)
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
        });
    } catch (error) {
        console.error('Error al subir PDF:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función para procesar PDF de forma asíncrona usando buffer en memoria
async function processPdfAsync(importId, pdfBuffer, deckId, options) {
    try {
        // Parsear el PDF directamente desde el buffer en memoria
        const pdfData = await pdf(pdfBuffer);

        if (!pdfData.text || pdfData.text.trim().length < 100) {
            throw new Error('El PDF no contiene suficiente texto para generar flashcards');
        }

        // Generar flashcards con Gemini
        console.log(`Generating flashcards for import ${importId} with options:`, options);
        const flashcards = await geminiService.generateFlashcardsFromText(pdfData.text, options);

        if (!flashcards || flashcards.length === 0) {
            throw new Error('No se pudieron generar flashcards del contenido');
        }

        console.log(`Generated ${flashcards.length} flashcards for import ${importId}`);

        // Guardar las flashcards en la base de datos
        const cardIds = await db.createBulkCards(deckId, flashcards);

        // Actualizar el estado de la importación
        await db.updatePdfImportStatus(importId, 'completed');

        // Actualizar contador de tarjetas generadas
        await db.client.execute({
            sql: `UPDATE pdf_imports SET cards_generated = ? WHERE id = ?`,
            args: [cardIds.length, importId],
        });

        console.log(`PDF procesado exitosamente. Generadas ${cardIds.length} flashcards para importación ${importId}`);

        // El buffer se liberará automáticamente por el garbage collector
        // No necesitamos limpiar archivos porque no se guardan en disco
    } catch (error) {
        console.error(`Error procesando PDF para importación ${importId}:`, error);

        // Actualizar el estado con error
        await db.updatePdfImportStatus(importId, 'failed', error.message);
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
