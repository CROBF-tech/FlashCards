// screens/StatsScreen.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import api from '../utils/api';
import { theme, styles as globalStyles } from '../theme';

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
            const response = await api.get('/stats');
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

    const StatCard = ({ title, value, icon, color, subtitle }) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={styles.statHeader}>
                <AntDesign name={icon} size={24} color={color} />
                <Text style={styles.statTitle}>{title}</Text>
            </View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
    );

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
                <TouchableOpacity style={[globalStyles.button.primary, styles.retryButton]} onPress={fetchStats}>
                    <Text style={globalStyles.buttonText.primary}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            style={globalStyles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={fetchStats}
                    colors={[theme.colors.primary]}
                    tintColor={theme.colors.primary}
                    progressBackgroundColor={theme.colors.background.card}
                />
            }
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Resumen de Actividad</Text>
                <Text style={styles.headerSubtitle}>Estadísticas generales de tu progreso</Text>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statsRow}>
                    <StatCard
                        title="Total de Mazos"
                        value={stats?.total_decks || 0}
                        icon="folder1"
                        color={theme.colors.primary}
                    />
                    <StatCard
                        title="Total de Tarjetas"
                        value={stats?.total_cards || 0}
                        icon="creditcard"
                        color={theme.colors.secondary}
                    />
                </View>

                <StatCard
                    title="Tarjetas para Hoy"
                    value={stats?.due_today || 0}
                    icon="calendar"
                    color={theme.colors.warning}
                    subtitle="Pendientes de repaso"
                />

                <StatCard
                    title="Revisiones esta Semana"
                    value={stats?.reviews_last_week || 0}
                    icon="barschart"
                    color={theme.colors.success}
                    subtitle="Últimos 7 días"
                />

                <View style={styles.qualityCard}>
                    <View style={styles.qualityHeader}>
                        <AntDesign name="star" size={24} color={theme.colors.warning} />
                        <Text style={styles.qualityTitle}>Calidad Promedio de Respuestas</Text>
                    </View>
                    <View style={styles.qualityMeter}>
                        <View style={[styles.qualityFill, { width: `${(stats?.avg_quality / 5) * 100}%` }]} />
                    </View>
                    <View style={styles.qualityLabels}>
                        <Text style={styles.qualityValue}>{stats?.avg_quality || 0}/5</Text>
                        <Text style={styles.qualityScale}>0 - Olvidado | 5 - Perfecto</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: theme.spacing.lg,
    },
    headerTitle: {
        ...theme.typography.h2,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
        color: theme.colors.text.secondary,
    },
    statsContainer: {
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    statCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderLeftWidth: 4,
        flex: 1,
        marginHorizontal: theme.spacing.xs,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    statTitle: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.sm,
        fontSize: 14,
    },
    statValue: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
    },
    statSubtitle: {
        color: theme.colors.text.disabled,
        fontSize: 12,
    },
    qualityCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginVertical: theme.spacing.md,
    },
    qualityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    qualityTitle: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.sm,
        fontSize: 14,
    },
    qualityMeter: {
        height: 8,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: theme.spacing.md,
    },
    qualityFill: {
        height: '100%',
        backgroundColor: theme.colors.warning,
        borderRadius: 4,
    },
    qualityLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    qualityValue: {
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    qualityScale: {
        color: theme.colors.text.disabled,
        fontSize: 12,
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
