// screens/SearchScreen.js
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Button,
    ActivityIndicator,
} from "react-native";
import axios from "axios";
import { API_URL } from "../config";

export default function SearchScreen({ navigation }) {
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState("");
    const [results, setResults] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tagsLoading, setTagsLoading] = useState(true);

    useEffect(() => {
        // Cargar todas las etiquetas disponibles
        const fetchTags = async () => {
            try {
                const response = await axios.get(`${API_URL}/tags`);
                setAllTags(response.data);
            } catch (err) {
                console.error("Error al obtener etiquetas:", err);
            } finally {
                setTagsLoading(false);
            }
        };

        fetchTags();
    }, []);

    const handleSearch = async () => {
        if (!query.trim() && !tag.trim()) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.append("q", query.trim());
            if (tag.trim()) params.append("tag", tag.trim());

            const response = await axios.get(
                `${API_URL}/search?${params.toString()}`
            );
            setResults(response.data);
        } catch (err) {
            console.error("Error en la búsqueda:", err);
            alert("Error al realizar la búsqueda. Intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const renderCardItem = ({ item }) => (
        <TouchableOpacity
            style={{
                padding: 15,
                borderBottomWidth: 1,
                borderBottomColor: "#ccc",
            }}
            onPress={() =>
                navigation.navigate("Deck", {
                    deckId: item.deck_id,
                    deckName: item.deck_name,
                })
            }>
            <Text style={{ fontSize: 16 }}>{item.front}</Text>
            <Text style={{ color: "#666", marginTop: 5 }}>{item.back}</Text>
            <View style={{ flexDirection: "row", marginTop: 5 }}>
                <Text style={{ color: "#888" }}>Mazo: {item.deck_name}</Text>
                {item.tags && item.tags.length > 0 && (
                    <Text style={{ color: "#888", marginLeft: 10 }}>
                        Etiquetas: {item.tags.join(", ")}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderTagItem = ({ item }) => (
        <TouchableOpacity
            style={{
                backgroundColor: tag === item ? "#ddd" : "#f0f0f0",
                padding: 8,
                borderRadius: 15,
                margin: 5,
            }}
            onPress={() => setTag(tag === item ? "" : item)}>
            <Text>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, padding: 15 }}>
            <Text style={{ marginBottom: 5 }}>Buscar:</Text>
            <TextInput
                style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 5,
                    padding: 10,
                    marginBottom: 15,
                }}
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar término..."
            />

            <Text style={{ marginBottom: 5 }}>Filtrar por etiqueta:</Text>
            {tagsLoading ? (
                <ActivityIndicator
                    size="small"
                    style={{ marginVertical: 10 }}
                />
            ) : (
                <FlatList
                    data={allTags}
                    renderItem={renderTagItem}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ maxHeight: 50, marginBottom: 15 }}
                />
            )}

            <Button
                title="Buscar"
                onPress={handleSearch}
                disabled={loading || (!query.trim() && !tag.trim())}
            />

            <Text style={{ marginTop: 20, marginBottom: 10 }}>Resultados:</Text>
            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderCardItem}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={
                        <Text style={{ padding: 20, textAlign: "center" }}>
                            {query.trim() || tag.trim()
                                ? "No se encontraron resultados"
                                : "Realiza una búsqueda para ver resultados"}
                        </Text>
                    }
                />
            )}
        </View>
    );
}
