# app.py - API principal
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from database import Database
import datetime

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
db = Database()


# Rutas para manejo de mazos (decks)
@app.route("/decks", methods=["GET"])
def get_decks():
    """Obtener todos los mazos disponibles"""
    decks = db.get_all_decks()
    return jsonify(decks)


@app.route("/decks", methods=["POST"])
def create_deck():
    """Crear un nuevo mazo"""
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "Se requiere un nombre para el mazo"}), 400

    deck_id = db.create_deck(data["name"], data.get("description", ""))
    return jsonify({"id": deck_id, "name": data["name"]}), 201


@app.route("/decks/<int:deck_id>", methods=["GET"])
def get_deck(deck_id):
    """Obtener un mazo específico con sus tarjetas"""
    deck = db.get_deck(deck_id)
    if not deck:
        return jsonify({"error": "Mazo no encontrado"}), 404

    cards = db.get_cards_by_deck(deck_id)
    deck["cards"] = cards
    return jsonify(deck)


@app.route("/decks/<int:deck_id>", methods=["PUT"])
def update_deck(deck_id):
    """Actualizar un mazo existente"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos no proporcionados"}), 400

    success = db.update_deck(deck_id, data.get("name"), data.get("description"))
    if not success:
        return jsonify({"error": "Mazo no encontrado"}), 404

    return jsonify({"id": deck_id, "updated": True})


@app.route("/decks/<int:deck_id>", methods=["DELETE"])
def delete_deck(deck_id):
    """Eliminar un mazo"""
    success = db.delete_deck(deck_id)
    if not success:
        return jsonify({"error": "Mazo no encontrado"}), 404

    return jsonify({"deleted": True})


# Rutas para manejo de tarjetas (cards)
@app.route("/decks/<int:deck_id>/cards", methods=["POST"])
def create_card(deck_id):
    """Crear una nueva tarjeta en un mazo"""
    data = request.get_json()
    if not data or "front" not in data or "back" not in data:
        return jsonify({"error": "Se requiere frente y reverso para la tarjeta"}), 400

    card_id = db.create_card(
        deck_id=deck_id,
        front=data["front"],
        back=data["back"],
        tags=data.get("tags", []),
    )

    if card_id is None:
        return jsonify({"error": "Mazo no encontrado"}), 404

    return jsonify({"id": card_id, "deck_id": deck_id}), 201


@app.route("/cards/<int:card_id>", methods=["GET"])
def get_card(card_id):
    """Obtener una tarjeta específica"""
    card = db.get_card(card_id)
    if not card:
        return jsonify({"error": "Tarjeta no encontrada"}), 404

    return jsonify(card)


@app.route("/cards/<int:card_id>", methods=["PUT"])
def update_card(card_id):
    """Actualizar una tarjeta existente"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos no proporcionados"}), 400

    success = db.update_card(
        card_id=card_id,
        front=data.get("front"),
        back=data.get("back"),
        tags=data.get("tags"),
    )

    if not success:
        return jsonify({"error": "Tarjeta no encontrada"}), 404

    return jsonify({"id": card_id, "updated": True})


@app.route("/cards/<int:card_id>", methods=["DELETE"])
def delete_card(card_id):
    """Eliminar una tarjeta"""
    success = db.delete_card(card_id)
    if not success:
        return jsonify({"error": "Tarjeta no encontrada"}), 404

    return jsonify({"deleted": True})


# Rutas para repaso de tarjetas (usando algoritmo SM-2)
@app.route("/decks/<int:deck_id>/study", methods=["GET"])
def get_study_cards(deck_id):
    """Obtener tarjetas para estudiar de un mazo específico"""
    cards = db.get_due_cards(deck_id)
    return jsonify(cards)


@app.route("/cards/<int:card_id>/review", methods=["POST"])
def review_card(card_id):
    """Registrar revisión de una tarjeta"""
    data = request.get_json()
    if not data or "quality" not in data:
        return jsonify({"error": "Se requiere calificación de la revisión (0-5)"}), 400

    quality = int(data["quality"])
    if quality < 0 or quality > 5:
        return jsonify({"error": "La calificación debe estar entre 0 y 5"}), 400

    card = db.get_card(card_id)
    if not card:
        return jsonify({"error": "Tarjeta no encontrada"}), 404

    # Calcular nuevo intervalo, facilidad, etc. usando algoritmo SM-2
    result = calculate_sm2(
        quality,
        card.get("repetitions", 0),
        card.get("ease_factor", 2.5),
        card.get("interval", 0),
    )

    success = db.update_card_review_data(
        card_id=card_id,
        interval=result["interval"],
        ease_factor=result["ease_factor"],
        repetitions=result["repetitions"],
        due_date=result["due_date"],
    )

    if not success:
        return jsonify({"error": "Error al actualizar datos de revisión"}), 500

    return jsonify(result)


# Implementación del algoritmo SM-2 (Supermemo 2)
def calculate_sm2(quality, repetitions, ease_factor, interval):
    """
    Implementación del algoritmo SM-2 para repaso espaciado
    quality: 0-5 (qué tan bien recordó la tarjeta)
    """
    if quality < 3:
        repetitions = 0
        interval = 1
    else:
        repetitions += 1
        if repetitions == 1:
            interval = 1
        elif repetitions == 2:
            interval = 6
        else:
            interval = int(interval * ease_factor)

    # Ajustar el factor de facilidad
    ease_factor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    if ease_factor < 1.3:
        ease_factor = 1.3

    # Calcular fecha de vencimiento
    today = datetime.date.today()
    due_date = today + datetime.timedelta(days=interval)

    return {
        "interval": interval,
        "ease_factor": ease_factor,
        "repetitions": repetitions,
        "due_date": due_date.isoformat(),
    }


# Rutas para búsqueda y etiquetas
@app.route("/search", methods=["GET"])
def search_cards():
    """Buscar tarjetas por texto o etiquetas"""
    query = request.args.get("q", "")
    tag = request.args.get("tag", "")

    cards = db.search_cards(query, tag)
    return jsonify(cards)


@app.route("/tags", methods=["GET"])
def get_tags():
    """Obtener todas las etiquetas disponibles"""
    tags = db.get_all_tags()
    return jsonify(tags)


# Ruta para estadísticas
@app.route("/stats", methods=["GET"])
def get_stats():
    """Obtener estadísticas generales de estudio"""
    stats = db.get_study_stats()
    return jsonify(stats)


if __name__ == "__main__":
    # Asegurarse de que la base de datos esté inicializada
    db.init_db()
    app.run(debug=True, host="0.0.0.0", port=8000)
