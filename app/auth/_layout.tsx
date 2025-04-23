import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Stack } from "expo-router";

import TabBar from '@/components/navigation/TabBar';

type RootStackParamList = {
    Home: undefined;
    Analysis: undefined;
    Feeds: undefined;
    Faq: undefined;
};

const BottomTab = createBottomTabNavigator<RootStackParamList>();

function ScreensLayout() {
    return (
        <GestureHandlerRootView>
            <Stack
                screenOptions={{
                    headerShown: false // Nonaktifkan header global
                }}
            >
                <Stack.Screen
                    name="Login"
                    options={{ headerShown: false }}
                />
            </Stack>
        </GestureHandlerRootView >
    )
}

export default ScreensLayout