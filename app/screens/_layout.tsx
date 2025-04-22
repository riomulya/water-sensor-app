import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './Home';
import AnalysisScreen from './Analysis';
import FeedsScreen from './Feeds';
import FaqScreen from './Faq';
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
                <BottomTab.Navigator id={undefined} tabBar={TabBar}>
                    <BottomTab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                    <BottomTab.Screen name="Feeds" component={FeedsScreen} options={{ headerShown: false }} />
                    <BottomTab.Screen name="Analysis" component={AnalysisScreen} options={{ headerShown: false }} />
                    <BottomTab.Screen name="Faq" component={FaqScreen} options={{ headerShown: false }} />
                </BottomTab.Navigator>
                <Stack.Screen
                    name="Login"
                    options={{ headerShown: false }}
                />
            </Stack>
        </GestureHandlerRootView >
    )
}

export default ScreensLayout