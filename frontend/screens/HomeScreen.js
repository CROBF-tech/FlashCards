// screens/HomeScreen.js
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Button,
    ActivityIndicator,
} from "react-native";
import axios from "axios";
import { API_URL } from "../config";

export default function HomeScreen({ navigation }) {
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDecks();
    }, []);

    // Refrescar al volver a esta pantalla
    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            fetchDecks();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchDecks = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/decks`);
            setDecks(response.data);
            setError(null);
        } catch (err) {
            console.error("Error al obtener mazos:", err);
            setError("Error al cargar los mazos. Intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const renderDeckItem = ({ item }) => (
        <TouchableOpacity
            style={{
                padding: 15,
                borderBottomWidth: 1,
                borderBottomColor: "#ccc",
            }}
            onPress={() =>
                navigation.navigate("Deck", {
                    deckId: item.id,
                    deckName: item.name,
                })
            }>
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
            {item.description ? (
                <Text style={{ color: "#666", marginTop: 5 }}>
                    {item.description}
                </Text>
            ) : null}
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1 }}>
            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : error ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: "red", marginBottom: 10 }}>
                        {error}
                    </Text>
                    <Button title="Reintentar" onPress={fetchDecks} />
                </View>
            ) : (
                <FlatList
                    data={decks}
                    renderItem={renderDeckItem}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={
                        <Text style={{ padding: 20, textAlign: "center" }}>
                            No hay mazos disponibles. Crea uno nuevo.
                        </Text>
                    }
                />
            )}

            <View
                style={{
                    flexDirection: "row",
                    padding: 10,
                    justifyContent: "space-around",
                }}>
                <Button
                    title="Nuevo Mazo"
                    onPress={() => navigation.navigate("AddEditDeck")}
                />
                <Button
                    title="Buscar"
                    onPress={() => navigation.navigate("Search")}
                />
                <Button
                    title="Estadísticas"
                    onPress={() => navigation.navigate("Stats")}
                />
            </View>
        </View>
    );
}
