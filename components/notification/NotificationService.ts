import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SensorData = {
    accel_x: number;
    accel_y: number;
    accel_z: number;
    ph: number;
    turbidity: number;
    temperature: number;
    speed: number;
};

// ID untuk notification yang ongoing
const ONGOING_NOTIFICATION_ID = 'sensor-monitoring-ongoing';
const BACKGROUND_DATA_KEY = 'BACKGROUND_SENSOR_DATA';

// Inisialisasi notifikasi handler secara global
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const setupNotificationChannel = async () => {
    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('sensor_monitoring', {
                name: 'Sensor Monitoring',
                importance: Notifications.AndroidImportance.MAX,
                // vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
                // enableVibrate: true,
                enableLights: true,
                showBadge: true,
            });
            console.log('[NOTIF] Channel created successfully');
            return true;
        } catch (error) {
            console.error('[NOTIF] Error creating channel:', error);
            return false;
        }
    }
    return true;
};

// Utility function to ensure sensorData has valid values
const sanitizeSensorData = (data: Partial<SensorData> | null | undefined): SensorData => {
    // Return default values if data is null or undefined
    if (!data) {
        return {
            accel_x: 0,
            accel_y: 0,
            accel_z: 0,
            ph: 7,
            turbidity: 0,
            temperature: 25,
            speed: 0
        };
    }

    // Helper to convert value to number safely
    const toNumber = (value: any, defaultValue: number): number => {
        // String to number
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
        }
        // If already number, return directly
        else if (typeof value === 'number' && !isNaN(value)) {
            return value;
        }
        // For undefined, null, or invalid values
        return defaultValue;
    };

    // Ensure each property has a valid value and is converted to number
    return {
        accel_x: toNumber(data.accel_x, 0),
        accel_y: toNumber(data.accel_y, 0),
        accel_z: toNumber(data.accel_z, 0),
        ph: toNumber(data.ph, 7),
        turbidity: toNumber(data.turbidity, 0),
        temperature: toNumber(data.temperature, 25),
        speed: toNumber(data.speed, 0)
    };
};

export const saveSensorDataForBackground = async (data: Partial<SensorData> | null | undefined) => {
    try {
        // Sanitize data to ensure all properties exist
        const sanitizedData = sanitizeSensorData(data);

        await AsyncStorage.setItem(BACKGROUND_DATA_KEY, JSON.stringify(sanitizedData));
        console.log('[NOTIF] Data saved for background:', sanitizedData);
        return true;
    } catch (error) {
        console.error('[NOTIF] Error saving data:', error);
        return false;
    }
};

// Fungsi untuk menampilkan notifikasi saat aplikasi di background
export const showBackgroundNotification = async (sensorData: Partial<SensorData> | null | undefined) => {
    try {
        // Cek terlebih dahulu apakah aplikasi berada di background
        if (AppState.currentState !== 'background') {
            console.log('[NOTIF] App is not in background, skipping notification');
            return false;
        }

        // Sanitize data to ensure all properties have valid values
        const sanitizedData = sanitizeSensorData(sensorData);

        // Save data for background access
        await saveSensorDataForBackground(sanitizedData);

        // Create a persistent notification with safe value checking
        const ph = sanitizedData.ph.toFixed(2);
        const accel_x = sanitizedData.accel_x.toFixed(2);
        const accel_y = sanitizedData.accel_y.toFixed(2);
        const accel_z = sanitizedData.accel_z.toFixed(2);
        const turbidity = sanitizedData.turbidity.toFixed(2);
        const temperature = sanitizedData.temperature.toFixed(2);
        const speed = sanitizedData.speed.toFixed(2);

        // Hapus notifikasi sebelumnya jika ada
        await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID);

        const notificationId = await Notifications.scheduleNotificationAsync({
            identifier: ONGOING_NOTIFICATION_ID,
            content: {
                title: '🌊 Monitoring Sensor Air Aktif',
                body: `Memantau data sensor secara real-time:
pH: ${ph}
Turbidity: ${turbidity} NTU
Temperature: ${temperature} °C
Speed: ${speed} m/s 
Accelerometer X: ${accel_x}
Accelerometer Y: ${accel_y}
Accelerometer Z: ${accel_z}`,

                data: { type: 'background-monitoring', timestamp: Date.now() },
                sound: 'default',
                priority: 'max',
                badge: 1,
                android: {
                    channelId: 'sensor_monitoring',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    color: '#2196F3',
                    ongoing: true,
                    sticky: true,
                    // vibrate: [0, 250, 250, 250],
                }
            } as Notifications.NotificationContentInput,
            trigger: null, // Tampilkan segera
        });

        console.log('[NOTIF] Background notification shown with ID:', notificationId);
        return true;
    } catch (error) {
        console.error('[NOTIF] Error showing background notification:', error);
        return false;
    }
};

// Fungsi untuk update data sensor saat aplikasi di background
export const updateBackgroundNotification = async (sensorData: Partial<SensorData> | null | undefined) => {
    try {
        // Cek terlebih dahulu apakah aplikasi berada di background
        if (AppState.currentState !== 'background') {
            console.log('[NOTIF] App is not in background, skipping update');
            return false;
        }

        // Sanitize data to ensure all properties have valid values
        const sanitizedData = sanitizeSensorData(sensorData);

        // Save data first
        await saveSensorDataForBackground(sanitizedData);

        // Cancel existing notification
        await Notifications.cancelScheduledNotificationAsync(ONGOING_NOTIFICATION_ID);

        // Use sanitized values
        const ph = sanitizedData.ph.toFixed(2);
        const turbidity = sanitizedData.turbidity.toFixed(2);
        const temperature = sanitizedData.temperature.toFixed(2);
        const speed = sanitizedData.speed.toFixed(2);

        // Create a new one with updated data
        const notificationId = await Notifications.scheduleNotificationAsync({
            identifier: ONGOING_NOTIFICATION_ID,
            content: {
                title: '🌊 Monitoring Sensor Air Aktif',
                body: `Data diperbarui pada ${new Date().toLocaleTimeString()}:
pH: ${ph}
Turbidity: ${turbidity} NTU
Temperature: ${temperature} °C
Speed: ${speed} m/s`,
                data: { type: 'background-monitoring-update', timestamp: Date.now() },
                sound: 'default',
                priority: 'max',
                badge: 1,
                android: {
                    channelId: 'sensor_monitoring',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    color: '#2196F3',
                    ongoing: true,
                    sticky: true,
                    vibrate: [0, 250, 250, 250],
                }
            } as Notifications.NotificationContentInput,
            trigger: null,
        });

        console.log('[NOTIF] Background notification updated with ID:', notificationId);
        return true;
    } catch (error) {
        console.error('[NOTIF] Error updating background notification:', error);
        return false;
    }
};

// Membersihkan notifikasi
export const clearAllNotifications = async () => {
    try {
        console.log('[NOTIF] Clearing all notifications');
        await Notifications.dismissAllNotificationsAsync();
        console.log('[NOTIF] All notifications cleared');
        return true;
    } catch (error) {
        console.error('[NOTIF] Error clearing notifications:', error);
        return false;
    }
};

// Fungsi untuk menyediakan kompabilitas dengan fungsi lama
// tapi dimodifikasi untuk hanya berjalan saat di background
export const startForegroundService = async (sensorData: Partial<SensorData> | null | undefined) => {
    return await showBackgroundNotification(sensorData);
};

export const updateForegroundNotification = async (sensorData: Partial<SensorData> | null | undefined) => {
    return await updateBackgroundNotification(sensorData);
};

export const stopForegroundService = async () => {
    try {
        console.log('[NOTIF] Stopping service');
        await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID);
        console.log('[NOTIF] Service stopped');
        return true;
    } catch (error) {
        console.error('[NOTIF] Error stopping service:', error);
        return false;
    }
};

// Fungsi untuk menampilkan notifikasi
export async function showNotification(sensorData: SensorData) {
    try {
        if (!sensorData || typeof sensorData !== 'object') {
            console.warn('[NOTIFICATION] Invalid sensor data received:', sensorData);
            return;
        }

        // Helper function to safely convert values and get fixed strings
        const getFixedValue = (value: any): string => {
            if (value === undefined || value === null) return 'N/A';
            if (typeof value === 'string') {
                const num = parseFloat(value);
                return isNaN(num) ? 'N/A' : num.toFixed(2);
            }
            if (typeof value === 'number' && !isNaN(value)) {
                return value.toFixed(2);
            }
            return 'N/A';
        };

        // Get safe string values
        const ph = getFixedValue(sensorData.ph);
        const turbidity = getFixedValue(sensorData.turbidity);
        const temperature = getFixedValue(sensorData.temperature);
        const speed = getFixedValue(sensorData.speed);

        console.log('[NOTIFICATION] Showing notification with data:', {
            ph, turbidity, temperature, speed
        });

        // Create unique ID based on timestamp
        const notificationId = `sensor-update-${Date.now()}`;

        // Schedule notification with MAX priority for visibility in background
        await Notifications.scheduleNotificationAsync({
            identifier: notificationId,
            content: {
                title: '💧 Water Sensor Update',
                body: `pH: ${ph}
Turbidity: ${turbidity} NTU
Temperature: ${temperature}°C
Speed: ${speed} m/s`,
                data: { type: 'mqtt-update', timestamp: new Date().toISOString() },
                sound: true,
                priority: 'max',
                android: {
                    channelId: 'sensor_monitoring',
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    color: '#1E88E5',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrate: [0, 250, 250, 250],
                },
                ios: {
                    sound: true,
                },
            } as Notifications.NotificationContentInput,
            trigger: null, // Show immediately
        });

        console.log('[NOTIFICATION] Successfully scheduled notification with ID:', notificationId);

    } catch (error) {
        console.error('[NOTIFICATION] Failed to show notification:', error);
    }
}