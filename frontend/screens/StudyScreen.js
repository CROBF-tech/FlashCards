// screens/StudyScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Button, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function StudyScreen({ route, navigation }) {
  const { deckId, deckName } = route.params;
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyComplete, setStudyComplete] = useState(false);

  useEffect(() => {
    fetchDueCards();
  }, [deckId]);

  const fetchDueCards = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/decks/${deckId}/study`);
      setCards(response.data);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setStudyComplete(response.data.length === 0);
      setError(null);
    } catch (err) {
      console.error('Error al obtener tarjetas para estudiar:', err);
      setError('Error al cargar las tarjetas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (quality) => {
    if (currentCardIndex >= cards.length) return;
    
    const currentCard = cards[currentCardIndex];
    
    try {
      await axios.post(`${API_URL}/cards/${currentCard.id}/review`, { quality });
      
      // Avanzar a la siguiente tarjeta
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setShowAnswer(false);
      } else {
        setStudyComplete(true);
      }
    } catch (err) {
      console.error('Error al enviar revisión:', err);
      alert('Error al registrar la revisión. Intente nuevamente.');
    }
  };

  const renderQualityButtons = () => {
    const qualities = [
      { value: 0, label: 'Olvidé', color: '#ff6b6b' },
      { value: 3, label: 'Difícil', color: '#ffa94d' },
      { value: 4, label: 'Bien', color: '#69db7c' },
      { value: 5, label: 'Fácil', color: '#4dabf7' }
    ];

    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
        {qualities.map((q) => (
          <TouchableOpacity
            key={q.value}
            style={{
              backgroundColor: q.color,
              padding: 10,
              borderRadius: 5,
              minWidth: 70,
              alignItems: 'center'
            }}
            onPress={() => handleReview(q.value)}
          >
            <Text style={{ color: 'white' }}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
        <Button title="Reintentar" onPress={fetchDueCards} />
      </View>
    );
  }

  if (studyComplete) {
    return (
      <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>
          ¡Felicidades! Has completado todas las tarjetas para hoy.
        </Text>
        <Button title="Volver al Mazo" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <View style={{ flex: 1, padding: 15 }}>
      <Text style={{ textAlign: 'center', marginBottom: 10 }}>
        Tarjeta {currentCardIndex + 1} de {cards.length}
      </Text>

      <View style={{ 
        flex: 1, 
        backgroundColor: '#f9f9f9', 
        borderRadius: 10,
        padding: 15,
        marginBottom: 15
      }}>
        <ScrollView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Pregunta:</Text>
          <Text style={{ fontSize: 16 }}>{currentCard.front}</Text>

          {showAnswer && (
            <View style={{ marginTop: 30 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Respuesta:</Text>
              <Text style={{ fontSize: 16 }}>{currentCard.back}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {!showAnswer ? (
        <Button
          title="Mostrar Respuesta"
          onPress={() => setShowAnswer(true)}
        />
      ) : (
        renderQualityButtons()
      )}
    </View>
  );
}