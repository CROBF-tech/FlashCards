import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config();

class FlashcardsDB {
    constructor() {
        this.client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        this.initDB();
    }

    async initDB() {
        // Crear tabla users
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
    }

    // Métodos de autenticación
    async createUser(username, email, password) {
        try {
            const result = await this.client.execute({
                sql: 'INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id',
                args: [username, email, password],
            });
            return result.rows[0].id;
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('El usuario o email ya existe');
            }
            throw error;
        }
    }

    async getUserByEmail(email) {
        const result = await this.client.execute({
            sql: 'SELECT *, resetPasswordToken, resetPasswordExpires FROM users WHERE email = ?',
            args: [email],
        });
        return result.rows[0];
    }

    async updateUserResetToken(email, resetPasswordToken, resetPasswordExpires) {
        const result = await this.client.execute({
            sql: 'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE email = ?',
            args: [resetPasswordToken, resetPasswordExpires, email],
        });
        return result.rowsAffected > 0;
    }

    async updateUserPassword(email, hashedPassword) {
        const result = await this.client.execute({
            sql: 'UPDATE users SET password = ? WHERE email = ?',
            args: [hashedPassword, email],
        });
        return result.rowsAffected > 0;
    }

    async getUserById(id) {
        const result = await this.client.execute({
            sql: 'SELECT id, username, email, created_at FROM users WHERE id = ?',
            args: [id],
        });
        return result.rows[0];
    }

    // Métodos para mazos (actualizados para usuarios)
    async getDeck(deckId, userId) {
        try {
            const result = await this.client.execute({
                sql: 'SELECT id, name, description, created_at FROM decks WHERE id = ? AND user_id = ?',
                args: [deckId, userId],
            });
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener mazo:', error);
            throw error;
        }
    }

    async getAllDecks(userId) {
        const result = await this.client.execute({
            sql: 'SELECT id, name, description, created_at FROM decks WHERE user_id = ? ORDER BY name',
            args: [userId],
        });
        return result.rows;
    }

    async createDeck(name, description = '', userId) {
        const result = await this.client.execute({
            sql: 'INSERT INTO decks (name, description, user_id) VALUES (?, ?, ?) RETURNING id',
            args: [name, description, userId],
        });
        return result.rows[0].id;
    }

    async updateDeck(name, description, deckId, userId) {
        const result = await this.client.execute({
            sql: 'UPDATE decks SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            args: [name, description, deckId, userId],
        });
        return result.rowsAffected > 0;
    }

    async deleteDeck(deckId, userId) {
        const result = await this.client.execute({
            sql: 'DELETE FROM decks WHERE id = ? AND user_id = ?',
            args: [deckId, userId],
        });
        return result.rowsAffected > 0;
    }

    // Métodos para tarjetas (actualizados para usuarios)
    async getCardsByDeck(deckId, userId) {
        const result = await this.client.execute({
            sql: `SELECT c.id, c.front, c.back, c.tags, c.interval, c.ease_factor, c.repetitions, c.due_date 
                  FROM cards c
                  JOIN decks d ON c.deck_id = d.id
                  WHERE c.deck_id = ? AND d.user_id = ?`,
            args: [deckId, userId],
        });
        return result.rows;
    }

    async getCard(cardId, userId) {
        const result = await this.client.execute({
            sql: `SELECT c.id, c.deck_id, c.front, c.back, c.tags, c.interval, c.ease_factor, c.repetitions, c.due_date
                  FROM cards c
                  JOIN decks d ON c.deck_id = d.id
                  WHERE c.id = ? AND d.user_id = ?`,
            args: [cardId, userId],
        });
        return result.rows[0];
    }

    async createCard(deckId, front, back, tags = [], userId) {
        // Verificar que el mazo pertenece al usuario
        const deck = await this.getDeck(deckId, userId);
        if (!deck) {
            throw new Error('Mazo no encontrado');
        }

        const result = await this.client.execute({
            sql: `INSERT INTO cards (deck_id, front, back, tags, due_date)
                  VALUES (?, ?, ?, ?, date('now')) RETURNING id`,
            args: [deckId, front, back, JSON.stringify(tags)],
        });
        return result.rows[0].id;
    }

    async updateCard(cardId, front, back, tags, userId) {
        const card = await this.getCard(cardId, userId);
        if (!card) {
            return false;
        }

        const result = await this.client.execute({
            sql: `UPDATE cards 
                  SET front = ?, back = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [front, back, JSON.stringify(tags), cardId],
        });
        return result.rowsAffected > 0;
    }

    async deleteCard(cardId, userId) {
        const card = await this.getCard(cardId, userId);
        if (!card) {
            return false;
        }

        const result = await this.client.execute({
            sql: 'DELETE FROM cards WHERE id = ?',
            args: [cardId],
        });
        return result.rowsAffected > 0;
    }

    // Métodos para el sistema de repaso espaciado (actualizados para usuarios)
    async getDueCards(deckId, userId, limit = 20, ignoreDate = false) {
        const result = await this.client.execute({
            sql: `SELECT c.id, c.front, c.back, c.tags, c.interval, c.ease_factor, c.repetitions, c.due_date
                  FROM cards c
                  JOIN decks d ON c.deck_id = d.id
                  WHERE c.deck_id = ? AND d.user_id = ?
                  ${ignoreDate ? '' : 'AND c.due_date <= date("now")'}
                  ORDER BY c.due_date
                  LIMIT ?`,
            args: [deckId, userId, limit],
        });
        return result.rows;
    }

    async updateCardReviewData(cardId, interval, easeFactor, repetitions, dueDate) {
        const result = await this.client.execute({
            sql: `UPDATE cards
                  SET interval = ?, ease_factor = ?, repetitions = ?, due_date = ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [interval, easeFactor, repetitions, dueDate, cardId],
        });
        return result.rowsAffected > 0;
    }

    async recordReview(cardId, quality, userId) {
        const card = await this.getCard(cardId, userId);
        if (!card) {
            return false;
        }

        const result = await this.client.execute({
            sql: 'INSERT INTO reviews (card_id, user_id, quality) VALUES (?, ?, ?)',
            args: [cardId, userId, quality],
        });
        return result.rowsAffected > 0;
    }

    // Métodos para búsqueda (actualizados para usuarios)
    async searchCards(query = '', tag = '', userId) {
        let sql = `
            SELECT c.id, c.deck_id, c.front, c.back, c.tags, d.name as deck_name
            FROM cards c
            JOIN decks d ON c.deck_id = d.id
            WHERE d.user_id = ?
        `;
        const args = [userId];

        if (query) {
            sql += ' AND (c.front LIKE ? OR c.back LIKE ?)';
            const queryParam = `%${query}%`;
            args.push(queryParam, queryParam);
        }

        if (tag) {
            sql += ' AND c.tags LIKE ?';
            args.push(`%${tag}%`);
        }

        const result = await this.client.execute({
            sql,
            args,
        });
        return result.rows;
    }

    async getAllTags(userId) {
        const result = await this.client.execute({
            sql: `SELECT c.tags
                  FROM cards c
                  JOIN decks d ON c.deck_id = d.id
                  WHERE d.user_id = ?`,
            args: [userId],
        });
        const tagsSet = new Set();

        result.rows.forEach((card) => {
            const tags = JSON.parse(card.tags);
            tags.forEach((tag) => tagsSet.add(tag));
        });
        return Array.from(tagsSet).sort();
    }

    async updateUserPassword(email, hashedPassword) {
        const result = await this.client.execute({
            sql: 'UPDATE users SET password = ? WHERE email = ?',
            args: [hashedPassword, email],
        });
        return result.rowsAffected > 0;
    }
}

export default new FlashcardsDB();
