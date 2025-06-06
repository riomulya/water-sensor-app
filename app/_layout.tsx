import { Stack } from "expo-router";
import "../global.css";
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import React, { useEffect, useState } from "react";
import CustomAppBar from "@/components/CustomAppBar";
import { StatusBar } from "react-native";
import DetailScreen from './detail/DetailLocationScreen';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider } from '@/context/AuthContext';

// import { createNativeStackNavigator } from '@react-navigation/native-stack';

// const Stack = createNativeStackNavigator();



export default function RootLayout() {

  return (
    <AuthProvider>
      <GluestackUIProvider mode="light">
        <PaperProvider theme={MD3LightTheme}>
          <StatusBar backgroundColor="pink" />
          <Stack
            screenOptions={{
              headerShown: false // Nonaktifkan header global
            }}
          >
            <Stack.Screen
              name="index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="auth/Login"
              options={{
                headerShown: false,
                // Prevent going back to login screen once logged in
                gestureEnabled: false
              }}
            />
            <Stack.Screen
              name="admin/users"
              options={{
                headerShown: true,
                title: "User Management"
              }}
            />
            {/* <Stack.Screen
            name="screens/Home"
            options={{ headerShown: false }}
          /> */}
            {/* <Stack.Screen
            name="screens/Analysis"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DetailLocationScreen"
            options={{
              title: 'Detail Lokasi',
              presentation: 'modal', // Opsional untuk tampilan modal
              headerShown: false
            }}
          />
          <Stack.Screen
            name="detail"
            options={{ title: 'Detail Lokasi', headerShown: true }}
          /> */}
          </Stack>
        </PaperProvider >
      </GluestackUIProvider>
    </AuthProvider>
  );
}
