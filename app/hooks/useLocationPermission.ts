import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export function useLocationPermission() {
    const [hasLocationPermission, setHasLocationPermission] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function requestLocationPermission() {
            try {
                setIsLoading(true);
                const { status } = await Location.requestForegroundPermissionsAsync();
                const permissionGranted = status === 'granted';

                setHasLocationPermission(permissionGranted);

                if (!permissionGranted) {
                    Alert.alert(
                        'Izin Lokasi Diperlukan',
                        'Aplikasi membutuhkan akses lokasi untuk navigasi',
                        [{ text: 'OK' }]
                    );
                }
            } catch (error) {
                console.error('Error requesting location permission:', error);
                setHasLocationPermission(false);
            } finally {
                setIsLoading(false);
            }
        }

        requestLocationPermission();
    }, []);

    return { hasLocationPermission, isLoading };
} 