import React, { useState } from 'react';
import { View, Text, StyleSheet, LogBox } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import CustomAppBar from '@/components/CustomAppBar';
import CustomDrawer from '@/components/CustomDrawer';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

LogBox.ignoreLogs(['defaultProps will be removed']);

export default function HomeScreen() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <ProtectedRoute>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <CustomAppBar onMenuPress={toggleDrawer} title="Water Sensor" />

        <View style={styles.content}>
          <Text style={styles.welcomeText}>Welcome to Water Sensor App</Text>
          <Text style={styles.description}>
            Monitor water quality parameters in real-time and access historical data.
          </Text>
        </View>

        {isDrawerOpen && (
          <CustomDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        )}
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e293b',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
  },
});
