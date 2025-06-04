import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import RootLayout from './app';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

// Setup notification handler at the app level
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function App() {
    // Request notification permissions when app starts
    useEffect(() => {
        const setupNotifications = async () => {
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    console.log('Failed to get push token for push notification!');
                    return;
                }

                // Setup Android notification channel
                if (Platform.OS === 'android') {
                    await Notifications.setNotificationChannelAsync('sensor_monitoring', {
                        name: 'Sensor Monitoring',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                    });

                    console.log('Notification channel created');
                }

                // Show startup notification
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Aplikasi Pemantauan Air',
                        body: 'Aplikasi telah dimulai dan siap memantau data sensor',
                    },
                    trigger: null,
                });
            } catch (error) {
                console.error('Error setting up notifications:', error);
            }
        };

        setupNotifications();

        return () => {
            // Unregister all tasks when app is completely unmounted
            TaskManager.unregisterAllTasksAsync().catch(error =>
                console.error('Error unregistering tasks on app unmount:', error)
            );
        };
    }, []);

    return (
        <GluestackUIProvider >
            <StatusBar style="auto" />
            <RootLayout />
        </GluestackUIProvider>
    );
} 