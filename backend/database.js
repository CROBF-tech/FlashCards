import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config();

class FlashcardsDB {
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
    // Métodos para estadísticas (actualizados para usuarios)
    async getStudyStats(userId) {
        // Estadísticas básicas
        const totalCards = (
            await this.client.execute({
                sql: `SELECT COUNT(*) as count 
                 FROM cards c
                 JOIN decks d ON c.deck_id = d.id
                 WHERE d.user_id = ?`,
                args: [userId],
            })
        ).rows[0].count;

        const totalDecks = (
            await this.client.execute({ sql: `SELECT COUNT(*) as count FROM decks WHERE user_id = ?`, args: [userId] })
        ).rows[0].count;

        const dueToday = (
            await this.client.execute({
                sql: `SELECT COUNT(*) as count 
                 FROM cards c
                 JOIN decks d ON c.deck_id = d.id
                 WHERE d.user_id = ? AND c.due_date <= date('now')`,
                args: [userId],
            })
        ).rows[0].count;

        // Estadísticas de revisiones
        const reviewStats = (
            await this.client.execute({
                sql: `SELECT 
                    COUNT(*) as total_reviews,
                    COUNT(DISTINCT date(timestamp)) as study_days,
                    AVG(quality) as avg_quality,
                    SUM(CASE WHEN quality >= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as mastery_rate
                 FROM reviews 
                 WHERE user_id = ? 
                 AND timestamp >= date('now', '-30 days')`,
                args: [userId],
            })
        ).rows[0];

        // Revisiones por día de la última semana
        const reviewsLastWeek = (
            await this.client.execute({
                sql: `SELECT 
                    date(timestamp) as date,
                    COUNT(*) as count
                 FROM reviews 
                 WHERE user_id = ? 
                 AND timestamp >= date('now', '-7 days')
                 GROUP BY date(timestamp)
                 ORDER BY date`,
                args: [userId],
            })
        ).rows;

        // Estadísticas de calidad
        const qualityDistribution = (
            await this.client.execute({
                sql: `SELECT 
                    quality,
                    COUNT(*) as count
                 FROM reviews 
                 WHERE user_id = ? 
                 AND timestamp >= date('now', '-30 days')
                 GROUP BY quality
                 ORDER BY quality`,
                args: [userId],
            })
        ).rows;

        // Progreso diario
        const todaysProgress = (
            await this.client.execute({
                sql: `SELECT 
                    COUNT(*) as reviews_today,
                    AVG(quality) as today_avg_quality
                 FROM reviews 
                 WHERE user_id = ? 
                 AND date(timestamp) = date('now')`,
                args: [userId],
            })
        ).rows[0];

        return {
            // Estadísticas básicas
            total_cards: totalCards,
            total_decks: totalDecks,
            due_today: dueToday,

            // Estadísticas de revisión
            reviews_last_week: reviewsLastWeek.reduce((acc, day) => acc + day.count, 0),
            daily_reviews: reviewsLastWeek,
            avg_quality: Math.round(reviewStats.avg_quality * 100) / 100,
            mastery_rate: Math.round(reviewStats.mastery_rate * 100) / 100,
            study_days: reviewStats.study_days,
            total_reviews: reviewStats.total_reviews,

            // Calidad y progreso
            quality_distribution: qualityDistribution,
            today: {
                reviews: todaysProgress.reviews_today || 0,
                avg_quality: Math.round((todaysProgress.today_avg_quality || 0) * 100) / 100,
            },
        };
    }

    async deleteUser(userId) {
        try {
            const result = await this.client.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [userId] });
            return result.rowsAffected > 0;
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            throw error;
        }
    }

    // Métodos para manejo de PDFs y generación de flashcards
    async createPdfImport(userId, deckId, originalName, status = 'processing') {
        try {
            const result = await this.client.execute({
                sql: `INSERT INTO pdf_imports (user_id, deck_id, file_name, original_name, status, created_at) 
                      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id`,
                args: [userId, deckId, null, originalName, status], // file_name como null porque no guardamos archivos
            });
            return result.rows[0].id;
        } catch (error) {
            console.error('Error al crear registro de importación PDF:', error);
            throw error;
        }
    }

    async updatePdfImportStatus(importId, status, errorMessage = null) {
        try {
            const result = await this.client.execute({
                sql: `UPDATE pdf_imports SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                args: [status, errorMessage, importId],
            });
            return result.rowsAffected > 0;
        } catch (error) {
            console.error('Error al actualizar estado de importación PDF:', error);
            throw error;
        }
    }

    async getPdfImportsByUser(userId) {
        try {
            const result = await this.client.execute({
                sql: `SELECT pi.*, d.name as deck_name 
                      FROM pdf_imports pi 
                      LEFT JOIN decks d ON pi.deck_id = d.id 
                      WHERE pi.user_id = ? 
                      ORDER BY pi.created_at DESC`,
                args: [userId],
            });
            return result.rows;
        } catch (error) {
            console.error('Error al obtener importaciones PDF del usuario:', error);
            throw error;
        }
    }

    async createBulkCards(deckId, cards) {
        try {
            const results = [];
            for (const card of cards) {
                const result = await this.client.execute({
                    sql: `INSERT INTO cards (deck_id, front, back, tags, created_at, updated_at) 
                          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
                    args: [deckId, card.front, card.back, JSON.stringify(card.tags || [])],
                });
                results.push(result.rows[0].id);
            }
            return results;
        } catch (error) {
            console.error('Error al crear tarjetas en lote:', error);
            throw error;
        }
    }

    async getCard(cardId, userId) {
        try {
            const result = await this.client.execute({
                sql: `SELECT c.* FROM cards c 
                      JOIN decks d ON c.deck_id = d.id 
                      WHERE c.id = ? AND d.user_id = ?`,
                args: [cardId, userId],
            });
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error al obtener tarjeta:', error);
            throw error;
        }
    }
}

export default new FlashcardsDB();
