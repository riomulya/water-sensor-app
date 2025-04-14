import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
    startForegroundService,
    stopForegroundService,
    updateForegroundNotification,
    setupNotificationChannel,
    saveSensorDataForBackground,
    clearAllNotifications
} from '../components/notification/NotificationService';

type SensorData = {
    accel_x: number;
    accel_y: number;
    accel_z: number;
    ph: number;
    turbidity: number;
    temperature: number;
    speed: number;
};

const NOTIFICATION_UPDATE_INTERVAL = 10000; // 10 seconds

export const useForegroundService = (sensorData: SensorData) => {
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const appState = useRef(AppState.currentState);
    const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const dataUpdateCountRef = useRef(0);

    // Handle app state changes (foreground/background)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            // Going from foreground to background
            if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
                console.log('[FOREGROUND] App going to background');

                if (isServiceRunning) {
                    // Save data for background access
                    await saveSensorDataForBackground(sensorData);

                    // Show notification when app goes to background
                    await startForegroundService(sensorData);
                }
            }

            // Coming back to foreground
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('[FOREGROUND] App coming to foreground');

                if (isServiceRunning) {
                    // Clear notifications when app comes to foreground
                    await clearAllNotifications();
                }
            }

            appState.current = nextAppState;
        };

        // Subscribe to app state changes
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Setup notification channel when component mounts
        setupNotificationChannel();

        return () => {
            subscription.remove();
        };
    }, [isServiceRunning, sensorData]);

    // Update background notifications when service is running
    useEffect(() => {
        if (isServiceRunning) {
            // Set up interval to update notifications when in background
            updateIntervalRef.current = setInterval(async () => {
                // Only update if app is in background
                if (AppState.currentState === 'background') {
                    dataUpdateCountRef.current += 1;
                    await updateForegroundNotification(sensorData);
                }
            }, 30000); // Ubah menjadi 30000ms (30 detik) agar tidak terlalu sering
        } else {
            // Clear interval when service is stopped
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
                updateIntervalRef.current = null;
            }
        }

        // Cleanup
        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
                updateIntervalRef.current = null;
            }
        };
    }, [isServiceRunning, sensorData]);

    // Start the monitoring service
    const startService = async () => {
        try {
            // Validation check for sensor data
            if (!sensorData || typeof sensorData !== 'object') {
                console.error('[FOREGROUND] Invalid sensor data:', sensorData);
                return false;
            }

            // Check if any required property is undefined
            const requiredProps = ['ph', 'turbidity', 'temperature', 'speed'];
            for (const prop of requiredProps) {
                if (sensorData[prop as keyof SensorData] === undefined) {
                    console.warn(`[FOREGROUND] Warning: ${prop} is undefined in sensor data`);
                }
            }

            // Ensure permission
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.log('[FOREGROUND] Notification permission denied');
                return false;
            }

            // Setup notification channel
            await setupNotificationChannel();

            // Set state to running, but don't show notification yet
            // Notification will show when app goes to background
            setIsServiceRunning(true);
            dataUpdateCountRef.current = 0;

            // If already in background, show notification immediately
            if (AppState.currentState === 'background') {
                await startForegroundService(sensorData);
            }

            console.log('[FOREGROUND] Service started');
            return true;
        } catch (error) {
            console.error('[FOREGROUND] Error starting service:', error);
            return false;
        }
    };

    // Stop the monitoring service
    const stopService = async () => {
        try {
            // Clear all notifications
            await stopForegroundService();
            await clearAllNotifications();

            setIsServiceRunning(false);

            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
                updateIntervalRef.current = null;
            }

            console.log('[FOREGROUND] Service stopped');
            return true;
        } catch (error) {
            console.error('[FOREGROUND] Error stopping service:', error);
            return false;
        }
    };

    return {
        isServiceRunning,
        startService,
        stopService
    };
}; 