import React, { useContext } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';
import api from '../utils/api';

const SettingsScreen = ({ navigation }) => {
    const { signOut } = useContext(AuthContext);

    const handleLogout = async () => {
        try {
            await signOut();
            // La navegación se maneja automáticamente por el cambio en isAuthenticated
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            Alert.alert('Error', 'No se pudo cerrar la sesión. Por favor, intenta nuevamente.');
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Eliminar cuenta',
            '¿Estás seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.',
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
                            const response = await api.delete('/user/delete');
                            if (response.status === 200) {
                                await signOut();
                                // La navegación se manejará automáticamente por el cambio en isAuthenticated
                            }
                        } catch (error) {
                            console.error('Error al eliminar la cuenta:', error);
                            let errorMessage = 'No se pudo eliminar la cuenta. Por favor, intenta nuevamente.';

                            if (error.response) {
                                switch (error.response.status) {
                                    case 401:
                                        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
                                        break;
                                    case 404:
                                        errorMessage = 'No se encontró la cuenta.';
                                        break;
                                }
                            }

                            Alert.alert('Error', errorMessage);
                        }
                    },
                },
            ]
        );
    };

    const SettingOption = ({ icon, title, onPress, danger }) => (
        <TouchableOpacity style={[styles.settingOption, danger && styles.dangerOption]} onPress={onPress}>
            <View style={styles.settingContent}>
                <AntDesign name={icon} size={24} color={danger ? theme.colors.danger : theme.colors.text.primary} />
                <Text style={[styles.settingText, danger && styles.dangerText]}>{title}</Text>
            </View>
            <AntDesign name="right" size={20} color={danger ? theme.colors.danger : theme.colors.text.secondary} />
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cuenta</Text>
                <View style={styles.sectionContent}>
                    <SettingOption icon="logout" title="Cerrar Sesión" onPress={handleLogout} />
                    <SettingOption icon="deleteuser" title="Eliminar Cuenta" onPress={handleDeleteAccount} danger />
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.dark,
    },
    section: {
        marginTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.md,
    },
    sectionContent: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    settingOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    settingContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingText: {
        ...theme.typography.body,
        color: theme.colors.text.primary,
        marginLeft: theme.spacing.md,
    },
    dangerOption: {
        borderBottomWidth: 0,
    },
    dangerText: {
        color: theme.colors.danger,
    },
});

export default SettingsScreen;
