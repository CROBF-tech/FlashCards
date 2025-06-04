import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Días después del estudio para programar recordatorios
const SCHEDULE_DELAYS_DAYS = [1, 3, 7, 14, 30];

// Clave base para almacenamiento local
const NOTIF_KEY_PREFIX = 'deck_reminders_';

/**
 * Solicita permisos de notificaciones si es necesario.
 */
export async function requestNotificationPermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
    }
}

/**
 * Programa notificaciones para un mazo.
 * @param {string} deckId - ID del mazo.
 * @param {string} deckName - Nombre visible del mazo.
 */
export async function scheduleDeckReminders(deckId, deckName, isTest = false) {
    if (!Device.isDevice) return;

    await requestNotificationPermissions();

    await cancelDeckReminders(deckId);

    const notificationIds = [];

    const testDelaysSeconds = [5, 10, 20, 30, 60];
    const delays = isTest ? testDelaysSeconds : SCHEDULE_DELAYS_DAYS;

    for (let delay of delays) {
        const trigger = isTest
            ? { seconds: delay, repeats: false }
            : new Date(Date.now() + delay * 24 * 60 * 60 * 1000);

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: '📚 Tiempo de repasar',
                body: `Recordá revisar el mazo "${deckName}"`,
                sound: true,
                data: { deckId },
            },
            trigger,
        });

        notificationIds.push(id);
    }

    await AsyncStorage.setItem(NOTIF_KEY_PREFIX + deckId, JSON.stringify(notificationIds));
}

/**
 * Cancela todas las notificaciones previamente programadas para un mazo.
 * @param {string} deckId - ID del mazo.
 */
export async function cancelDeckReminders(deckId) {
    const stored = await AsyncStorage.getItem(NOTIF_KEY_PREFIX + deckId);
    if (stored) {
        const ids = JSON.parse(stored);
        for (let id of ids) {
            await Notifications.cancelScheduledNotificationAsync(id);
        }
        await AsyncStorage.removeItem(NOTIF_KEY_PREFIX + deckId);
    }
}
