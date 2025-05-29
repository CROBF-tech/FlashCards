// screens/SearchScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import api from '../utils/api';
import { theme, styles as globalStyles } from '../theme';

export default function SearchScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [tag, setTag] = useState('');
    const [results, setResults] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tagsLoading, setTagsLoading] = useState(true);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const response = await api.get('/tags');
            setAllTags(response.data);
        } catch (err) {
            console.error('Error al obtener etiquetas:', err);
        } finally {
            setTagsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!query.trim() && !tag.trim()) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.append('q', query.trim());
            if (tag.trim()) params.append('tag', tag.trim());

            const response = await api.get(`/search?${params.toString()}`);
            setResults(response.data);
        } catch (err) {
            console.error('Error en la búsqueda:', err);
            alert('Error al realizar la búsqueda. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const TagChip = ({ label, selected, onPress }) => (
        <TouchableOpacity style={[styles.tagChip, selected && styles.tagChipSelected]} onPress={onPress}>
            <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderCardItem = ({ item }) => (
        <TouchableOpacity
            style={styles.cardItem}
            onPress={() =>
                navigation.navigate('Deck', {
                    deckId: item.deck_id,
                    deckName: item.deck_name,
                })
            }
        >
            <View style={styles.cardContent}>
                <Text style={styles.cardQuestion}>{item.front}</Text>
                <Text style={styles.cardAnswer}>{item.back}</Text>
                <View style={styles.cardFooter}>
                    <View style={styles.deckInfo}>
                        <AntDesign name="folder1" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.deckName}>{item.deck_name}</Text>
                    </View>
                    {item.tags && item.tags.length > 0 && (
                        <View style={styles.cardTags}>
                            <AntDesign name="tags" size={16} color={theme.colors.text.secondary} />
                            <Text style={styles.tagsText}>{item.tags.join(', ')}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={globalStyles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <AntDesign name="search1" size={20} color={theme.colors.text.secondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Buscar tarjetas..."
                        placeholderTextColor={theme.colors.text.disabled}
                        onSubmitEditing={handleSearch}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                            <AntDesign name="close" size={20} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.tagsLabel}>Filtrar por etiqueta:</Text>
                {tagsLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} style={styles.tagsLoading} />
                ) : (
                    <FlatList
                        data={allTags}
                        renderItem={({ item }) => (
                            <TagChip
                                label={item}
                                selected={tag === item}
                                onPress={() => setTag(tag === item ? '' : item)}
                            />
                        )}
                        keyExtractor={(item) => item}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.tagsList}
                    />
                )}

                <TouchableOpacity
                    style={[styles.searchButton, !query.trim() && !tag.trim() && styles.searchButtonDisabled]}
                    onPress={handleSearch}
                    disabled={loading || (!query.trim() && !tag.trim())}
                >
                    <Text style={styles.searchButtonText}>{loading ? 'Buscando...' : 'Buscar'}</Text>
                    {loading && (
                        <ActivityIndicator color={theme.colors.text.primary} style={styles.searchingIndicator} />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={results}
                renderItem={renderCardItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.resultsList}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {query.trim() || tag.trim() ? (
                            <>
                                <AntDesign name="inbox" size={48} color={theme.colors.text.secondary} />
                                <Text style={styles.emptyText}>No se encontraron resultados</Text>
                            </>
                        ) : (
                            <>
                                <AntDesign name="search1" size={48} color={theme.colors.text.secondary} />
                                <Text style={styles.emptyText}>Realiza una búsqueda para ver resultados</Text>
                            </>
                        )}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        backgroundColor: theme.colors.background.card,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: theme.colors.text.primary,
        paddingVertical: theme.spacing.md,
        fontSize: 16,
    },
    clearButton: {
        padding: theme.spacing.xs,
    },
    tagsLabel: {
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.sm,
    },
    tagsLoading: {
        marginVertical: theme.spacing.sm,
    },
    tagsList: {
        maxHeight: 40,
        marginBottom: theme.spacing.md,
    },
    tagChip: {
        backgroundColor: theme.colors.background.elevated,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: 20,
        marginRight: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    tagChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    tagChipText: {
        color: theme.colors.text.secondary,
    },
    tagChipTextSelected: {
        color: theme.colors.text.primary,
    },
    searchButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonDisabled: {
        opacity: 0.6,
    },
    searchButtonText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    searchingIndicator: {
        marginLeft: theme.spacing.sm,
    },
    resultsList: {
        flexGrow: 1,
    },
    cardItem: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
    },
    cardContent: {
        padding: theme.spacing.md,
    },
    cardQuestion: {
        ...theme.typography.body,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
    },
    cardAnswer: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    deckInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deckName: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.xs,
        fontSize: 14,
    },
    cardTags: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagsText: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.xs,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.xl * 2,
    },
    emptyText: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginTop: theme.spacing.md,
    },
});
