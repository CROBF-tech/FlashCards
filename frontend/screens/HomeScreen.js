// screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api';
import { theme, styles as globalStyles } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
    const { logout } = useAuth();
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDecks();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchDecks();
        });
        return unsubscribe;
    }, [navigation]);

    const fetchDecks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/decks');
            setDecks(response.data);
            setError(null);
        } catch (err) {
            console.error('Error al obtener mazos:', err);
            setError('Error al cargar los mazos. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            Alert.alert('Error', 'No se pudo cerrar sesión');
        }
    };

    const renderDeckItem = ({ item }) => (
        <TouchableOpacity
            style={styles.deckCard}
            onPress={() =>
                navigation.navigate('Deck', {
                    deckId: item.id,
                    deckName: item.name,
                })
            }
        >
            <View style={styles.deckInfo}>
                <Text style={styles.deckName}>{item.name}</Text>
                {item.description ? <Text style={styles.deckDescription}>{item.description}</Text> : null}
            </View>
            <AntDesign name="right" size={24} color={theme.colors.text.secondary} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={globalStyles.container}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[globalStyles.container, styles.centerContent]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={[globalStyles.button.primary, styles.retryButton]} onPress={fetchDecks}>
                    <Text style={globalStyles.buttonText.primary}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['top', 'bottom']}>
            <View style={globalStyles.container}>
                <FlatList
                    data={decks}
                    renderItem={renderDeckItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <AntDesign name="inbox" size={48} color={theme.colors.text.secondary} />
                            <Text style={styles.emptyText}>No hay mazos disponibles.{'\n'}¡Crea uno nuevo!</Text>
                        </View>
                    }
                />

                {/* Botones flotantes */}
                <View style={styles.fabContainer}>
                    <TouchableOpacity
                        style={[styles.fabButton, styles.fabPrimary]}
                        onPress={() => navigation.navigate('AddEditDeck')}
                    >
                        <AntDesign name="plus" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.fabSecondaryContainer}>
                        <TouchableOpacity
                            style={[styles.fabButton, styles.fabSecondary]}
                            onPress={() => navigation.navigate('Search')}
                        >
                            <AntDesign name="search1" size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.fabButton, styles.fabSecondary]}
                            onPress={() => navigation.navigate('Stats')}
                        >
                            <AntDesign name="barschart" size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    listContainer: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl * 2,
    },
    deckCard: {
        ...globalStyles.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    deckInfo: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    deckName: {
        ...theme.typography.h3,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    deckDescription: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: theme.colors.danger,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    retryButton: {
        minWidth: 150,
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
    fabContainer: {
        position: 'absolute',
        right: theme.spacing.md,
        bottom: theme.spacing.md,
        alignItems: 'flex-end',
    },
    fabSecondaryContainer: {
        marginBottom: theme.spacing.sm,
    },
    fabButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginBottom: theme.spacing.sm,
    },
    fabPrimary: {
        backgroundColor: theme.colors.primary,
    },
    fabSecondary: {
        backgroundColor: theme.colors.background.elevated,
    },
});
