import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export const setupNotificationChannel = async () => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('sensor_monitoring', {
            name: 'Sensor Monitoring',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }
};

export const startForegroundService = async (sensorData: SensorData) => {

    console.log('[NOTIF] Starting service with data:', sensorData);
    await Notifications.cancelScheduledNotificationAsync(ONGOING_NOTIFICATION_ID);
    // Update notification yang sudah ada daripada membuat baru
    await Notifications.scheduleNotificationAsync({
        identifier: ONGOING_NOTIFICATION_ID,
        content: {
            title: '🌊 Monitoring Sensor Air Aktif',
            body: `Memantau data sensor secara real-time:
Accelerometer X: ${sensorData.accel_x.toFixed(2)} m/s² 
Accelerometer Y: ${sensorData.accel_y.toFixed(2)} m/s² 
Accelerometer Z: ${sensorData.accel_z.toFixed(2)} m/s²
pH: ${sensorData.ph.toFixed(2)}
Turbidity: ${sensorData.turbidity.toFixed(2)} NTU
Temperature: ${sensorData.temperature.toFixed(2)} °C
Speed: ${sensorData.speed.toFixed(2)} m/s`,
            data: { type: 'foreground-service' },
            sticky: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            autoDismiss: false,
            vibrate: [0, 250, 250, 250],
            android: {
                channelId: 'sensor_monitoring',
                color: '#2196F3',
                ongoing: true,
                pressAction: {
                    id: 'default',
                },
            },
        } as Notifications.NotificationContentInput,
        trigger: null, // Tampilkan segera
    });
};

export const stopForegroundService = async () => {
    console.log('[NOTIF] Stopping service');
    await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID);
}; 