const { createClient } = require('@libsql/client');
require('dotenv').config();

class FlashcardsDB {
    constructor() {
        this.client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        this.initDB();
    }

    async initDB() {
        // Crear tabla decks
        await this.client.execute(`
            CREATE TABLE IF NOT EXISTS decks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                quality INTEGER NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
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
    }

    // Métodos para mazos
    async getDeck(deckId) {
        try {
            const result = await this.client.execute({
                sql: 'SELECT id, name, description, created_at FROM decks WHERE id = ?',
                args: [deckId],
            });
            return result.rows[0];
        } catch (error) {
            console.error('Error al obtener mazo:', error);
            throw error;
        }
    }

    async getAllDecks() {
        const result = await this.client.execute('SELECT id, name, description, created_at FROM decks ORDER BY name');
        return result.rows;
    }

    async createDeck(name, description = '') {
        const result = await this.client.execute({
            sql: 'INSERT INTO decks (name, description) VALUES (?, ?) RETURNING id',
            args: [name, description],
        });
        return result.rows[0].id;
    }

    async updateDeck(name, description, deckId) {
        const result = await this.client.execute({
            sql: 'UPDATE decks SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [name, description, deckId],
        });
        return result.rowsAffected > 0;
    }

    async deleteDeck(deckId) {
        const result = await this.client.execute({
            sql: 'DELETE FROM decks WHERE id = ?',
            args: [deckId],
        });
        return result.rowsAffected > 0;
    }

    // Métodos para tarjetas
    async getCardsByDeck(deckId) {
        const result = await this.client.execute({
            sql: `SELECT id, front, back, tags, interval, ease_factor, repetitions, due_date 
                  FROM cards WHERE deck_id = ?`,
            args: [deckId],
        });
        return result.rows;
    }

    async getCard(cardId) {
        const result = await this.client.execute({
            sql: `SELECT id, deck_id, front, back, tags, interval, ease_factor, repetitions, due_date
                  FROM cards WHERE id = ?`,
            args: [cardId],
        });
        return result.rows[0];
    }

    async createCard(deckId, front, back, tags = []) {
        const result = await this.client.execute({
            sql: `INSERT INTO cards (deck_id, front, back, tags, due_date)
                  VALUES (?, ?, ?, ?, date('now')) RETURNING id`,
            args: [deckId, front, back, JSON.stringify(tags)],
        });
        return result.rows[0].id;
    }

    async updateCard(cardId, front, back, tags) {
        const result = await this.client.execute({
            sql: `UPDATE cards 
                  SET front = ?, back = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [front, back, JSON.stringify(tags), cardId],
        });
        return result.rowsAffected > 0;
    }

    async deleteCard(cardId) {
        const result = await this.client.execute({ sql: `DELETE FROM cards WHERE id = ?`, args: [cardId] });
        return result.rowsAffected > 0;
    }

    // Métodos para el sistema de repaso espaciado
    async getDueCards(deckId, limit = 20) {
        const result = await this.client.execute({
            sql: `SELECT id, front, back, tags, interval, ease_factor, repetitions, due_date
                  FROM cards
                  WHERE deck_id = ? AND due_date <= date('now')
                  ORDER BY due_date
                  LIMIT ?`,
            args: [deckId, limit],
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

    async recordReview(cardId, quality) {
        const result = await this.client.execute({
            sql: 'INSERT INTO reviews (card_id, quality) VALUES (?, ?)',
            args: [cardId, quality],
        });
        return result.rowsAffected > 0;
    }

    // Métodos para búsqueda
    async searchCards(query = '', tag = '') {
        let sql = `
            SELECT c.id, c.deck_id, c.front, c.back, c.tags, d.name as deck_name
            FROM cards c
            JOIN decks d ON c.deck_id = d.id
            WHERE 1=1
        `;
        const args = [];

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

    async getAllTags() {
        const result = await this.client.execute('SELECT tags FROM cards');
        const tagsSet = new Set();

        result.rows.forEach((card) => {
            const tags = JSON.parse(card.tags);
            tags.forEach((tag) => tagsSet.add(tag));
        });

        return Array.from(tagsSet).sort();
    }

    // Métodos para estadísticas
    async getStudyStats() {
        const totalCards = (await this.client.execute('SELECT COUNT(*) as count FROM cards')).rows[0].count;
        const totalDecks = (await this.client.execute('SELECT COUNT(*) as count FROM decks')).rows[0].count;
        const dueToday = (
            await this.client.execute("SELECT COUNT(*) as count FROM cards WHERE due_date <= date('now')")
        ).rows[0].count;
        const reviewsLastWeek = (
            await this.client.execute("SELECT COUNT(*) as count FROM reviews WHERE timestamp >= date('now', '-7 days')")
        ).rows[0].count;
        const avgQualityResult = await this.client.execute('SELECT AVG(quality) as avg FROM reviews');
        const avgQuality = avgQualityResult.rows[0].avg || 0;

        return {
            total_cards: totalCards,
            total_decks: totalDecks,
            due_today: dueToday,
            reviews_last_week: reviewsLastWeek,
            avg_quality: Math.round(avgQuality * 100) / 100,
        };
    }
}

module.exports = new FlashcardsDB();
