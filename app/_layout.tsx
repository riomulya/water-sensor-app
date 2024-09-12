// app/_layout.tsx
import { Stack } from "expo-router";
import "../global.css";
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import React from "react";
import CustomAppBar from "@/components/CustomAppBar";

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <Stack>
        {/* // ? Render Tabs langsung di layar utama*/}
        <Stack.Screen name="index" options={{ header: () => <CustomAppBar /> }} />
      </Stack>
    </GluestackUIProvider>
  );
}
