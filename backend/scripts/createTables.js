import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config();

class TableCreator {
    constructor() {
        try {
            // Verificar que las variables de entorno estén configuradas
            if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
                console.error('Variables de entorno de base de datos no configuradas');
                throw new Error('Database configuration missing');
            }

            this.client = createClient({
                url: process.env.TURSO_DATABASE_URL,
                authToken: process.env.TURSO_AUTH_TOKEN,
            });

            console.log('🔗 Conectado a la base de datos');
        } catch (error) {
            console.error('Error creating database client:', error);
            throw error;
        }
    }

    async createTables() {
        try {
            console.log('📋 Iniciando creación de tablas...');

            // Crear tabla users
            console.log('👤 Creando tabla users...');
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    resetPasswordToken TEXT,
                    resetPasswordExpires TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Crear tabla decks con referencia a users
            console.log('📚 Creando tabla decks...');
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS decks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            // Crear tabla cards
            console.log('🗃️ Creando tabla cards...');
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS cards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    deck_id INTEGER NOT NULL,
                    front TEXT NOT NULL,
                    back TEXT NOT NULL,
                    tags TEXT DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    interval INTEGER DEFAULT 0,
                    ease_factor REAL DEFAULT 2.5,
                    repetitions INTEGER DEFAULT 0,
                    due_date DATE DEFAULT CURRENT_DATE,
                    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
                )
            `);

            // Crear tabla reviews
            console.log('📊 Creando tabla reviews...');
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    card_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    quality INTEGER NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            // Crear tabla para importaciones de PDF
            console.log('📄 Creando tabla pdf_imports...');
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS pdf_imports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    deck_id INTEGER NOT NULL,
                    file_name TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    status TEXT DEFAULT 'processing',
                    error_message TEXT,
                    cards_generated INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
                )
            `);

            console.log('🗂️ Creando índices...');

            // Crear índices
            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id)
            `);

            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date)
            `);

            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_reviews_card_id ON reviews(card_id)
            `);

            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id)
            `);

            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_pdf_imports_user_id ON pdf_imports(user_id)
            `);

            await this.client.execute(`
                CREATE INDEX IF NOT EXISTS idx_pdf_imports_deck_id ON pdf_imports(deck_id)
            `);

            console.log('✅ Todas las tablas e índices se crearon correctamente');
            console.log('🎉 ¡Base de datos inicializada exitosamente!');
        } catch (error) {
            console.error('❌ Error creando tablas:', error);
            throw error;
        }
    }
}

// Ejecutar la creación de tablas
async function main() {
    try {
        const tableCreator = new TableCreator();
        await tableCreator.createTables();
        process.exit(0);
    } catch (error) {
        console.error('💥 Error en el script:', error);
        process.exit(1);
    }
}

main();
