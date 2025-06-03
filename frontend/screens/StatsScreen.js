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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import api from '../utils/api';
import { theme, styles as globalStyles } from '../theme';

const DailyProgressChart = ({ data }) => {
    const maxCount = Math.max(...(data?.map((d) => d.count) || [0]));
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date();
    const lastWeek = Array(7)
        .fill(0)
        .map((_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
        });

    const dailyData = lastWeek.map((date) => {
        const dayData = data?.find((d) => d.date === date);
        return {
            date,
            count: dayData?.count || 0,
            day: days[new Date(date).getDay()],
        };
    });

    return (
        <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
                <AntDesign name="linechart" size={24} color={theme.colors.primary} />
                <Text style={styles.chartTitle}>Progreso Diario</Text>
            </View>
            <View style={styles.chart}>
                {dailyData.map((day, index) => (
                    <View key={day.date} style={styles.chartColumn}>
                        <View style={styles.chartBarContainer}>
                            <View
                                style={[
                                    styles.chartBar,
                                    {
                                        height: `${(day.count / maxCount) * 100}%`,
                                        backgroundColor: theme.colors.primary,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.chartLabel}>{day.day}</Text>
                        <Text style={styles.chartValue}>{day.count}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

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
            const response = await api.get('/user/stats');
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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.dark }} edges={['bottom']}>
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

                    <View style={styles.statsRow}>
                        <StatCard
                            title="Tarjetas para Hoy"
                            value={stats?.due_today || 0}
                            icon="calendar"
                            color={theme.colors.warning}
                            subtitle="Pendientes de repaso"
                        />
                        <StatCard
                            title="Repasos Hoy"
                            value={stats?.today?.reviews || 0}
                            icon="checkcircleo"
                            color={theme.colors.success}
                            subtitle={`Calidad: ${stats?.today?.avg_quality || 0}/5`}
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <StatCard
                            title="Revisiones Totales"
                            value={stats?.total_reviews || 0}
                            icon="barschart"
                            color={theme.colors.info}
                            subtitle={`${stats?.study_days || 0} días de estudio`}
                        />
                        <StatCard
                            title="Tasa de Dominio"
                            value={`${Math.round(stats?.mastery_rate || 0)}%`}
                            icon="staro"
                            color={theme.colors.warning}
                            subtitle="Respuestas correctas"
                        />
                    </View>

                    <DailyProgressChart data={stats?.daily_reviews} />

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

                        <View style={styles.qualityDistribution}>
                            {stats?.quality_distribution?.map((item) => (
                                <View key={item.quality} style={styles.qualityBar}>
                                    <Text style={styles.qualityBarLabel}>{item.quality}</Text>
                                    <View style={styles.qualityBarContainer}>
                                        <View
                                            style={[
                                                styles.qualityBarFill,
                                                {
                                                    width: `${
                                                        (item.count /
                                                            Math.max(
                                                                ...stats.quality_distribution.map((d) => d.count)
                                                            )) *
                                                        100
                                                    }%`,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.qualityBarValue}>{item.count}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                <DailyProgressChart data={stats?.daily_progress} />
            </ScrollView>
        </SafeAreaView>
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
    qualityDistribution: {
        marginTop: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.background.elevated,
    },
    qualityBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    qualityBarLabel: {
        color: theme.colors.text.secondary,
        width: 20,
        fontSize: 12,
        textAlign: 'center',
    },
    qualityBarContainer: {
        flex: 1,
        height: 8,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 4,
        marginHorizontal: theme.spacing.sm,
    },
    qualityBarFill: {
        height: '100%',
        backgroundColor: theme.colors.warning,
        borderRadius: 4,
    },
    qualityBarValue: {
        color: theme.colors.text.disabled,
        width: 30,
        fontSize: 12,
        textAlign: 'right',
    },
    errorText: {
        color: theme.colors.danger,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    retryButton: {
        minWidth: 150,
    },
    chartCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginVertical: theme.spacing.md,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    chartTitle: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing.sm,
        fontSize: 14,
    },
    chart: {
        flexDirection: 'row',
        height: 150,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingVertical: theme.spacing.sm,
    },
    chartColumn: {
        flex: 1,
        alignItems: 'center',
    },
    chartBarContainer: {
        width: 20,
        height: '100%',
        justifyContent: 'flex-end',
    },
    chartBar: {
        width: '100%',
        borderRadius: theme.borderRadius.sm,
        minHeight: 4,
    },
    chartLabel: {
        color: theme.colors.text.disabled,
        fontSize: 12,
        marginTop: theme.spacing.xs,
    },
    chartValue: {
        color: theme.colors.text.secondary,
        fontSize: 10,
        marginTop: 2,
    },
});
