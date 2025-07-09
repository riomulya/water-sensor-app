import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
    startForegroundService,
    stopForegroundService,
    updateForegroundNotification,
    setupNotificationChannel,
    saveSensorDataForBackground,
    clearAllNotifications,
    fetchSensorData,
    registerBackgroundFetch,
    unregisterBackgroundFetch
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

const NOTIFICATION_UPDATE_INTERVAL = 5000; // 5 seconds

export const useForegroundService = (initialSensorData: SensorData) => {
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const [sensorData, setSensorData] = useState<SensorData>(initialSensorData);
    const appState = useRef(AppState.currentState);
    const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const dataUpdateCountRef = useRef(0);
    const isFirstRunRef = useRef(true);

    // Function to fetch data from API
    const fetchDataFromApi = async () => {
        try {
            console.log('[FOREGROUND] Fetching data from API...');
            const data = await fetchSensorData();
            if (data) {
                console.log('[FOREGROUND] Data fetched successfully:', data);
                setSensorData(data);
                return data;
            }
            console.log('[FOREGROUND] No data returned from API');
            return null;
        } catch (error) {
            console.error('[FOREGROUND] Error fetching data:', error);
            return null;
        }
    };

    // Handle app state changes (foreground/background)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            // Going from foreground to background
            if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
                console.log('[FOREGROUND] App going to background');

                if (isServiceRunning) {
                    // Fetch latest data before going to background
                    const latestData = await fetchDataFromApi() || sensorData;

                    // Save data for background access
                    await saveSensorDataForBackground(latestData);

                    // Show notification when app goes to background
                    const notificationShown = await startForegroundService(latestData);
                    console.log('[FOREGROUND] Notification shown:', notificationShown);

                    // Start background fetch interval
                    startBackgroundFetching();

                    // Register background fetch task for long-term background operation
                    await registerBackgroundFetch();
                }
            }

            // Coming back to foreground
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('[FOREGROUND] App coming to foreground');

                if (isServiceRunning) {
                    // Clear notifications when app comes to foreground
                    await clearAllNotifications();

                    // Stop background fetching when coming to foreground
                    stopBackgroundFetching();

                    // No need to unregister background fetch task here
                    // Let it continue running in case app goes to background again
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

    // Function to start background data fetching
    const startBackgroundFetching = () => {
        // Clear any existing interval first
        stopBackgroundFetching();

        console.log('[FOREGROUND] Starting background fetch with interval:', NOTIFICATION_UPDATE_INTERVAL, 'ms');

        // Set up interval to fetch data every 5 seconds when in background
        fetchIntervalRef.current = setInterval(async () => {
            if (AppState.currentState === 'background') {
                console.log('[FOREGROUND] Background fetch triggered');
                const newData = await fetchDataFromApi();

                if (newData) {
                    console.log('[FOREGROUND] Updating notification with new data');
                    // Update notification with new data
                    const updated = await updateForegroundNotification(newData);
                    console.log('[FOREGROUND] Notification updated:', updated);
                    dataUpdateCountRef.current += 1;
                } else {
                    console.log('[FOREGROUND] No new data to update notification');
                }
            }
        }, NOTIFICATION_UPDATE_INTERVAL);

        console.log('[FOREGROUND] Background fetching started with interval:', NOTIFICATION_UPDATE_INTERVAL, 'ms');
    };

    // Function to stop background data fetching
    const stopBackgroundFetching = () => {
        if (fetchIntervalRef.current) {
            clearInterval(fetchIntervalRef.current);
            fetchIntervalRef.current = null;
            console.log('[FOREGROUND] Background fetching stopped');
        }
    };

    // Start the monitoring service
    const startService = async () => {
        try {
            console.log('[FOREGROUND] Starting service...');

            // Ensure permission
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.log('[FOREGROUND] Notification permission denied');
                return false;
            }

            // Setup notification channel
            await setupNotificationChannel();

            // Fetch latest data first
            const latestData = await fetchDataFromApi() || sensorData;

            // Validation check for sensor data
            if (!latestData || typeof latestData !== 'object') {
                console.error('[FOREGROUND] Invalid sensor data:', latestData);
                return false;
            }

            // Check if any required property is undefined
            const requiredProps = ['ph', 'turbidity', 'temperature', 'speed'];
            for (const prop of requiredProps) {
                if (latestData[prop as keyof SensorData] === undefined) {
                    console.warn(`[FOREGROUND] Warning: ${prop} is undefined in sensor data`);
                }
            }

            // Set state to running
            setIsServiceRunning(true);
            dataUpdateCountRef.current = 0;

            // Register background fetch task
            await registerBackgroundFetch();

            // If already in background, show notification immediately
            // and start background fetching
            if (AppState.currentState === 'background') {
                console.log('[FOREGROUND] App already in background, showing notification immediately');
                await startForegroundService(latestData);
                startBackgroundFetching();
            } else {
                console.log('[FOREGROUND] App in foreground, notification will show when app goes to background');
                // Force show notification for testing even in foreground
                if (isFirstRunRef.current) {
                    isFirstRunRef.current = false;
                    console.log('[FOREGROUND] First run, showing test notification');
                    await startForegroundService(latestData);
                }
            }

            console.log('[FOREGROUND] Service started successfully');
            return true;
        } catch (error) {
            console.error('[FOREGROUND] Error starting service:', error);
            return false;
        }
    };

    // Stop the monitoring service
    const stopService = async () => {
        try {
            console.log('[FOREGROUND] Stopping service...');

            // Stop background fetching
            stopBackgroundFetching();

            // Unregister background fetch task
            await unregisterBackgroundFetch();

            // Clear all notifications
            await stopForegroundService();
            await clearAllNotifications();

            setIsServiceRunning(false);

            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
                updateIntervalRef.current = null;
            }

            console.log('[FOREGROUND] Service stopped successfully');
            return true;
        } catch (error) {
            console.error('[FOREGROUND] Error stopping service:', error);
            return false;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopBackgroundFetching();
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, []);

    return {
        isServiceRunning,
        startService,
        stopService,
        sensorData
    };
}; 