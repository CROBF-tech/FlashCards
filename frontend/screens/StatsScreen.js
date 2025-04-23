// screens/StatsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Button, RefreshControl } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
      setError('Error al cargar estadísticas. Intente nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading && !refreshing) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
        <Button title="Reintentar" onPress={fetchStats} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={{ flex: 1, padding: 15 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>Estadísticas de Estudio</Text>
      
      <View style={{ backgroundColor: '#f0f0f0', padding: 15, marginBottom: 15, borderRadius: 5 }}>
        <Text style={{ fontSize: 16, marginBottom: 5 }}>Total de mazos: {stats?.total_decks || 0}</Text>
        <Text style={{ fontSize: 16, marginBottom: 5 }}>Total de tarjetas: {stats?.total_cards || 0}</Text>
      </View>
      
      <View style={{ backgroundColor: '#f0f0f0', padding: 15, marginBottom: 15, borderRadius: 5 }}>
        <Text style={{ fontSize: 16, marginBottom: 5 }}>Tarjetas a estudiar hoy: {stats?.due_today || 0}</Text>
        <Text style={{ fontSize: 16, marginBottom: 5 }}>Revisiones en la última semana: {stats?.reviews_last_week || 0}</Text>
      </View>
      
      <View style={{ backgroundColor: '#f0f0f0', padding: 15, borderRadius: 5 }}>
        <Text style={{ fontSize: 16 }}>Calidad promedio de revisiones: {stats?.avg_quality || 0}/5</Text>
      </View>
    </ScrollView>
  );
}