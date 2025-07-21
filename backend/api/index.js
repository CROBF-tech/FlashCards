import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@libsql/client';

const app = express();

// Middleware
app.use(
    cors({
        origin: '*',
        credentials: true,
    })
);
app.use(express.json({ limit: '10mb' }));

// Middleware de autenticación inline
function auth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No hay token proporcionado.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido.' });
    }
}

// Configuración de base de datos (solo si las variables existen)
let dbClient = null;
if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    dbClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
}

// Función de utilidad para calcular SM2
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

    easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    if (easeFactor < 1.3) easeFactor = 1.3;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return {
        interval,
        ease_factor: easeFactor,
        repetitions,
        due_date: dueDate.toISOString().split('T')[0],
    };
}

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: 'FlashCards API funcionando',
        timestamp: new Date().toISOString(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasDbUrl: !!process.env.TURSO_DATABASE_URL,
            hasDbToken: !!process.env.TURSO_AUTH_TOKEN,
        },
    });
});

// Ruta de health check
app.get('/health', async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({
                status: 'error',
                database: 'not_configured',
                error: 'Variables de base de datos no configuradas',
                timestamp: new Date().toISOString(),
            });
        }

        // Probar conexión a la base de datos
        await dbClient.execute('SELECT 1');
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Rutas de autenticación
app.post('/auth/register', async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT_SECRET no configurado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await dbClient.execute({
            sql: 'INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id',
            args: [username, email, hashedPassword],
        });

        const userId = result.rows[0]?.id;

        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: { id: userId, username, email },
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT_SECRET no configurado' });
        }

        const result = await dbClient.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email],
        });

        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Ruta para obtener el usuario autenticado
app.get('/auth/user', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const result = await dbClient.execute({
            sql: 'SELECT id, username, email FROM users WHERE id = ?',
            args: [req.user.id],
        });

        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// =================== RUTAS DE MAZOS ===================
app.get('/decks', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const result = await dbClient.execute({
            sql: 'SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC',
            args: [req.user.id],
        });

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener mazos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/decks', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Se requiere un nombre para el mazo' });
        }

        const result = await dbClient.execute({
            sql: 'INSERT INTO decks (name, description, user_id) VALUES (?, ?, ?) RETURNING id',
            args: [name, description || '', req.user.id],
        });

        const deckId = result.rows[0]?.id;
        res.status(201).json({ id: deckId, name });
    } catch (error) {
        console.error('Error al crear mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/decks/:id', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const deckResult = await dbClient.execute({
            sql: 'SELECT * FROM decks WHERE id = ? AND user_id = ?',
            args: [parseInt(req.params.id), req.user.id],
        });

        const deck = deckResult.rows[0];
        if (!deck) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        const cardsResult = await dbClient.execute({
            sql: 'SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC',
            args: [deck.id],
        });

        deck.cards = cardsResult.rows.map((card) => ({
            ...card,
            tags: card.tags ? JSON.parse(card.tags) : [],
        }));

        res.json(deck);
    } catch (error) {
        console.error('Error al obtener mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/decks/:id', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { name, description } = req.body;
        const result = await dbClient.execute({
            sql: 'UPDATE decks SET name = ?, description = ? WHERE id = ? AND user_id = ?',
            args: [name, description, parseInt(req.params.id), req.user.id],
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        res.json({ id: parseInt(req.params.id), updated: true });
    } catch (error) {
        console.error('Error al actualizar mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.delete('/decks/:id', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        // Primero eliminar todas las tarjetas del mazo
        await dbClient.execute({
            sql: 'DELETE FROM cards WHERE deck_id = ?',
            args: [parseInt(req.params.id)],
        });

        // Luego eliminar el mazo
        const result = await dbClient.execute({
            sql: 'DELETE FROM decks WHERE id = ? AND user_id = ?',
            args: [parseInt(req.params.id), req.user.id],
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        res.json({ deleted: true });
    } catch (error) {
        console.error('Error al eliminar mazo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// =================== RUTAS DE TARJETAS ===================
app.post('/decks/:deckId/cards', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { front, back, tags } = req.body;
        if (!front || !back) {
            return res.status(400).json({ error: 'Se requiere frente y reverso para la tarjeta' });
        }

        // Verificar que el mazo existe y pertenece al usuario
        const deckResult = await dbClient.execute({
            sql: 'SELECT id FROM decks WHERE id = ? AND user_id = ?',
            args: [parseInt(req.params.deckId), req.user.id],
        });

        if (deckResult.rows.length === 0) {
            return res.status(404).json({ error: 'Mazo no encontrado' });
        }

        const result = await dbClient.execute({
            sql: 'INSERT INTO cards (deck_id, front, back, tags) VALUES (?, ?, ?, ?) RETURNING id',
            args: [parseInt(req.params.deckId), front, back, JSON.stringify(tags || [])],
        });

        const cardId = result.rows[0]?.id;
        res.status(201).json({ id: cardId, deck_id: parseInt(req.params.deckId) });
    } catch (error) {
        console.error('Error al crear tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/cards/:id', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const result = await dbClient.execute({
            sql: `SELECT cards.*, decks.user_id 
                  FROM cards 
                  JOIN decks ON cards.deck_id = decks.id 
                  WHERE cards.id = ? AND decks.user_id = ?`,
            args: [parseInt(req.params.id), req.user.id],
        });

        const card = result.rows[0];
        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        card.tags = card.tags ? JSON.parse(card.tags) : [];
        res.json(card);
    } catch (error) {
        console.error('Error al obtener tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/cards/:id', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { front, back, tags } = req.body;
        const result = await dbClient.execute({
            sql: `UPDATE cards SET front = ?, back = ?, tags = ? 
                  WHERE id = ? AND deck_id IN (SELECT id FROM decks WHERE user_id = ?)`,
            args: [front, back, JSON.stringify(tags || []), parseInt(req.params.id), req.user.id],
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        res.json({ id: parseInt(req.params.id), updated: true });
    } catch (error) {
        console.error('Error al actualizar tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.delete('/cards/:id', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const result = await dbClient.execute({
            sql: `DELETE FROM cards 
                  WHERE id = ? AND deck_id IN (SELECT id FROM decks WHERE user_id = ?)`,
            args: [parseInt(req.params.id), req.user.id],
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        res.json({ deleted: true });
    } catch (error) {
        console.error('Error al eliminar tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// =================== RUTAS DE ESTUDIO ===================
app.get('/decks/:id/study', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const ignoreDate = req.query.ignoreDate === 'true';
        const today = new Date().toISOString().split('T')[0];

        let sql = `SELECT cards.* FROM cards 
                   JOIN decks ON cards.deck_id = decks.id 
                   WHERE cards.deck_id = ? AND decks.user_id = ?`;

        if (!ignoreDate) {
            sql += ` AND (cards.due_date IS NULL OR cards.due_date <= ?)`;
        }

        sql += ` ORDER BY cards.due_date ASC LIMIT 20`;

        const args = ignoreDate
            ? [parseInt(req.params.id), req.user.id]
            : [parseInt(req.params.id), req.user.id, today];

        const result = await dbClient.execute({
            sql: sql,
            args: args,
        });

        const cards = result.rows.map((card) => ({
            ...card,
            tags: card.tags ? JSON.parse(card.tags) : [],
        }));

        res.json(cards);
    } catch (error) {
        console.error('Error al obtener tarjetas para estudio:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/cards/:id/review', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { quality } = req.body;
        if (typeof quality !== 'number' || quality < 0 || quality > 5) {
            return res.status(400).json({ error: 'La calificación debe estar entre 0 y 5' });
        }

        // Obtener la tarjeta
        const cardResult = await dbClient.execute({
            sql: `SELECT cards.*, decks.user_id 
                  FROM cards 
                  JOIN decks ON cards.deck_id = decks.id 
                  WHERE cards.id = ? AND decks.user_id = ?`,
            args: [parseInt(req.params.id), req.user.id],
        });

        const card = cardResult.rows[0];
        if (!card) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        // Calcular nuevos valores usando SM2
        const result = calculateSM2(quality, card.repetitions || 0, card.ease_factor || 2.5, card.interval || 1);

        // Actualizar la tarjeta
        await dbClient.execute({
            sql: 'UPDATE cards SET interval = ?, ease_factor = ?, repetitions = ?, due_date = ? WHERE id = ?',
            args: [result.interval, result.ease_factor, result.repetitions, result.due_date, card.id],
        });

        // Registrar la revisión
        await dbClient.execute({
            sql: 'INSERT INTO reviews (card_id, quality, user_id) VALUES (?, ?, ?)',
            args: [card.id, quality, req.user.id],
        });

        res.json(result);
    } catch (error) {
        console.error('Error al procesar revisión:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// =================== RUTAS DE BÚSQUEDA ===================
app.get('/search', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const { q, tag } = req.query;
        let sql = `SELECT cards.*, decks.name as deck_name 
                   FROM cards 
                   JOIN decks ON cards.deck_id = decks.id 
                   WHERE decks.user_id = ?`;
        let args = [req.user.id];

        if (q) {
            sql += ` AND (cards.front LIKE ? OR cards.back LIKE ?)`;
            args.push(`%${q}%`, `%${q}%`);
        }

        if (tag) {
            sql += ` AND cards.tags LIKE ?`;
            args.push(`%"${tag}"%`);
        }

        sql += ` ORDER BY cards.created_at DESC`;

        const result = await dbClient.execute({
            sql: sql,
            args: args,
        });

        const cards = result.rows.map((card) => ({
            ...card,
            tags: card.tags ? JSON.parse(card.tags) : [],
        }));

        res.json(cards);
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/tags', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        const result = await dbClient.execute({
            sql: `SELECT DISTINCT tags 
                  FROM cards 
                  JOIN decks ON cards.deck_id = decks.id 
                  WHERE decks.user_id = ? AND tags IS NOT NULL AND tags != '[]'`,
            args: [req.user.id],
        });

        // Extraer todas las etiquetas únicas
        const allTags = new Set();
        result.rows.forEach((row) => {
            if (row.tags) {
                try {
                    const tags = JSON.parse(row.tags);
                    tags.forEach((tag) => allTags.add(tag));
                } catch (e) {
                    console.error('Error parsing tags:', e);
                }
            }
        });

        res.json(Array.from(allTags));
    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// =================== RUTAS DE USUARIO ===================
app.get('/user/stats', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        // Obtener estadísticas básicas
        const statsResult = await dbClient.execute({
            sql: `SELECT 
                    COUNT(DISTINCT d.id) as total_decks,
                    COUNT(c.id) as total_cards,
                    COUNT(r.id) as total_reviews
                  FROM decks d
                  LEFT JOIN cards c ON d.id = c.deck_id
                  LEFT JOIN reviews r ON c.id = r.card_id
                  WHERE d.user_id = ?`,
            args: [req.user.id],
        });

        // Obtener progreso diario de la última semana
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const dailyResult = await dbClient.execute({
            sql: `SELECT 
                    DATE(r.created_at) as date,
                    COUNT(*) as count
                  FROM reviews r
                  JOIN cards c ON r.card_id = c.id
                  JOIN decks d ON c.deck_id = d.id
                  WHERE d.user_id = ? AND r.created_at >= ?
                  GROUP BY DATE(r.created_at)
                  ORDER BY date`,
            args: [req.user.id, weekAgo.toISOString()],
        });

        // Obtener tarjetas debido hoy
        const today = new Date().toISOString().split('T')[0];
        const dueResult = await dbClient.execute({
            sql: `SELECT COUNT(*) as due_today
                  FROM cards c
                  JOIN decks d ON c.deck_id = d.id
                  WHERE d.user_id = ? AND (c.due_date IS NULL OR c.due_date <= ?)`,
            args: [req.user.id, today],
        });

        const stats = statsResult.rows[0];
        res.json({
            total_decks: stats.total_decks || 0,
            total_cards: stats.total_cards || 0,
            total_reviews: stats.total_reviews || 0,
            due_today: dueResult.rows[0]?.due_today || 0,
            daily_progress: dailyResult.rows,
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            message: 'Error al obtener estadísticas. Por favor, intente nuevamente.',
        });
    }
});

app.delete('/user/delete', auth, async (req, res) => {
    try {
        if (!dbClient) {
            return res.status(500).json({ error: 'Base de datos no configurada' });
        }

        // Eliminar en cascada: reviews -> cards -> decks -> user
        await dbClient.execute({
            sql: `DELETE FROM reviews WHERE card_id IN (
                    SELECT c.id FROM cards c 
                    JOIN decks d ON c.deck_id = d.id 
                    WHERE d.user_id = ?
                  )`,
            args: [req.user.id],
        });

        await dbClient.execute({
            sql: `DELETE FROM cards WHERE deck_id IN (
                    SELECT id FROM decks WHERE user_id = ?
                  )`,
            args: [req.user.id],
        });

        await dbClient.execute({
            sql: 'DELETE FROM decks WHERE user_id = ?',
            args: [req.user.id],
        });

        const result = await dbClient.execute({
            sql: 'DELETE FROM users WHERE id = ?',
            args: [req.user.id],
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({
                message: 'No se encontró la cuenta o ya fue eliminada',
            });
        }

        res.status(200).json({
            message: 'Cuenta eliminada exitosamente',
        });
    } catch (error) {
        console.error('Error al eliminar la cuenta:', error);
        res.status(500).json({
            message: 'Error al eliminar la cuenta. Por favor, intente nuevamente.',
        });
    }
});

// =================== RUTAS GENERALES ===================
app.get('/stats', auth, async (req, res) => {
    try {
        // Redirigir a /user/stats para compatibilidad
        const response = await req.app.handle({
            ...req,
            url: '/user/stats',
            path: '/user/stats',
        });
        res.json(response);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
        timestamp: new Date().toISOString(),
    });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    });
});
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
export default app;
