import React, { useEffect, useState } from 'react';
import { Text, Image, Dimensions, StyleSheet, Pressable, LogBox, Button, View, Alert, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import { Link, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "../global.css";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { BatteryOptimizationDialog } from '../components/AlertDialog';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Platform } from 'react-native';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

// Background task name
const BACKGROUND_NOTIF_TASK = 'background-sensor-notification-index';

// Define the background task handler
// TaskManager.defineTask(BACKGROUND_NOTIF_TASK, async () => {
//   try {
//     console.log('[INDEX] Background task running at', new Date().toISOString());

//     // Try to get latest sensor data from storage
//     const jsonValue = await AsyncStorage.getItem('LATEST_SENSOR_DATA');
//     if (jsonValue != null) {
//       const sensorData = JSON.parse(jsonValue);
//       console.log('[INDEX] Loaded background data:', sensorData);

//       // Show notification with the data
//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title: '🌊 Update Sensor Air (Background)',
//           body: `pH: ${sensorData.ph.toFixed(2)} | Suhu: ${sensorData.temperature.toFixed(2)}°C
// Turbidity: ${sensorData.turbidity.toFixed(2)} NTU | Kecepatan: ${sensorData.speed.toFixed(2)} m/s`,
//           data: { source: 'index-background-task' },
//           android: {
//             channelId: 'sensor_monitoring',
//             priority: Notifications.AndroidNotificationPriority.MAX,
//             sticky: true,
//             color: '#FF0000',
//             vibrate: [0, 250, 250, 250],
//             ongoing: true,
//           }
//         } as Notifications.NotificationContentInput,
//         trigger: null, // Show immediately
//       });
//       return BackgroundFetch.BackgroundFetchResult.NewData;
//     } else {
//       // Show test notification to check if task is running
//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title: 'Background Task Berjalan',
//           body: 'Task sedang berjalan tanpa data sensor',
//           data: { source: 'index-background-test' },
//         },
//         trigger: null,
//       });
//       return BackgroundFetch.BackgroundFetchResult.NoData;
//     }
//   } catch (error) {
//     console.error('[INDEX] Background task error:', error);
//     return BackgroundFetch.BackgroundFetchResult.Failed;
//   }
// });

// Setup notification handler at the app level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Add at the top of your file (outside component)
LogBox.ignoreLogs(['defaultProps will be removed']);

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

export default function App() {
  const [showBatteryDialog, setShowBatteryDialog] = useState(false);

  useEffect(() => {
    const checkBatteryOptimization = async () => {
      if (Platform.OS === 'android') {
        setShowBatteryDialog(true); // Tampilkan dialog saat komponen mount
      }
    };
    checkBatteryOptimization();
  }, []);

  // Setup background fetch task
  // useEffect(() => {
  //   const registerBackgroundTask = async () => {
  //     try {
  //       // Check if task is already registered
  //       const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIF_TASK);
  //       console.log('[INDEX] Background task registered:', isRegistered);

  //       // Unregister first if exists to ensure clean state
  //       if (isRegistered) {
  //         try {
  //           await TaskManager.unregisterTaskAsync(BACKGROUND_NOTIF_TASK);
  //           console.log('[INDEX] Unregistered existing task');
  //         } catch (error) {
  //           console.error('[INDEX] Error unregistering task:', error);
  //         }
  //       }

  //       // Check if background fetch is available
  //       const backgroundFetchStatus = await BackgroundFetch.getStatusAsync();
  //       console.log('[INDEX] Background fetch status:', backgroundFetchStatus);

  //       if (backgroundFetchStatus === BackgroundFetch.BackgroundFetchStatus.Available) {
  //         // Register the background fetch task
  //         await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIF_TASK, {
  //           minimumInterval: 15, // Run every 15 seconds
  //           stopOnTerminate: false, // Continue running when app is terminated
  //           startOnBoot: true, // Start when device boots
  //         });

  //         // Set the minimum interval
  //         await BackgroundFetch.setMinimumIntervalAsync(15);

  //         // Verify registration
  //         const isNowRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIF_TASK);
  //         console.log('[INDEX] Background task registered successfully:', isNowRegistered);

  //         if (isNowRegistered) {
  //           // Show confirmation notification
  //           await Notifications.scheduleNotificationAsync({
  //             content: {
  //               title: 'Background Service Aktif',
  //               body: 'Layanan notifikasi background telah diaktifkan',
  //             },
  //             trigger: null,
  //           });
  //         } else {
  //           console.error('[INDEX] Failed to register background task after attempt');
  //         }
  //       } else {
  //         console.warn('[INDEX] Background fetch is not available on this device');
  //       }
  //     } catch (error) {
  //       console.error('[INDEX] Error registering background task:', error);
  //     }
  //   };

  //   registerBackgroundTask();
  // }, []);

  // Request notification permissions when app starts
  // useEffect(() => {
  //   const setupNotifications = async () => {
  //     try {
  //       const { status: existingStatus } = await Notifications.getPermissionsAsync();
  //       let finalStatus = existingStatus;

  //       if (existingStatus !== 'granted') {
  //         const { status } = await Notifications.requestPermissionsAsync();
  //         finalStatus = status;
  //       }

  //       if (finalStatus !== 'granted') {
  //         console.log('Failed to get push token for push notification!');
  //         return;
  //       }

  //       // Setup Android notification channel
  //       if (Platform.OS === 'android') {
  //         await Notifications.setNotificationChannelAsync('sensor_monitoring', {
  //           name: 'Sensor Monitoring',
  //           importance: Notifications.AndroidImportance.MAX,
  //           vibrationPattern: [0, 250, 250, 250],
  //           lightColor: '#FF231F7C',
  //         });

  //         console.log('Notification channel created');
  //       }

  //       // Show startup notification
  //       await Notifications.scheduleNotificationAsync({
  //         content: {
  //           title: 'Aplikasi Pemantauan Air',
  //           body: 'Aplikasi telah dimulai dan siap memantau data sensor',
  //         },
  //         trigger: null,
  //       });
  //     } catch (error) {
  //       console.error('Error setting up notifications:', error);
  //     }
  //   };

  //   setupNotifications();

  //   return () => {
  //     // Unregister all tasks when app is completely unmounted
  //     TaskManager.unregisterAllTasksAsync().catch(error =>
  //       console.error('Error unregistering tasks on app unmount:', error)
  //     );
  //   };
  // }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BatteryOptimizationDialog
        visible={showBatteryDialog}
        onClose={() => setShowBatteryDialog(false)}
        onConfirm={async () => {
          try {
            await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
            setShowBatteryDialog(false);
          } catch (error) {
            Alert.alert('Error', 'Gagal membuka pengaturan baterai');
          }
        }}
      />

      <LinearGradient
        colors={['#ffffff', '#ffcccc']}
        style={styles.container}
      >
        {/* Logo Section */}
        <MotiView
          from={{ translateY: -50, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            duration: 1000,
          }}
          style={styles.logoContainer}
        >
          <Image
            source={require('../assets/images/full-logo.png')} // Update path to your Vector.png file
            style={styles.logo}
          />
        </MotiView>

        {/* Text Section */}
        <MotiText
          from={{ translateY: 30, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{
            delay: 50,
            type: 'timing',
            duration: 800,
          }}
          style={styles.headerText}
        >
          SELAMAT DATANG DI
        </MotiText>

        <MotiText
          from={{ translateY: 30, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{
            delay: 70,
            type: 'timing',
            duration: 800,
          }}
          style={styles.subHeaderText}
        >
          PENGUKURAN DAN PREDIKSI KADAR AIR SUNGAI
        </MotiText>

        {/* Illustration Section */}
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 90,
            type: 'timing',
            duration: 700,
          }}
          style={styles.imageContainer}
        >
          <Image
            source={require('../assets/images/Group 229.png')} // Update path to your Group 229.png file
            style={styles.illustration}
          />
        </MotiView>

        {/* Button */}
        <Pressable onPress={() => { router.replace('./auth/Login'); }}>
          <MotiView
            from={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'timing',
              duration: 900,
              delay: 120,
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Lanjutkan
            </Text>
          </MotiView>
        </Pressable>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 144,
    height: 146,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  subHeaderText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#ff3333',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  illustration: {
    width: screenWidth * 1,
    height: screenHeight * 0.4,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#ff3333',
    width: screenWidth * 0.8,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});