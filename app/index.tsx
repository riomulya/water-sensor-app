import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "../global.css";
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { BatteryOptimizationDialog } from '../components/AlertDialog';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

// Setup notification handler at the app level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    // Navigate to login screen after animation completes
    const timer = setTimeout(() => {
      router.replace('./auth/Login');
    }, 5000); // 5 seconds, adjusted for 2x speed animation

    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <View style={styles.container}>
        <LottieView
          ref={lottieRef}
          source={require('../assets/animations/splash-screen.json')}
          autoPlay
          speed={1.5}
          loop={false}
          resizeMode="cover"
          style={styles.lottieAnimation}
          onAnimationFinish={() => {
            router.replace('./auth/Login');
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffccdd',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lottieAnimation: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
});