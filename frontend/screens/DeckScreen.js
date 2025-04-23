// screens/DeckScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function DeckScreen({ route, navigation }) {
  const { deckId, deckName } = route.params;
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDeckDetails();
  }, [deckId]);

  // Refrescar al volver a esta pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDeckDetails();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchDeckDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/decks/${deckId}`);
      setDeck(response.data);
      setCards(response.data.cards || []);
      setError(null);
    } catch (err) {
      console.error('Error al obtener detalles del mazo:', err);
      setError('Error al cargar el mazo. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const deleteDeck = async () => {
    Alert.alert(
      "Eliminar Mazo",
      "¿Estás seguro de que quieres eliminar este mazo? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/decks/${deckId}`);
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", "No se pudo eliminar el mazo.");
            }
          }
        }
      ]
    );
  };

  const deleteCard = async (cardId) => {
    Alert.alert(
      "Eliminar Tarjeta",
      "¿Estás seguro de que quieres eliminar esta tarjeta?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/cards/${cardId}`);
              fetchDeckDetails(); // Refrescar tarjetas
            } catch (err) {
              Alert.alert("Error", "No se pudo eliminar la tarjeta.");
            }
          }
        }
      ]
    );
  };

  const renderCardItem = ({ item }) => (
    <View style={{ 
      padding: 15, 
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
      flexDirection: 'row',
      justifyContent: 'space-between'
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16 }}>{item.front}</Text>
        <Text style={{ color: '#666', marginTop: 5 }}>{item.back}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AddEditCard', { deckId, card: item })}
          style={{ padding: 5, marginRight: 10 }}
        >
          <Text style={{ color: 'blue' }}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => deleteCard(item.id)}
          style={{ padding: 5 }}
        >
          <Text style={{ color: 'red' }}>Borrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
        <Button title="Reintentar" onPress={fetchDeckDetails} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={cards}
        renderItem={renderCardItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={{ padding: 15, backgroundColor: '#f0f0f0' }}>
            <Text style={{ fontSize: 18, marginBottom: 5 }}>{deck?.name}</Text>
            {deck?.description ? (
              <Text style={{ color: '#666' }}>{deck.description}</Text>
            ) : null}
            <Text style={{ marginTop: 10 }}>
              {cards.length} tarjeta{cards.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ padding: 20, textAlign: 'center' }}>
            No hay tarjetas en este mazo. Añade una nueva.
          </Text>
        }
      />
      
      <View style={{ flexDirection: 'row', padding: 10, justifyContent: 'space-around' }}>
        <Button
          title="Añadir Tarjeta"
          onPress={() => navigation.navigate('AddEditCard', { deckId })}
        />
        <Button
          title="Estudiar"
          onPress={() => navigation.navigate('Study', { deckId, deckName })}
          disabled={cards.length === 0}
        />
        <Button
          title="Editar Mazo"
          onPress={() => navigation.navigate('AddEditDeck', { deck })}
        />
        <Button
          title="Eliminar Mazo"
          onPress={deleteDeck}
          color="red"
        />
      </View>
    </View>
  );
}