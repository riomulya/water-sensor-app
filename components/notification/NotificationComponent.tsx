// import React, { useEffect, useRef } from 'react';
// import { Platform, AppState, AppStateStatus } from 'react-native';
// import * as Notifications from 'expo-notifications';
// import {
//     // registerBackgroundTask,
//     // unregisterBackgroundTask,
//     setupBackgroundNotificationChannel,
//     // updateSensorData,
//     initializeBackgroundSystem
// } from './BackgroundNotificationService';
// import * as BackgroundFetch from 'expo-background-fetch';

// interface NotificationComponentProps {
//     sensorData: {
//         ph: number;
//         turbidity: number;
//         temperature: number;
//         speed: number;
//     };
//     isRunning: boolean;
// }

// export const NotificationComponent: React.FC<NotificationComponentProps> = ({ sensorData, isRunning }) => {
//     const appState = useRef<AppStateStatus>(AppState.currentState);

//     // Handle app state changes
//     useEffect(() => {
//         const handleAppStateChange = (nextAppState: AppStateStatus) => {
//             if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
//                 console.log('[NOTIFICATION] App going to background, ensuring tasks are registered');
//                 if (isRunning) {
//                     // Update sensor data before going to background
//                     // updateSensorData(sensorData);
//                     // registerBackgroundTask().catch(error =>
//                     //     console.error('[NOTIFICATION] Error registering task on background:', error)
//                     // );
//                 }
//             }

//             if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
//                 console.log('[NOTIFICATION] App coming to foreground');
//                 // Hapus semua notifikasi saat app kembali aktif
//                 Notifications.dismissAllNotificationsAsync();
//             }

//             appState.current = nextAppState;
//         };

//         const subscription = AppState.addEventListener('change', handleAppStateChange);

//         return () => {
//             subscription.remove();
//         };
//     }, [sensorData, isRunning]);

//     useEffect(() => {
//         const configureNotifications = async () => {
//             try {
//                 console.log('[NOTIFICATION] Starting notification setup');

//                 // Configure notification handler
//                 Notifications.setNotificationHandler({
//                     handleNotification: async () => ({
//                         shouldShowAlert: true,
//                         shouldPlaySound: true,
//                         shouldSetBadge: true,
//                     }),
//                 });

//                 // Request notification permissions
//                 const { status: existingStatus } = await Notifications.getPermissionsAsync();
//                 console.log('[NOTIFICATION] Existing permission status:', existingStatus);

//                 let finalStatus = existingStatus;
//                 if (existingStatus !== 'granted') {
//                     const { status } = await Notifications.requestPermissionsAsync({
//                         ios: {
//                             allowAlert: true,
//                             allowBadge: true,
//                             allowSound: true,
//                         },
//                     });
//                     finalStatus = status;
//                     console.log('[NOTIFICATION] New permission status:', status);
//                 }

//                 if (finalStatus !== 'granted') {
//                     console.error('[NOTIFICATION] Failed to get notification permissions');
//                     return;
//                 }

//                 // Request background fetch permissions
//                 const backgroundFetchStatus = await BackgroundFetch.getStatusAsync();
//                 console.log('[NOTIFICATION] Background fetch status:', backgroundFetchStatus);

//                 if (backgroundFetchStatus !== BackgroundFetch.BackgroundFetchStatus.Available) {
//                     console.error('[NOTIFICATION] Background fetch is not available');
//                     return;
//                 }

//                 // Initialize our background notification system
//                 await initializeBackgroundSystem();

//                 console.log('[NOTIFICATION] Setup completed successfully');
//             } catch (error) {
//                 console.error('[NOTIFICATION] Setup failed:', error);
//             }
//         };

//         configureNotifications();

//         // Return cleanup function
//         return () => {
//             unregisterBackgroundTask().catch(error =>
//                 console.error('[NOTIFICATION] Error unregistering task on unmount:', error)
//             );
//         };
//     }, []);

//     // Sensor data effect
//     useEffect(() => {
//         if (isRunning) {
//             try {
//                 console.log('[NOTIFICATION] Updating sensor data:', sensorData);

//                 // Pastikan data valid sebelum update
//                 if (sensorData && typeof sensorData === 'object') {
//                     // Update sensor data in background service
//                     // updateSensorData(sensorData);
//                     console.log('[NOTIFICATION] Sensor data updated successfully');
//                 } else {
//                     console.warn('[NOTIFICATION] Invalid sensor data:', sensorData);
//                 }

//                 // Re-register background task to ensure it runs, but tidak tampilkan notifikasi di foreground
//                 if (AppState.currentState === 'background') {
//                     // registerBackgroundTask().catch(error =>
//                     //     console.error('[NOTIFICATION] Error registering task:', error)
//                     // );
//                     console.log('[NOTIFICATION] Background task started (app in background)');
//                 } else {
//                     console.log('[NOTIFICATION] App in foreground, not showing notification');
//                 }
//             } catch (error) {
//                 console.error('[NOTIFICATION] Error in sensor data effect:', error);
//             }
//         } else {
//             console.log('[NOTIFICATION] Stopping background task');
//             // Unregister background task
//             unregisterBackgroundTask();
//             // Clear any notifications
//             Notifications.dismissAllNotificationsAsync();
//         }
//     }, [isRunning, sensorData]);

//     return null;
// }; 