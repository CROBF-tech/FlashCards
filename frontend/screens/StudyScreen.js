import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import api from '../utils/api';
import { theme, styles as globalStyles } from '../theme';

export default function StudyScreen({ route, navigation }) {
    const { deckId } = route.params;
    const [cards, setCards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [studyComplete, setStudyComplete] = useState(false);
    const [flipAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        fetchDueCards();
    }, [deckId]);

    const fetchDueCards = async (ignoreDate = false) => {
        setLoading(true);
        try {
            const response = await api.get(`/decks/${deckId}/study${ignoreDate ? '?ignoreDate=true' : ''}`);
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

    const handleFlip = () => {
        setShowAnswer(!showAnswer);
        Animated.spring(flipAnim, {
            toValue: showAnswer ? 0 : 1,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
    };

    const handleReview = async (quality) => {
        if (currentCardIndex >= cards.length) return;

        const currentCard = cards[currentCardIndex];

        try {
            await api.post(`/cards/${currentCard.id}/review`, { quality });

            if (currentCardIndex < cards.length - 1) {
                setCurrentCardIndex(currentCardIndex + 1);
                setShowAnswer(false);
                flipAnim.setValue(0);
            } else {
                setStudyComplete(true);
            }
        } catch (err) {
            console.error('Error al enviar revisión:', err);
            alert('Error al registrar la revisión. Intente nuevamente.');
        }
    };

    const renderQualityButton = (quality, label, color) => (
        <TouchableOpacity
            style={[styles.qualityButton, { backgroundColor: color }]}
            onPress={() => handleReview(quality)}
        >
            <Text style={styles.qualityButtonText}>{label}</Text>
        </TouchableOpacity>
    );

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

    if (loading) {
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
                <TouchableOpacity style={[globalStyles.button.primary, styles.retryButton]} onPress={fetchDueCards}>
                    <Text style={globalStyles.buttonText.primary}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (studyComplete) {
        return (
            <View style={[globalStyles.container, styles.centerContent]}>
                <AntDesign name="Trophy" size={64} color={theme.colors.primary} />
                <Text style={styles.congratsText}>¡Felicidades!{'\n'}Has completado todas las tarjetas para hoy.</Text>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[globalStyles.button.primary, styles.actionButton]}
                        onPress={() => {
                            setStudyComplete(false);
                            fetchDueCards(true);
                        }}
                    >
                        <Text style={globalStyles.buttonText.primary}>Estudiar de nuevo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[globalStyles.button.secondary, styles.actionButton]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={globalStyles.buttonText.secondary}>Volver al Mazo</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const currentCard = cards[currentCardIndex];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['bottom']}>
            <View style={globalStyles.container}>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                        Tarjeta {currentCardIndex + 1} de {cards.length}
                    </Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${((currentCardIndex + 1) / cards.length) * 100}%` },
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.cardContainer}>
                    <TouchableOpacity activeOpacity={0.9} onPress={handleFlip}>
                        <Animated.View style={[styles.card, !showAnswer ? frontAnimatedStyle : backAnimatedStyle]}>
                            <ScrollView contentContainerStyle={styles.cardContent}>
                                <Text style={styles.cardTitle}>{showAnswer ? 'Respuesta' : 'Pregunta'}</Text>
                                <Text style={styles.cardText}>{showAnswer ? currentCard.back : currentCard.front}</Text>
                                <Text style={styles.tapHint}>
                                    Toca para {showAnswer ? 'ver pregunta' : 'ver respuesta'}
                                </Text>
                            </ScrollView>
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                {showAnswer && (
                    <View style={styles.qualityButtonsContainer}>
                        {renderQualityButton(0, 'Olvidé', theme.colors.danger)}
                        {renderQualityButton(3, 'Difícil', theme.colors.warning)}
                        {renderQualityButton(4, 'Bien', theme.colors.success)}
                        {renderQualityButton(5, 'Fácil', theme.colors.secondary)}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        marginBottom: theme.spacing.md,
    },
    progressText: {
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    progressBar: {
        height: 4,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    cardContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        perspective: 1000,
    },
    card: {
        width: Dimensions.get('window').width - theme.spacing.md * 2,
        height: 400,
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        backfaceVisibility: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        ...theme.typography.h3,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
    },
    cardText: {
        ...theme.typography.body,
        color: theme.colors.text.primary,
        textAlign: 'center',
        lineHeight: 24,
    },
    tapHint: {
        ...theme.typography.caption,
        color: theme.colors.text.secondary,
        position: 'absolute',
        bottom: 0,
    },
    qualityButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: theme.spacing.xs,
    },
    qualityButton: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        minWidth: 80,
        alignItems: 'center',
    },
    qualityButtonText: {
        color: theme.colors.text.primary,
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
    congratsText: {
        ...theme.typography.h2,
        color: theme.colors.text.primary,
        textAlign: 'center',
        marginVertical: theme.spacing.xl,
    },
    returnButton: {
        minWidth: 200,
        marginTop: theme.spacing.xl,
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: theme.spacing.xl,
        gap: theme.spacing.md,
    },
    actionButton: {
        minWidth: 150,
    },
});
