import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationLayer, useNavigation } from '../navigation';

export default function MapScreen() {
    const webViewRef = useRef<WebView>(null);
    const {
        isNavigating,
        isNavigationMinimized,
        destination,
        navigateTo,
        exitNavigation,
        minimizeNavigation,
        handleNavigationMessage
    } = useNavigation();

    // Handle messages from the WebView
    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            // Log received data for debugging
            console.log('Received message from WebView:', data.type);

            // Handle navigation messages
            if (data.type === 'navigateToLocation') {
                console.log('Navigation data received:', data.data);

                // Validate coordinates before processing
                const latitude = parseFloat(data.data?.latitude);
                const longitude = parseFloat(data.data?.longitude);

                if (isNaN(latitude) || isNaN(longitude)) {
                    console.error('Invalid coordinates in navigation data:', data.data);
                    return;
                }

                // Prepare valid data with parsed numeric coordinates
                const validData = {
                    type: data.type,
                    data: {
                        ...data.data,
                        latitude: latitude,
                        longitude: longitude
                    }
                };

                // Handle the navigation with validated data
                handleNavigationMessage(validData);
            }
            // Handle other WebView message types here
        } catch (error) {
            console.error('Error parsing message from WebView:', error);
        }
    };

    // Get the correct asset URI based on platform
    const getMapAssetUri = () => {
        if (Platform.OS === 'android') {
            return { uri: 'file:///android_asset/index.html' };
        } else {
            return require('../../assets/index.html');
        }
    };

    return (
        <SafeAreaView edges={['right', 'left', 'bottom']} style={styles.container}>
            <StatusBar style="auto" />

            {/* Main Map WebView */}
            <WebView
                ref={webViewRef}
                source={getMapAssetUri()}
                style={styles.webview}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={handleMessage}
                geolocationEnabled={true}
            />

            {/* Navigation layer shown when navigating */}
            {isNavigating && !isNavigationMinimized && destination && (
                <NavigationLayer
                    destination={destination}
                    onClose={exitNavigation}
                    onReturn={minimizeNavigation}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    webview: {
        flex: 1,
    },
}); 