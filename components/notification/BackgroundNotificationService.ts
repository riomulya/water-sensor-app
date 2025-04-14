// import * as Notifications from 'expo-notifications';
// import * as TaskManager from 'expo-task-manager';
// import * as BackgroundFetch from 'expo-background-fetch';
// import { Platform, AppState } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// // Define background task name
// const BACKGROUND_TASK_NAME = 'background-mqtt-notification';

// // Define types for the task data
// interface TaskData {
//     message?: {
//         ph: number;
//         turbidity: number;
//         temperature: number;
//         speed: number;
//     };
// }

// // Store the latest sensor data
// let latestSensorData: TaskData['message'] | null = null;

// // Define task handler
// TaskManager.defineTask<TaskData>(BACKGROUND_TASK_NAME, async ({ data, error }) => {
//     console.log('[BACKGROUND] Task started', new Date().toISOString());

//     // Cek status aplikasi - jika tidak di background maka jangan kirim notifikasi
//     if (AppState.currentState !== 'background') {
//         console.log('[BACKGROUND] App is not in background, skipping notification');
//         return BackgroundFetch.BackgroundFetchResult.NoData;
//     }

//     if (error) {
//         console.error('[BACKGROUND] Task error:', error);
//         return BackgroundFetch.BackgroundFetchResult.Failed;
//     }

//     // Try to get message from passed data first
//     let message = data?.message;

//     // If no data passed, use latest sensor data stored in memory
//     if (!message && latestSensorData) {
//         message = latestSensorData;
//         console.log('[BACKGROUND] Using latest in-memory data');
//     }

//     // If still no data, try to get from AsyncStorage
//     if (!message) {
//         try {
//             const jsonValue = await AsyncStorage.getItem('LATEST_SENSOR_DATA');
//             if (jsonValue != null) {
//                 message = JSON.parse(jsonValue);
//                 console.log('[BACKGROUND] Loaded data from storage:', message);
//             }
//         } catch (e) {
//             console.error('[BACKGROUND] Error reading stored data:', e);
//         }
//     }

//     if (message) {
//         try {
//             console.log('[BACKGROUND] Processing sensor data:', message);

//             // Helper function to safely convert values and get fixed strings
//             const getFixedValue = (value: any): string => {
//                 if (value === undefined || value === null) return 'N/A';
//                 if (typeof value === 'string') {
//                     const num = parseFloat(value);
//                     return isNaN(num) ? 'N/A' : num.toFixed(2);
//                 }
//                 if (typeof value === 'number' && !isNaN(value)) {
//                     return value.toFixed(2);
//                 }
//                 return 'N/A';
//             };

//             // Get safe string values
//             const ph = getFixedValue(message.ph);
//             const turbidity = getFixedValue(message.turbidity);
//             const temperature = getFixedValue(message.temperature);
//             const speed = getFixedValue(message.speed);

//             // Format notification content with FORCED priority for background
//             // Membuat identifier unik berdasarkan waktu
//             const notificationId = `sensor-update-${Date.now()}`;

//             // Coba hapus notifikasi sebelumnya jika ada (untuk mencegah stacking)
//             await Notifications.dismissAllNotificationsAsync();

//             // Atur notifikasi dengan prioritas MAKSIMUM
//             await Notifications.scheduleNotificationAsync({
//                 identifier: notificationId,
//                 content: {
//                     title: '🌊 Monitoring Sensor Air Aktif',
//                     body: `pH: ${ph}
// Turbidity: ${turbidity} NTU
// Temperature: ${temperature}°C
// Speed: ${speed} m/s`,
//                     data: { type: 'background-mqtt-update', timestamp: new Date().toISOString() },
//                     sound: true,
//                     priority: 'max',
//                     android: {
//                         channelId: 'sensor_monitoring',
//                         priority: Notifications.AndroidNotificationPriority.MAX,
//                         color: '#2196F3',
//                         smallIcon: 'ic_notification',
//                         largeIcon: 'ic_launcher',
//                         vibrate: [0, 250, 250, 250],
//                         importance: Notifications.AndroidImportance.MAX,
//                         visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
//                         ongoing: true,
//                         sticky: true,
//                     },
//                     ios: {
//                         sound: true,
//                         badge: 1,
//                     },
//                 } as Notifications.NotificationContentInput,
//                 trigger: null, // Show immediately
//             });
//             console.log('[BACKGROUND] Notification scheduled with ID:', notificationId);

//             return BackgroundFetch.BackgroundFetchResult.NewData;
//         } catch (error) {
//             console.error('[BACKGROUND] Failed to schedule notification:', error);
//             return BackgroundFetch.BackgroundFetchResult.Failed;
//         }
//     } else {
//         console.log('[BACKGROUND] No sensor data available');
//         return BackgroundFetch.BackgroundFetchResult.NoData;
//     }
// });

// // Function to update sensor data
// // export const updateSensorData = (data: TaskData['message']) => {
// //     try {
// //         if (!data) {
// //             console.error('[BACKGROUND] Invalid sensor data, cannot update');
// //             return;
// //         }

// //         // Convert string values to numbers if needed
// //         const processedData = {
// //             ph: typeof data.ph === 'string' ? parseFloat(data.ph) : data.ph,
// //             turbidity: typeof data.turbidity === 'string' ? parseFloat(data.turbidity) : data.turbidity,
// //             temperature: typeof data.temperature === 'string' ? parseFloat(data.temperature) : data.temperature,
// //             speed: typeof data.speed === 'string' ? parseFloat(data.speed) : data.speed,
// //         };

// //         latestSensorData = processedData;
// //         console.log('[BACKGROUND] Updated sensor data:', processedData);

// //         // Store data to AsyncStorage for persistence across app restarts
// //         try {
// //             const jsonValue = JSON.stringify(processedData);
// //             AsyncStorage.setItem('LATEST_SENSOR_DATA', jsonValue)
// //                 .catch(error => console.error('[BACKGROUND] Failed to store sensor data:', error));
// //         } catch (e) {
// //             console.error('[BACKGROUND] Error serializing sensor data:', e);
// //         }

// //         // Trigger background task only if app is in background
// //         if (AppState.currentState === 'background') {
// //             BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
// //                 minimumInterval: 1, // Minimum interval in seconds
// //                 stopOnTerminate: false,
// //                 startOnBoot: true,
// //             }).catch(error => {
// //                 console.error('[BACKGROUND] Failed to register task:', error);
// //             });
// //         }
// //     } catch (error) {
// //         console.error('[BACKGROUND] Error in updateSensorData:', error);
// //     }
// // };

// // export const registerBackgroundTask = async () => {
// //     try {
// //         console.log('[BACKGROUND] Starting background task registration');

// //         // Check if task is already registered
// //         const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
// //         console.log('[BACKGROUND] Task registration status:', isRegistered);

// //         // Always unregister first to ensure clean setup
// //         if (isRegistered) {
// //             try {
// //                 await TaskManager.unregisterTaskAsync(BACKGROUND_TASK_NAME);
// //                 console.log('[BACKGROUND] Unregistered existing task');
// //             } catch (error) {
// //                 console.error('[BACKGROUND] Error unregistering task:', error);
// //             }
// //         }

// //         // Set minimum interval
// //         try {
// //             await BackgroundFetch.setMinimumIntervalAsync(15); // Set to 15 seconds
// //             console.log('[BACKGROUND] Set minimum background fetch interval to 15s');
// //         } catch (error) {
// //             console.error('[BACKGROUND] Error setting minimum interval:', error);
// //         }

// //         // Register the task
// //         try {
// //             // Initialize background fetch with shorter interval for more reliable updates
// //             await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
// //                 minimumInterval: 15, // 15 seconds
// //                 stopOnTerminate: false, // Continue running when app is terminated
// //                 startOnBoot: true, // Start when device boots
// //             });
// //             console.log('[BACKGROUND] Background task registered successfully');

// //             // Verify task registration was successful
// //             const isNowRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
// //             console.log('[BACKGROUND] Task registration confirmed:', isNowRegistered);

// //             if (!isNowRegistered) {
// //                 console.error('[BACKGROUND] Task registration failed verification check');
// //             }
// //         } catch (error) {
// //             console.error('[BACKGROUND] Task registration error:', error);
// //         }
// //     } catch (error) {
// //         console.error('[BACKGROUND] Failed to register background task:', error);
// //     }
// // };

// // export const unregisterBackgroundTask = async () => {
// //     try {
// //         // Check if task is registered before trying to unregister
// //         const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
// //         console.log('[BACKGROUND] Task registration status before unregister:', isRegistered);

// //         if (isRegistered) {
// //             try {
// //                 // Gunakan TaskManager.unregisterTaskAsync sebagai alternatif yang lebih reliable
// //                 await TaskManager.unregisterTaskAsync(BACKGROUND_TASK_NAME);
// //                 console.log('[BACKGROUND] Task unregistered from TaskManager');
// //             } catch (error) {
// //                 console.error('[BACKGROUND] Error unregistering from TaskManager:', error);
// //             }
// //         } else {
// //             console.log('[BACKGROUND] Task was not registered, skipping unregister');
// //         }
// //     } catch (error) {
// //         console.error('[BACKGROUND] Failed to unregister background task:', error);
// //     }
// // };

// export const setupBackgroundNotificationChannel = async () => {
//     if (Platform.OS === 'android') {
//         try {
//             await Notifications.setNotificationChannelAsync('sensor_monitoring', {
//                 name: 'Sensor Monitoring',
//                 importance: Notifications.AndroidImportance.HIGH,
//                 vibrationPattern: [0, 250, 250, 250],
//                 lightColor: '#FF231F7C',
//                 enableVibrate: true,
//                 enableLights: true,
//                 showBadge: true,
//             });
//             console.log('[BACKGROUND] Notification channel setup successfully');
//         } catch (error) {
//             console.error('[BACKGROUND] Failed to setup notification channel:', error);
//         }
//     }
// };

// export const initializeBackgroundSystem = async () => {
//     try {
//         // Setup notification channel
//         await setupBackgroundNotificationChannel();

//         // Register background task
//         // await registerBackgroundTask();

//         // Try to load last saved data
//         try {
//             const jsonValue = await AsyncStorage.getItem('LATEST_SENSOR_DATA');
//             if (jsonValue != null) {
//                 const savedData = JSON.parse(jsonValue);
//                 console.log('[BACKGROUND] Initializing with saved data:', savedData);
//                 // Check background fetch status
//                 const status = await BackgroundFetch.getStatusAsync();
//                 console.log('[BACKGROUND] Background fetch status:', status);
//             }
//         } catch (e) {
//             console.error('[BACKGROUND] Error loading saved data:', e);
//         }
//     } catch (error) {
//         console.error('[BACKGROUND] Initialization error:', error);
//     }
// }; 