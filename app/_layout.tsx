import { Stack } from "expo-router";
import "../global.css";
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import React, { useEffect, useState } from "react";
import CustomAppBar from "@/components/CustomAppBar";

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <Stack >
        <Stack.Screen name="screens" options={{ header: CustomAppBar }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </GluestackUIProvider>
  );
}
