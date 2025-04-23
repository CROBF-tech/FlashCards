// screens/AddEditCardScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function AddEditCardScreen({ route, navigation }) {
  const { deckId, card } = route.params;
  const [front, setFront] = useState(card?.front || '');
  const [back, setBack] = useState(card?.back || '');
  const [tags, setTags] = useState(card?.tags?.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert('Error', 'El frente y reverso de la tarjeta son obligatorios');
      return;
    }

    // Convertir string de tags a array
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');

    setIsSubmitting(true);
    try {
      if (card) {
        // Actualizar tarjeta existente
        await axios.put(`${API_URL}/cards/${card.id}`, { 
          front, 
          back, 
          tags: tagsArray 
        });
      } else {
        // Crear nueva tarjeta
        await axios.post(`${API_URL}/decks/${deckId}/cards`, { 
          front, 
          back, 
          tags: tagsArray 
        });
      }
      navigation.goBack();
    } catch (err) {
      console.error('Error al guardar tarjeta:', err);
      Alert.alert('Error', 'No se pudo guardar la tarjeta. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 15 }}>
      <Text style={{ marginBottom: 5 }}>Frente (Pregunta):</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 15,
          height: 100,
          textAlignVertical: 'top'
        }}
        value={front}
        onChangeText={setFront}
        placeholder="Ingrese el frente de la tarjeta"
        multiline
      />

      <Text style={{ marginBottom: 5 }}>Reverso (Respuesta):</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 15,
          height: 150,
          textAlignVertical: 'top'
        }}
        value={back}
        onChangeText={setBack}
        placeholder="Ingrese el reverso de la tarjeta"
        multiline
      />

      <Text style={{ marginBottom: 5 }}>Etiquetas (separadas por comas):</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 20
        }}
        value={tags}
        onChangeText={setTags}
        placeholder="ej: matemáticas, álgebra, fórmulas"
      />

      <Button
        title={card ? "Actualizar Tarjeta" : "Crear Tarjeta"}
        onPress={handleSubmit}
        disabled={isSubmitting}
      />
    </ScrollView>
  );
}