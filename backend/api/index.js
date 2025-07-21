import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { createClient } from '@libsql/client';
import auth from '../middleware/auth.js';

// Cargar variables de entorno
config();

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET no está configurado');
}

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Variables de base de datos no configuradas');
}

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Configuración de base de datos
const dbClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

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
            hasDbToken: !!process.env.TURSO_AUTH_TOKEN
        }
    });
});

// Ruta de health check
app.get('/health', async (req, res) => {
    try {
        // Probar conexión a la base de datos
        await dbClient.execute('SELECT 1');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ 
            status: 'error', 
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rutas de autenticación
app.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
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

// Middleware de manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
        timestamp: new Date().toISOString()
    });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

export default app;
