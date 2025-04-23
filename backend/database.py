# database.py - Módulo para interactuar con la base de datos Turso
import os
import json
import datetime
from typing import List, Dict, Any, Optional, Union
import libsql_experimental as libsql


class Database:
    def __init__(self):
        """
        Inicializa la conexión con la base de datos Turso
        usando las credenciales del archivo .env y libsql_experimental.
        """
        self.url = os.getenv("TURSO_DATABASE_URL")
        self.auth_token = os.getenv("TURSO_AUTH_TOKEN")
        self.db_file = "flashcards.db"  # Nombre del archivo de la base de datos local

        if not self.url or not self.auth_token:
            raise ValueError("Faltan variables de entorno para la conexión con Turso")

        self.conn = libsql.connect(
            self.db_file, sync_url=self.url, auth_token=self.auth_token
        )
        self.sync_db()  # Sincronizar al inicializar

    def sync_db(self):
        """Sincroniza la base de datos local con la réplica remota (si está configurada)"""
        try:
            self.conn.sync()
        except Exception as e:
            print(f"Error al sincronizar la base de datos: {e}")

    def _execute(self, sql: str, params: List[Any] = None):
        """Ejecuta una consulta SQL y realiza un commit y sincronización"""
        cursor = self.conn.cursor()
        try:
            cursor.execute(sql, tuple(params) if params else ())
            self.conn.commit()
            self.sync_db()
            return cursor
        except Exception as e:
            print(f"Error al ejecutar la consulta: {sql} - {e}")
            return None

    def init_db(self):
        """Inicializa la estructura de la base de datos si no existe"""
        cursor = self._execute(
            """
        CREATE TABLE IF NOT EXISTS decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        )
        if not cursor:
            return

        cursor = self._execute(
            """
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
        """
        )
        if not cursor:
            return

        cursor = self._execute(
            """
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            quality INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        )
        """
        )
        if not cursor:
            return

        self._execute("CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id)")
        self._execute(
            "CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date)"
        )
        self._execute(
            "CREATE INDEX IF NOT EXISTS idx_reviews_card_id ON reviews(card_id)"
        )

    # Métodos para manejar mazos (decks)
    def create_deck(self, name: str, description: str = "") -> Optional[int]:
        """Crea un nuevo mazo y devuelve su ID"""
        cursor = self._execute(
            """
        INSERT INTO decks (name, description) VALUES (?, ?)
        """,
            [name, description],
        )
        return cursor.lastrowid if cursor else None

    def get_all_decks(self) -> List[Dict[str, Any]]:
        """Obtiene todos los mazos"""
        cursor = self._execute(
            """
        SELECT id, name, description, created_at FROM decks
        ORDER BY name
        """
        )
        decks = []
        if cursor:
            for row in cursor.fetchall():
                decks.append(
                    {
                        "id": row[0],
                        "name": row[1],
                        "description": row[2],
                        "created_at": row[3],
                    }
                )
        return decks

    def get_deck(self, deck_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene un mazo específico por su ID"""
        cursor = self._execute(
            """
            SELECT id, name, description, created_at FROM decks
            WHERE id = ?
            """,
            [deck_id],
        )
        row = cursor.fetchone() if cursor else None
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "created_at": row[3],
            }
        return None

    def update_deck(
        self, deck_id: int, name: str = None, description: str = None
    ) -> bool:
        """Actualiza un mazo existente"""
        if name is None and description is None:
            return False

        current = self.get_deck(deck_id)
        if not current:
            return False

        new_name = name if name is not None else current["name"]
        new_desc = description if description is not None else current["description"]

        cursor = self._execute(
            """
        UPDATE decks SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
            [new_name, new_desc, deck_id],
        )
        return bool(cursor)

    def delete_deck(self, deck_id: int) -> bool:
        """Elimina un mazo y todas sus tarjetas"""
        if not self.get_deck(deck_id):
            return False

        self._execute("DELETE FROM cards WHERE deck_id = ?", [deck_id])
        cursor = self._execute("DELETE FROM decks WHERE id = ?", [deck_id])
        return bool(cursor)

    # Métodos para manejar tarjetas (cards)
    def create_card(
        self, deck_id: int, front: str, back: str, tags: List[str] = None
    ) -> Optional[int]:
        """Crea una nueva tarjeta en un mazo"""
        if not self.get_deck(deck_id):
            return None

        tags_json = json.dumps(tags or [])

        cursor = self._execute(
            """
        INSERT INTO cards (deck_id, front, back, tags, due_date)
        VALUES (?, ?, ?, ?, CURRENT_DATE)
        
        """,
            [deck_id, front, back, tags_json],
        )
        if cursor and cursor.lastrowid is not None:
            return cursor.lastrowid
        return None

    def get_cards_by_deck(self, deck_id: int) -> List[Dict[str, Any]]:
        """Obtiene todas las tarjetas de un mazo"""
        cursor = self._execute(
            """
        SELECT id, front, back, tags, interval, ease_factor, repetitions, due_date
        FROM cards
        WHERE deck_id = ?
        """,
            [deck_id],
        )
        cards = []
        if cursor:
            for row in cursor.fetchall():
                cards.append(
                    {
                        "id": row[0],
                        "front": row[1],
                        "back": row[2],
                        "tags": json.loads(row[3]),
                        "interval": row[4],
                        "ease_factor": row[5],
                        "repetitions": row[6],
                        "due_date": row[7],
                    }
                )
        return cards

    def get_card(self, card_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene una tarjeta específica por su ID"""
        cursor = self._execute(
            """
            SELECT id, deck_id, front, back, tags, interval, ease_factor, repetitions, due_date
            FROM cards
            WHERE id = ?
            """,
            [card_id],
        )
        row = cursor.fetchone() if cursor else None  # Guardamos la fila en una variable
        if row:  # Verificamos si row no es None
            return {
                "id": row[0],
                "deck_id": row[1],
                "front": row[2],
                "back": row[3],
                "tags": json.loads(row[4]) if row[4] else [],
                "interval": row[5],
                "ease_factor": row[6],
                "repetitions": row[7],
                "due_date": row[8],
            }
        return None

    def update_card(
        self, card_id: int, front: str = None, back: str = None, tags: List[str] = None
    ) -> bool:
        """Actualiza una tarjeta existente"""
        card = self.get_card(card_id)
        if not card:
            return False

        new_front = front if front is not None else card["front"]
        new_back = back if back is not None else card["back"]

        if tags is not None:
            new_tags = json.dumps(tags)
        else:
            new_tags = json.dumps(card["tags"])

        cursor = self._execute(
            """
        UPDATE cards
        SET front = ?, back = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
            [new_front, new_back, new_tags, card_id],
        )
        return bool(cursor)

    def delete_card(self, card_id: int) -> bool:
        """Elimina una tarjeta"""
        if not self.get_card(card_id):
            return False

        self._execute("DELETE FROM reviews WHERE card_id = ?", [card_id])
        cursor = self._execute("DELETE FROM cards WHERE id = ?", [card_id])
        return bool(cursor)

    # Métodos para el algoritmo de repaso espaciado
    def get_due_cards(self, deck_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Obtiene tarjetas que deben ser repasadas hoy"""
        today = datetime.date.today().isoformat()

        cursor = self._execute(
            """
        SELECT id, front, back, tags, interval, ease_factor, repetitions, due_date
        FROM cards
        WHERE deck_id = ? AND due_date <= ?
        ORDER BY due_date
        LIMIT ?
        """,
            [deck_id, today, limit],
        )
        cards = []
        if cursor:
            for row in cursor.fetchall():
                cards.append(
                    {
                        "id": row[0],
                        "front": row[1],
                        "back": row[2],
                        "tags": json.loads(row[3]),
                        "interval": row[4],
                        "ease_factor": row[5],
                        "repetitions": row[6],
                        "due_date": row[7],
                    }
                )
        return cards

    def update_card_review_data(
        self,
        card_id: int,
        interval: int,
        ease_factor: float,
        repetitions: int,
        due_date: str,
    ) -> bool:
        """Actualiza los datos de revisión de una tarjeta"""
        if not self.get_card(card_id):
            return False

        cursor = self._execute(
            """
        UPDATE cards
        SET interval = ?, ease_factor = ?, repetitions = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
            [interval, ease_factor, repetitions, due_date, card_id],
        )
        return bool(cursor)

    def record_review(self, card_id: int, quality: int) -> bool:
        """Registra una revisión de tarjeta"""
        if not self.get_card(card_id):
            return False

        cursor = self._execute(
            """
        INSERT INTO reviews (card_id, quality)
        VALUES (?, ?)
        """,
            [card_id, quality],
        )
        return bool(cursor)

    # Métodos para búsqueda y etiquetas
    def search_cards(self, query: str = "", tag: str = "") -> List[Dict[str, Any]]:
        """Busca tarjetas por texto o etiquetas"""
        sql = """
        SELECT c.id, c.deck_id, c.front, c.back, c.tags, d.name as deck_name
        FROM cards c
        JOIN decks d ON c.deck_id = d.id
        WHERE 1=1
        """
        params = []

        if query:
            sql += " AND (c.front LIKE ? OR c.back LIKE ?)"
            query_param = f"%{query}%"
            params.extend([query_param, query_param])

        if tag:
            sql += " AND c.tags LIKE ?"
            params.append(f"%{tag}%")

        cursor = self._execute(sql, params)
        cards = []
        if cursor:
            for row in cursor.fetchall():
                cards.append(
                    {
                        "id": row[0],
                        "deck_id": row[1],
                        "front": row[2],
                        "back": row[3],
                        "tags": json.loads(row[4]),
                        "deck_name": row[5],
                    }
                )
        return cards

    def get_all_tags(self) -> List[str]:
        """Obtiene todas las etiquetas únicas usadas en las tarjetas"""
        cursor = self._execute("SELECT tags FROM cards")
        all_tags = set()
        if cursor:
            for row in cursor.fetchall():
                tags = json.loads(row[0])
                all_tags.update(tags)
        return sorted(list(all_tags))

    # Métodos para estadísticas
    def get_study_stats(self) -> Dict[str, Any]:
        """Obtiene estadísticas generales de estudio"""
        total_cards_result = self._execute("SELECT COUNT(*) FROM cards")
        total_cards_row = total_cards_result.fetchone()
        total_cards = total_cards_row[0] if total_cards_row else 0

        total_decks_result = self._execute("SELECT COUNT(*) FROM decks")
        total_decks_row = total_decks_result.fetchone()
        total_decks = total_decks_row[0] if total_decks_row else 0

        today = datetime.date.today().isoformat()
        due_today_result = self._execute(
            "SELECT COUNT(*) FROM cards WHERE due_date <= ?", [today]
        )
        due_today_row = due_today_result.fetchone()
        due_today = due_today_row[0] if due_today_row else 0

        one_week_ago = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
        reviews_last_week_result = self._execute(
            "SELECT COUNT(*) FROM reviews WHERE timestamp >= ?", [one_week_ago]
        )
        reviews_last_week_row = reviews_last_week_result.fetchone()
        reviews_last_week = reviews_last_week_row[0] if reviews_last_week_row else 0

        avg_quality_result = self._execute("SELECT AVG(quality) FROM reviews")
        avg_quality_row = avg_quality_result.fetchone()
        avg_quality = (
            avg_quality_row[0]
            if avg_quality_row and avg_quality_row[0] is not None
            else 0
        )

        return {
            "total_cards": total_cards,
            "total_decks": total_decks,
            "due_today": due_today,
            "reviews_last_week": reviews_last_week,
            "avg_quality": round(avg_quality, 2),
        }
