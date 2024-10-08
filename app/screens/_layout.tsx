import Tabs from '@/components/navigation/Tabs'
import { Stack } from 'expo-router'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function ScreensLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Tabs />
        </GestureHandlerRootView>
    )
}

export default ScreensLayout