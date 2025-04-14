import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { startForegroundService, stopForegroundService } from '../components/notification/NotificationService';

export const useForegroundService = (sensorData: any) => {
    const [isServiceRunning, setIsServiceRunning] = useState(false);

    const updateService = useCallback(async () => {
        if (isServiceRunning) {
            await startForegroundService(sensorData);
        }
    }, [sensorData, isServiceRunning]);

    useEffect(() => {
        const interval = setInterval(updateService, 15000); // Update setiap 15 detik
        return () => clearInterval(interval);
    }, [updateService]);

    const startService = useCallback(async () => {
        setIsServiceRunning(true);
        await startForegroundService(sensorData);
    }, [sensorData]);

    const stopService = useCallback(async () => {
        setIsServiceRunning(false);
        await stopForegroundService();
    }, []);

    useEffect(() => {
        return () => {
            stopService();
        };
    }, []);

    return { isServiceRunning, startService, stopService };
}; 