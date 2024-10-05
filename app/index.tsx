import React from 'react';
import Tabs from '@/components/navigation/Tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync(Entypo.font);
        // Simulate a slow loading experience
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        await SplashScreen.hideAsync(); // Hide splash screen here
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LottieView
          source={require('../assets/animations/loading-animation.json')}
          autoPlay
          loop
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs />
    </GestureHandlerRootView>
  );
}
