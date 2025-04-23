// screens/AddEditDeckScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function AddEditDeckScreen({ route, navigation }) {
  const existingDeck = route.params?.deck;
  const [name, setName] = useState(existingDeck?.name || '');
  const [description, setDescription] = useState(existingDeck?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre del mazo es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingDeck) {
        // Actualizar mazo existente
        await axios.put(`${API_URL}/decks/${existingDeck.id}`, { name, description });
      } else {
        // Crear nuevo mazo
        await axios.post(`${API_URL}/decks`, { name, description });
      }
      navigation.goBack();
    } catch (err) {
      console.error('Error al guardar mazo:', err);
      Alert.alert('Error', 'No se pudo guardar el mazo. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 15 }}>
      <Text style={{ marginBottom: 5 }}>Nombre del Mazo:</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 15
        }}
        value={name}
        onChangeText={setName}
        placeholder="Ingrese el nombre del mazo"
      />

      <Text style={{ marginBottom: 5 }}>Descripción (opcional):</Text>
      <TextInput
        style={{ 
          borderWidth: 1, 
          borderColor: '#ccc',
          borderRadius: 5,
          padding: 10,
          marginBottom: 20,
          height: 100,
          textAlignVertical: 'top'
        }}
        value={description}
        onChangeText={setDescription}
        placeholder="Ingrese una descripción"
        multiline
      />

      <Button
        title={existingDeck ? "Actualizar Mazo" : "Crear Mazo"}
        onPress={handleSubmit}
        disabled={isSubmitting}
      />
    </View>
  );
}