import React, { useEffect } from 'react';
import { Text, Image, Dimensions, StyleSheet, Pressable, LogBox, Button, View, Alert, } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import { Link, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import "../global.css";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";


// ID Task untuk notifikasi berjalan di background
const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";


// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

// Add at the top of your file (outside component)
LogBox.ignoreLogs(['defaultProps will be removed']);

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;

// Konfigurasi listener notifikasi
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });



// ID Task untuk background fetch
// const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

// Menangani Task di Background
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  console.log("Task background notifikasi berjalan...");

  // Contoh: Data real-time dari API atau sensor
  const data = new Date().toLocaleTimeString();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Notifikasi Tetap! ⏳",
      body: `Waktu saat ini: ${data}`,
      sound: true,
      sticky: true, // Notifikasi tetap
    },
    trigger: null, // Muncul langsung
  });

  return BackgroundFetch.BackgroundFetchResult.NewData;
});


export default function App() {
  // Setup notifikasi di root component
  useEffect(() => {
    async function registerBackgroundTask() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Ditolak", "Aplikasi membutuhkan izin untuk notifikasi.");
        return;
      }

      // Cek apakah task sudah terdaftar
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
      if (!isRegistered) {
        console.log("Mendaftarkan task background...");

        await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
          minimumInterval: 10, // Update setiap 10 detik
          stopOnTerminate: false, // Tetap berjalan saat aplikasi ditutup
          startOnBoot: true, // Mulai saat HP direstart
        });
      }
    }

    registerBackgroundTask();
  }, []);

  // Fungsi mengirim notifikasi langsung
  // async function sendNotification() {
  //   await Notifications.scheduleNotificationAsync({
  //     content: {
  //       title: "Halo, Rio! 🎸",
  //       body: "Ini adalah notifikasi lokal!",
  //       sound: true,
  //     },
  //     trigger: null, // null = langsung muncul
  //   });
  // }

  // Fungsi menjadwalkan notifikasi dalam 5 detik
  // async function scheduleNotification() {
  //   await Notifications.scheduleNotificationAsync({
  //     content: {
  //       title: "Pengingat!",
  //       body: "Cek transaksi hari ini!",
  //       sound: true,
  //     },
  //     trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  //   });
  // }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        <Pressable onPress={() => { router.replace('./screens/Home'); }}>
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
          {/* <View style={{ padding: 20 }}>
            <Button title="Kirim Notifikasi" onPress={sendNotification} />
            <Button title="Jadwalkan Notifikasi (5s)" onPress={scheduleNotification} />
          </View> */}
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
