// screens/DeckScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config';
import { theme, styles as globalStyles } from '../theme';

export default function DeckScreen({ route, navigation }) {
    const { deckId, deckName } = route.params;
    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDeckDetails();
    }, [deckId]);

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
            setRefreshing(false);
        }
    };

    const deleteDeck = () => {
        Alert.alert(
            'Eliminar Mazo',
            '¿Estás seguro de que quieres eliminar este mazo? Esta acción no se puede deshacer.',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await axios.delete(`${API_URL}/decks/${deckId}`);
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', 'No se pudo eliminar el mazo.');
                        }
                    },
                },
            ]
        );
    };

    const deleteCard = (cardId) => {
        Alert.alert('Eliminar Tarjeta', '¿Estás seguro de que quieres eliminar esta tarjeta?', [
            {
                text: 'Cancelar',
                style: 'cancel',
            },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await axios.delete(`${API_URL}/cards/${cardId}`);
                        fetchDeckDetails();
                    } catch (err) {
                        Alert.alert('Error', 'No se pudo eliminar la tarjeta.');
                    }
                },
            },
        ]);
    };

    const CardItem = ({ item }) => {
        const [showBack, setShowBack] = useState(false);
        const flipAnim = useState(new Animated.Value(0))[0];

        const flipCard = () => {
            setShowBack(!showBack);
            Animated.spring(flipAnim, {
                toValue: showBack ? 0 : 1,
                friction: 8,
                tension: 10,
                useNativeDriver: true,
            }).start();
        };

        const frontAnimatedStyle = {
            transform: [
                {
                    rotateY: flipAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                    }),
                },
            ],
        };

        const backAnimatedStyle = {
            transform: [
                {
                    rotateY: flipAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['180deg', '360deg'],
                    }),
                },
            ],
        };

        return (
            <View style={styles.cardContainer}>
                <TouchableOpacity activeOpacity={0.9} onPress={flipCard} style={styles.cardTouchable}>
                    <Animated.View style={[styles.cardSide, frontAnimatedStyle]}>
                        <Text style={styles.cardText}>{item.front}</Text>
                        <Text style={styles.tapHint}>Toca para ver respuesta</Text>
                    </Animated.View>
                    <Animated.View style={[styles.cardSide, styles.cardBack, backAnimatedStyle]}>
                        <Text style={styles.cardText}>{item.back}</Text>
                        <Text style={styles.tapHint}>Toca para ver pregunta</Text>
                    </Animated.View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AddEditCard', { deckId, card: item })}
                        style={[styles.actionButton, styles.editButton]}
                    >
                        <AntDesign name="edit" size={20} color={theme.colors.primary} />
                        <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => deleteCard(item.id)}
                        style={[styles.actionButton, styles.deleteButton]}
                    >
                        <AntDesign name="delete" size={20} color={theme.colors.danger} />
                        <Text style={styles.deleteButtonText}>Borrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={[globalStyles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[globalStyles.container, styles.centerContent]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={[globalStyles.button.primary, styles.retryButton]} onPress={fetchDeckDetails}>
                    <Text style={globalStyles.buttonText.primary}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.deckName}>{deck?.name}</Text>
                    {deck?.description ? <Text style={styles.deckDescription}>{deck.description}</Text> : null}
                    <View style={styles.stats}>
                        <View style={styles.statItem}>
                            <AntDesign name="creditcard" size={20} color={theme.colors.text.secondary} />
                            <Text style={styles.statText}>
                                {cards.length} tarjeta{cards.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <FlatList
                data={cards}
                renderItem={({ item }) => <CardItem item={item} />}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <AntDesign name="creditcard" size={48} color={theme.colors.text.secondary} />
                        <Text style={styles.emptyText}>No hay tarjetas en este mazo.{'\n'}Añade una nueva.</Text>
                    </View>
                }
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.footerButton, styles.studyButton]}
                    onPress={() => navigation.navigate('Study', { deckId, deckName })}
                    disabled={cards.length === 0}
                >
                    <AntDesign name="book" size={20} color={theme.colors.text.primary} />
                    <Text style={styles.studyButtonText}>Estudiar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.footerButton, styles.addButton]}
                    onPress={() => navigation.navigate('AddEditCard', { deckId })}
                >
                    <AntDesign name="plus" size={20} color={theme.colors.text.primary} />
                    <Text style={styles.addButtonText}>Añadir Tarjeta</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.footerButton, styles.editDeckButton]}
                    onPress={() => navigation.navigate('AddEditDeck', { deck })}
                >
                    <AntDesign name="edit" size={20} color={theme.colors.text.primary} />
                    <Text style={styles.editDeckButtonText}>Editar Mazo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.footerButton, styles.deleteButton]} onPress={deleteDeck}>
                    <AntDesign name="delete" size={20} color={theme.colors.danger} />
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        padding: theme.spacing.lg,
    },
    headerContent: {
        flex: 1,
    },
    deckName: {
        ...theme.typography.h2,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    deckDescription: {
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.xs,
    },
    listContainer: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl * 2,
    },
    cardContainer: {
        marginBottom: theme.spacing.md,
    },
    cardTouchable: {
        height: 200,
    },
    cardSide: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        justifyContent: 'center',
        backfaceVisibility: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    cardBack: {
        backgroundColor: theme.colors.background.elevated,
    },
    cardText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        textAlign: 'center',
    },
    tapHint: {
        position: 'absolute',
        bottom: theme.spacing.md,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: theme.colors.text.secondary,
        fontSize: 12,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: theme.spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        marginLeft: theme.spacing.sm,
    },
    editButton: {
        backgroundColor: theme.colors.background.elevated,
    },
    deleteButton: {
        backgroundColor: theme.colors.background.elevated,
    },
    editButtonText: {
        color: theme.colors.primary,
        marginLeft: theme.spacing.xs,
    },
    deleteButtonText: {
        color: theme.colors.danger,
        marginLeft: theme.spacing.xs,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.xl * 2,
    },
    emptyText: {
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginTop: theme.spacing.md,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.background.card,
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    footerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    studyButton: {
        backgroundColor: theme.colors.primary,
    },
    addButton: {
        backgroundColor: theme.colors.success,
    },
    editDeckButton: {
        backgroundColor: theme.colors.secondary,
    },
    studyButtonText: {
        color: theme.colors.text.primary,
        marginLeft: theme.spacing.xs,
        fontWeight: '600',
    },
    addButtonText: {
        color: theme.colors.text.primary,
        marginLeft: theme.spacing.xs,
        fontWeight: '600',
    },
    editDeckButtonText: {
        color: theme.colors.text.primary,
        marginLeft: theme.spacing.xs,
        fontWeight: '600',
    },
    errorText: {
        color: theme.colors.danger,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    retryButton: {
        minWidth: 150,
    },
});
