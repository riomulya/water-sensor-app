import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannel, startForegroundService, stopForegroundService } from './NotificationService';

interface NotificationComponentProps {
    isRunning: boolean;
    sensorData: {
        accel_x: number;
        accel_y: number;
        accel_z: number;
        ph: number;
        turbidity: number;
        temperature: number;
        speed: number;
    };
}

export const NotificationComponent = ({
    isRunning,
    sensorData,
}: NotificationComponentProps) => {
    useEffect(() => {
        const configureNotifications = async () => {
            // Setup handler untuk foreground notifications
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: false,
                    shouldPlaySound: false,
                    shouldSetBadge: false,
                }),
            });

            await setupNotificationChannel();

            // Request permission sesuai platform
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                await Notifications.requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                        allowDisplayInCarPlay: true,
                    },
                });
            }
        };

        configureNotifications();
    }, []);

    useEffect(() => {
        if (isRunning) {
            startForegroundService(sensorData);
        } else {
            stopForegroundService();
        }
    }, [isRunning, sensorData]);

    useEffect(() => {
        const checkChannel = async () => {
            const channels = await Notifications.getNotificationChannelsAsync();
            console.log('Registered channels:', channels);
        };
        checkChannel();
    }, []);

    return null;
}; 