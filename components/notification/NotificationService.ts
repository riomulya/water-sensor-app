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

// Tambahkan ID untuk notifikasi warning
const WARNING_NOTIFICATION_ID = 'sensor-warning-notification';

// Variabel untuk menyimpan status warning terakhir
let lastWarningStatus = {
    hasActiveWarning: false,
    warningTimestamp: 0,
    warningType: '',
    warningValue: 0,
    warningThreshold: 0
};

// Periode minimum antar warning baru (dalam milidetik) - 30 menit
const MIN_WARNING_INTERVAL = 30 * 60 * 1000;

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

        // Check for warnings first
        const hasWarning = await checkSensorWarnings(sanitizedData);

        // If warning shown, still show the main notification but don't play sound
        // to avoid too many sounds at once

        // Create a persistent notification with safe value checking
        const ph = sanitizedData.ph.toFixed(2);
        const accel_x = sanitizedData.accel_x.toFixed(2);
        const accel_y = sanitizedData.accel_y.toFixed(2);
        const accel_z = sanitizedData.accel_z.toFixed(2);
        const turbidity = sanitizedData.turbidity.toFixed(2);
        const temperature = sanitizedData.temperature.toFixed(2);
        const speed = sanitizedData.speed.toFixed(2);

        // Get pH status label and color
        const phStatus = getPHStatusInfo(sanitizedData.ph);

        // Get water quality category based on turbidity
        const turbidityStatus = getTurbidityStatusInfo(sanitizedData.turbidity);

        // Create or update notification with the same identifier
        const notificationId = await Notifications.scheduleNotificationAsync({
            identifier: ONGOING_NOTIFICATION_ID,
            content: {
                title: '🌊 Monitor Sensor Air - Aktif',
                subtitle: `Kualitas Air: ${getOverallWaterQuality(sanitizedData)}`,
                body: `📊 Pembacaan Sensor Terkini:\n\n` +
                    `pH: ${ph} (${phStatus.label})\n` +
                    `Kekeruhan: ${turbidity} NTU (${turbidityStatus.label})\n` +
                    `Suhu: ${temperature}°C\n` +
                    `Kecepatan: ${speed} m/s\n\n` +
                    `Accelerometer X: ${accel_x}\n` +
                    `Accelerometer Y: ${accel_y}\n` +
                    `Accelerometer Z: ${accel_z}\n\n` +
                    `Terakhir diperbarui: ${new Date().toLocaleTimeString()}`,
                data: {
                    type: 'background-monitoring',
                    timestamp: Date.now(),
                    sensorData: sanitizedData
                },
                sound: hasWarning ? false : 'default', // Jangan berbunyi jika sudah ada warning
                priority: 'max',
                badge: 1,
                android: {
                    channelId: 'sensor_monitoring',
                    priority: Notifications.AndroidNotificationPriority.LOW,
                    color: getOverallWaterQualityColor(sanitizedData),
                    ongoing: true,
                    sticky: true,
                    smallIcon: 'ic_water_drop',  // Make sure this icon exists in your Android resources
                    style: {
                        type: 'bigText',
                        title: '🌊 Monitor Sensor Air - Aktif',
                        summary: `Kualitas Air: ${getOverallWaterQuality(sanitizedData)}`,
                        bigText: `📊 Pembacaan Sensor Terkini:\n\n` +
                            `pH: ${ph} (${phStatus.label})\n` +
                            `Kekeruhan: ${turbidity} NTU (${turbidityStatus.label})\n` +
                            `Suhu: ${temperature}°C\n` +
                            `Kecepatan: ${speed} m/s\n\n` +
                            `Accelerometer X: ${accel_x}\n` +
                            `Accelerometer Y: ${accel_y}\n` +
                            `Accelerometer Z: ${accel_z}\n\n` +
                            `Terakhir diperbarui: ${new Date().toLocaleTimeString()}`,
                    }
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

        // Check for warnings first - if warning detected, it will show warning notif
        const hasWarning = await checkSensorWarnings(sanitizedData);

        // If warning shown, don't update the regular notification to avoid clutter
        if (hasWarning) {
            return true;
        }

        // Use sanitized values
        const ph = sanitizedData.ph.toFixed(2);
        const accel_x = sanitizedData.accel_x.toFixed(2);
        const accel_y = sanitizedData.accel_y.toFixed(2);
        const accel_z = sanitizedData.accel_z.toFixed(2);
        const turbidity = sanitizedData.turbidity.toFixed(2);
        const temperature = sanitizedData.temperature.toFixed(2);
        const speed = sanitizedData.speed.toFixed(2);

        // Get pH status label and color
        const phStatus = getPHStatusInfo(sanitizedData.ph);

        // Get water quality category based on turbidity
        const turbidityStatus = getTurbidityStatusInfo(sanitizedData.turbidity);

        // Create a new one with updated data - using the same identifier will update existing notification
        const notificationId = await Notifications.scheduleNotificationAsync({
            identifier: ONGOING_NOTIFICATION_ID,
            content: {
                title: '🌊 Monitor Sensor Air - Aktif',
                subtitle: `Kualitas Air: ${getOverallWaterQuality(sanitizedData)}`,
                body: `📊 Pembacaan Sensor Terkini:\n\n` +
                    `pH: ${ph} (${phStatus.label})\n` +
                    `Kekeruhan: ${turbidity} NTU (${turbidityStatus.label})\n` +
                    `Suhu: ${temperature}°C\n` +
                    `Kecepatan: ${speed} m/s\n\n` +
                    `Accelerometer X: ${accel_x}\n` +
                    `Accelerometer Y: ${accel_y}\n` +
                    `Accelerometer Z: ${accel_z}\n\n` +
                    `Terakhir diperbarui: ${new Date().toLocaleTimeString()}`,
                data: {
                    type: 'background-monitoring-update',
                    timestamp: Date.now(),
                    sensorData: sanitizedData
                },
                sound: 'default',
                priority: 'max',
                badge: 1,
                android: {
                    channelId: 'sensor_monitoring',
                    priority: Notifications.AndroidNotificationPriority.LOW,
                    color: getOverallWaterQualityColor(sanitizedData),
                    ongoing: true,
                    sticky: true,
                    smallIcon: 'ic_water_drop',  // Make sure this icon exists in your Android resources
                    style: {
                        type: 'bigText',
                        title: '🌊 Monitor Sensor Air - Aktif',
                        summary: `Kualitas Air: ${getOverallWaterQuality(sanitizedData)}`,
                        bigText: `📊 Pembacaan Sensor Terkini:\n\n` +
                            `pH: ${ph} (${phStatus.label})\n` +
                            `Kekeruhan: ${turbidity} NTU (${turbidityStatus.label})\n` +
                            `Suhu: ${temperature}°C\n` +
                            `Kecepatan: ${speed} m/s\n\n` +
                            `Accelerometer X: ${accel_x}\n` +
                            `Accelerometer Y: ${accel_y}\n` +
                            `Accelerometer Z: ${accel_z}\n\n` +
                            `Terakhir diperbarui: ${new Date().toLocaleTimeString()}`,
                    }
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

// Helper functions for water quality assessment

// Function to get pH status information
const getPHStatusInfo = (ph: number) => {
    if (ph < 6.5) return { label: 'Asam', color: '#F44336' }; // Red
    if (ph > 8.5) return { label: 'Basa', color: '#FF9800' }; // Orange
    return { label: 'Normal', color: '#4CAF50' }; // Green
};

// Function to get turbidity status information
const getTurbidityStatusInfo = (turbidity: number) => {
    if (turbidity < 5) return { label: 'Jernih', color: '#4CAF50' }; // Green
    if (turbidity < 40) return { label: 'Agak Keruh', color: '#FFC107' }; // Yellow
    if (turbidity < 100) return { label: 'Keruh', color: '#FF9800' }; // Orange
    return { label: 'Sangat Keruh', color: '#F44336' }; // Red
};

// Function to get overall water quality assessment
const getOverallWaterQuality = (data: SensorData) => {
    const phQuality = getPHStatusInfo(data.ph);
    const turbidityQuality = getTurbidityStatusInfo(data.turbidity);

    // Simple algorithm - if any parameter is bad, the overall quality is bad
    if (phQuality.label === 'Asam' || phQuality.label === 'Basa' ||
        turbidityQuality.label === 'Sangat Keruh') {
        return 'Buruk';
    } else if (turbidityQuality.label === 'Keruh') {
        return 'Cukup';
    } else if (turbidityQuality.label === 'Agak Keruh') {
        return 'Baik';
    }
};

// Function to get color for overall water quality
const getOverallWaterQualityColor = (data: SensorData) => {
    const quality = getOverallWaterQuality(data);
    switch (quality) {
        case 'Baik': return '#8BC34A'; // Light Green
        case 'Cukup': return '#FFC107'; // Yellow
        case 'Buruk': return '#F44336'; // Red
        default: return '#2196F3'; // Blue (default)
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
                    priority: Notifications.AndroidNotificationPriority.LOW,
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

// Fungsi untuk memeriksa data sensor apakah melebihi ambang batas
export const checkSensorWarnings = async (sensorData: Partial<SensorData> | null | undefined) => {
    try {
        if (!sensorData) return false;

        // Sanitize data
        const sanitizedData = sanitizeSensorData(sensorData);
        const currentTime = Date.now();

        // Objek untuk menyimpan hasil warning
        let warningResult = {
            hasWarning: false,
            warningType: '',
            warningValue: 0,
            warningThreshold: 0,
            warningMessage: '',
            isNewWarning: false
        };

        // Periksa pH - terlalu asam atau terlalu basa
        if (sanitizedData.ph < 6.0) {
            warningResult = {
                hasWarning: true,
                warningType: 'pH_ASAM',
                warningValue: sanitizedData.ph,
                warningThreshold: 6.0,
                warningMessage: `pH air ${sanitizedData.ph.toFixed(2)} terlalu asam (di bawah 6.0)`,
                isNewWarning: lastWarningStatus.warningType !== 'pH_ASAM' ||
                    (currentTime - lastWarningStatus.warningTimestamp > MIN_WARNING_INTERVAL)
            };
        } else if (sanitizedData.ph > 9.0) {
            warningResult = {
                hasWarning: true,
                warningType: 'pH_BASA',
                warningValue: sanitizedData.ph,
                warningThreshold: 9.0,
                warningMessage: `pH air ${sanitizedData.ph.toFixed(2)} terlalu basa (di atas 9.0)`,
                isNewWarning: lastWarningStatus.warningType !== 'pH_BASA' ||
                    (currentTime - lastWarningStatus.warningTimestamp > MIN_WARNING_INTERVAL)
            };
        }

        // Periksa kekeruhan/turbidity
        if (!warningResult.hasWarning && sanitizedData.turbidity > 80) {
            warningResult = {
                hasWarning: true,
                warningType: 'TURBIDITY_HIGH',
                warningValue: sanitizedData.turbidity,
                warningThreshold: 80,
                warningMessage: `Kekeruhan air ${sanitizedData.turbidity.toFixed(2)} NTU terlalu tinggi (di atas 80 NTU)`,
                isNewWarning: lastWarningStatus.warningType !== 'TURBIDITY_HIGH' ||
                    (currentTime - lastWarningStatus.warningTimestamp > MIN_WARNING_INTERVAL)
            };
        }

        // Periksa suhu air
        if (!warningResult.hasWarning && (sanitizedData.temperature < 15 || sanitizedData.temperature > 35)) {
            const isTooHot = sanitizedData.temperature > 35;
            warningResult = {
                hasWarning: true,
                warningType: isTooHot ? 'TEMP_HIGH' : 'TEMP_LOW',
                warningValue: sanitizedData.temperature,
                warningThreshold: isTooHot ? 35 : 15,
                warningMessage: isTooHot
                    ? `Suhu air ${sanitizedData.temperature.toFixed(2)}°C terlalu tinggi (di atas 35°C)`
                    : `Suhu air ${sanitizedData.temperature.toFixed(2)}°C terlalu rendah (di bawah 15°C)`,
                isNewWarning: lastWarningStatus.warningType !== (isTooHot ? 'TEMP_HIGH' : 'TEMP_LOW') ||
                    (currentTime - lastWarningStatus.warningTimestamp > MIN_WARNING_INTERVAL)
            };
        }

        // Jika ada warning, tampilkan notifikasi
        if (warningResult.hasWarning) {
            // Perbarui status warning terakhir
            lastWarningStatus = {
                hasActiveWarning: true,
                warningTimestamp: currentTime,
                warningType: warningResult.warningType,
                warningValue: warningResult.warningValue,
                warningThreshold: warningResult.warningThreshold
            };

            // Tampilkan notifikasi baru atau perbarui yang ada
            await showWarningNotification(sanitizedData, warningResult.warningMessage, warningResult.isNewWarning);
            return true;
        } else if (lastWarningStatus.hasActiveWarning) {
            // Jika sebelumnya ada warning tapi sekarang sudah normal, hapus notifikasi warning
            await Notifications.dismissNotificationAsync(WARNING_NOTIFICATION_ID);
            lastWarningStatus.hasActiveWarning = false;

            // Tampilkan notifikasi kondisi normal
            await showNormalConditionNotification(sanitizedData);
        }

        return false;
    } catch (error) {
        console.error('[NOTIF] Error checking sensor warnings:', error);
        return false;
    }
};

// Fungsi untuk menampilkan notifikasi warning
const showWarningNotification = async (sensorData: SensorData, warningMessage: string, playSound: boolean) => {
    try {
        // Get current time in a nice format
        const timeString = new Date().toLocaleTimeString();

        // Format seluruh data untuk tampilan lengkap
        const fullMessage = `⚠️ PERINGATAN: ${warningMessage}\n\n` +
            `Data Sensor saat ini:\n` +
            `pH: ${sensorData.ph.toFixed(2)} (${getPHStatusInfo(sensorData.ph).label})\n` +
            `Kekeruhan: ${sensorData.turbidity.toFixed(2)} NTU (${getTurbidityStatusInfo(sensorData.turbidity).label})\n` +
            `Suhu: ${sensorData.temperature.toFixed(2)}°C\n` +
            `Kecepatan: ${sensorData.speed.toFixed(2)} m/s\n\n` +
            `Waktu terdeteksi: ${timeString}`;

        // Tampilkan atau perbarui notifikasi warning
        await Notifications.scheduleNotificationAsync({
            identifier: WARNING_NOTIFICATION_ID,
            content: {
                title: '⚠️ Peringatan Kualitas Air',
                subtitle: warningMessage,
                body: fullMessage,
                data: {
                    type: 'water-quality-warning',
                    timestamp: Date.now(),
                    sensorData: sensorData
                },
                sound: playSound, // Hanya bunyi jika notifikasi baru
                priority: 'max',
                badge: 1,
                android: {
                    channelId: 'sensor_monitoring',
                    priority: Notifications.AndroidNotificationPriority.LOW,
                    color: '#FF9800', // Orange for warnings
                    sticky: true,
                    smallIcon: 'ic_warning', // Ganti dengan icon warning yang ada di resources
                    style: {
                        type: 'bigText',
                        title: '⚠️ Peringatan Kualitas Air',
                        summary: warningMessage,
                        bigText: fullMessage
                    },
                    vibrate: playSound ? [0, 250, 250, 250] : false, // Hanya getar jika notifikasi baru
                }
            } as Notifications.NotificationContentInput,
            trigger: null
        });

        return true;
    } catch (error) {
        console.error('[NOTIF] Error showing warning notification:', error);
        return false;
    }
};

// Fungsi untuk menampilkan notifikasi kondisi normal kembali
const showNormalConditionNotification = async (sensorData: SensorData) => {
    try {
        const timeString = new Date().toLocaleTimeString();

        // Notifikasi normal dengan ID baru (tidak update yang sebelumnya)
        const normalNotificationId = `normal-condition-${Date.now()}`;

        await Notifications.scheduleNotificationAsync({
            identifier: normalNotificationId,
            content: {
                title: '✅ Kualitas Air Kembali Normal',
                body: `Semua parameter air telah kembali ke nilai normal pada ${timeString}.\n\n` +
                    `pH: ${sensorData.ph.toFixed(2)}\n` +
                    `Kekeruhan: ${sensorData.turbidity.toFixed(2)} NTU\n` +
                    `Suhu: ${sensorData.temperature.toFixed(2)}°C`,
                data: {
                    type: 'water-quality-normal',
                    timestamp: Date.now(),
                    sensorData: sensorData
                },
                sound: true,
                priority: 'high',
                badge: 1,
                android: {
                    channelId: 'sensor_monitoring',
                    priority: Notifications.AndroidNotificationPriority.LOW,
                    color: '#4CAF50', // Green for normal conditions
                    smallIcon: 'ic_check_circle',
                    style: {
                        type: 'bigText',
                        title: '✅ Kualitas Air Kembali Normal',
                        bigText: `Semua parameter air telah kembali ke nilai normal pada ${timeString}.\n\n` +
                            `pH: ${sensorData.ph.toFixed(2)}\n` +
                            `Kekeruhan: ${sensorData.turbidity.toFixed(2)} NTU\n` +
                            `Suhu: ${sensorData.temperature.toFixed(2)}°C`
                    }
                }
            } as Notifications.NotificationContentInput,
            trigger: null
        });

        // Notifikasi normal akan otomatis hilang setelah 10 detik
        setTimeout(async () => {
            await Notifications.dismissNotificationAsync(normalNotificationId);
        }, 10000);

        return true;
    } catch (error) {
        console.error('[NOTIF] Error showing normal condition notification:', error);
        return false;
    }
};