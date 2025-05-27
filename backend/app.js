const express = require('express');
const cors = require('cors');
const db = require('./database');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Funciones de utilidad
function calculateSM2(quality, repetitions, easeFactor, interval) {
    if (quality < 3) {
        repetitions = 0;
        interval = 1;
    } else {
        repetitions += 1;
        if (repetitions === 1) {
            interval = 1;
        } else if (repetitions === 2) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
    }

    // Ajustar el factor de facilidad
    easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Calcular fecha de vencimiento
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return {
        interval,
        ease_factor: easeFactor,
        repetitions,
        due_date: dueDate.toISOString().split('T')[0],
    };
}

// Rutas para mazos
app.get('/decks', async (req, res) => {
    try {
        const decks = await db.getAllDecks();
        res.json(decks);
    } catch (error) {
        console.error('Error al obtener mazos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/decks', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Se requiere un nombre para el mazo' });
        }

        const deckId = await db.createDeck(name, description || '');
        res.status(201).json({ id: deckId, name });
    } catch (error) {
        console.error('Error al crear mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/decks/:id', async (req, res) => {
    try {
        const deck = await db.getDeck(parseInt(req.params.id));
        if (!deck) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        const cards = await db.getCardsByDeck(deck.id);
        deck.cards = cards.map((card) => ({
            ...card,
            tags: JSON.parse(card.tags),
        }));

        res.json(deck);
    } catch (error) {
        console.error('Error al obtener mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/decks/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const success = await db.updateDeck(parseInt(req.params.id), name, description);

        if (!success) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        res.json({ id: parseInt(req.params.id), updated: true });
    } catch (error) {
        console.error('Error al actualizar mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.delete('/decks/:id', async (req, res) => {
    try {
        const success = await db.deleteDeck(parseInt(req.params.id));

        if (!success) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        res.json({ deleted: true });
    } catch (error) {
        console.error('Error al eliminar mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas para tarjetas
app.post('/decks/:deckId/cards', async (req, res) => {
    try {
        const { front, back, tags } = req.body;
        if (!front || !back) {
            return res.status(400).json({ error: 'Se requiere frente y reverso para la tarjeta' });
        }

        const cardId = await db.createCard(parseInt(req.params.deckId), front, back, tags || []);
        if (!cardId) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        res.status(201).json({ id: cardId, deck_id: parseInt(req.params.deckId) });
    } catch (error) {
        console.error('Error al crear tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/cards/:id', async (req, res) => {
    try {
        const card = await db.getCard(parseInt(req.params.id));
        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        card.tags = JSON.parse(card.tags);
        res.json(card);
    } catch (error) {
        console.error('Error al obtener tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/cards/:id', async (req, res) => {
    try {
        const { front, back, tags } = req.body;
        const success = await db.updateCard(parseInt(req.params.id), front, back, tags);

        if (!success) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        res.json({ id: parseInt(req.params.id), updated: true });
    } catch (error) {
        console.error('Error al actualizar tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.delete('/cards/:id', async (req, res) => {
    try {
        const success = await db.deleteCard(parseInt(req.params.id));

        if (!success) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        res.json({ deleted: true });
    } catch (error) {
        console.error('Error al eliminar tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas para estudio
app.get('/decks/:id/study', async (req, res) => {
    try {
        const cards = await db.getDueCards(parseInt(req.params.id));
        res.json(
            cards.map((card) => ({
                ...card,
                tags: JSON.parse(card.tags),
            }))
        );
    } catch (error) {
        console.error('Error al obtener tarjetas para estudio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/cards/:id/review', async (req, res) => {
    try {
        const { quality } = req.body;
        if (typeof quality !== 'number' || quality < 0 || quality > 5) {
            return res.status(400).json({ error: 'La calificación debe estar entre 0 y 5' });
        }

        const card = await db.getCard(parseInt(req.params.id));
        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        const result = calculateSM2(quality, card.repetitions, card.ease_factor, card.interval);

        const success = await db.updateCardReviewData(
            card.id,
            result.interval,
            result.ease_factor,
            result.repetitions,
            result.due_date
        );

        if (!success) {
            return res.status(500).json({ error: 'Error al actualizar datos de revisión' });
        }

        await db.recordReview(card.id, quality);
        res.json(result);
    } catch (error) {
        console.error('Error al procesar revisión:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas para búsqueda y etiquetas
app.get('/search', async (req, res) => {
    try {
        const { q, tag } = req.query;
        const cards = await db.searchCards(q || '', tag || '');
        res.json(
            cards.map((card) => ({
                ...card,
                tags: JSON.parse(card.tags),
            }))
        );
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/tags', async (req, res) => {
    try {
        const tags = await db.getAllTags();
        res.json(tags);
    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para estadísticas
app.get('/stats', async (req, res) => {
    try {
        const stats = await db.getStudyStats();
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
