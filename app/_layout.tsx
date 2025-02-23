import { Stack } from "expo-router";
import "../global.css";
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import React, { useEffect, useState } from "react";
import CustomAppBar from "@/components/CustomAppBar";
import { StatusBar } from "react-native";

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <StatusBar backgroundColor="pink" />
      <Stack >
        <Stack.Screen name="screens" options={{ header: CustomAppBar,headerShown:false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </GluestackUIProvider>
  );
}
