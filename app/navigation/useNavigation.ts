import { useState } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface NavigationDestination {
    latitude: number;
    longitude: number;
    name: string;
    address?: string;
}

export function useNavigation() {
    const [isNavigating, setIsNavigating] = useState(false);
    const [isNavigationMinimized, setIsNavigationMinimized] = useState(false);
    const [destination, setDestination] = useState<NavigationDestination | null>(null);

    // Start navigation to a destination
    const navigateTo = (dest: NavigationDestination) => {
        // Validate coordinates first
        const latitude = typeof dest.latitude === 'string' ? parseFloat(dest.latitude) : dest.latitude;
        const longitude = typeof dest.longitude === 'string' ? parseFloat(dest.longitude) : dest.longitude;

        if (isNaN(latitude) || isNaN(longitude)) {
            console.error('Invalid coordinates in navigateTo:', dest);
            Alert.alert(
                'Error Navigasi',
                'Koordinat tujuan tidak valid. Navigasi tidak dapat dimulai.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Create validated destination object
        const validatedDest: NavigationDestination = {
            latitude,
            longitude,
            name: dest.name || 'Lokasi',
            address: dest.address || ''
        };

        setDestination(validatedDest);
        setIsNavigating(true);
        setIsNavigationMinimized(false);
    };

    // Exit navigation mode completely
    const exitNavigation = () => {
        setDestination(null);
        setIsNavigating(false);
        setIsNavigationMinimized(false);
    };

    // Minimize navigation (return to main map while keeping navigation active)
    const minimizeNavigation = () => {
        setIsNavigationMinimized(true);
    };

    // Restore navigation from minimized state
    const restoreNavigation = () => {
        setIsNavigationMinimized(false);
    };

    // Handle navigation message from WebView
    const handleNavigationMessage = async (message: { type: string; data: any }) => {
        if (message.type === 'navigateToLocation') {
            try {
                const { latitude, longitude, nama_lokasi, alamat } = message.data;

                // Validate coordinates
                const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
                const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

                if (isNaN(lat) || isNaN(lng)) {
                    console.error('Invalid coordinates in navigateToLocation:', message.data);
                    Alert.alert(
                        'Error Navigasi',
                        'Koordinat tujuan tidak valid. Navigasi tidak dapat dimulai.',
                        [{ text: 'OK' }]
                    );
                    return false;
                }

                console.log('Starting navigation to coordinates:', { lat, lng });

                // Get current location
                try {
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.BestForNavigation,
                    });

                    if (!location || !location.coords) {
                        throw new Error('Could not get current location');
                    }

                    // Start navigation to the selected location
                    navigateTo({
                        latitude: lat,
                        longitude: lng,
                        name: nama_lokasi || 'Tujuan',
                        address: alamat || '',
                    });

                    return true;
                } catch (error) {
                    console.error('Error getting current location for navigation:', error);
                    Alert.alert(
                        'Error Lokasi',
                        'Tidak dapat mengakses lokasi saat ini. Pastikan GPS aktif dan izin lokasi diberikan.',
                        [{ text: 'OK' }]
                    );
                    return false;
                }
            } catch (error) {
                console.error('Error processing navigation message:', error);
                return false;
            }
        }

        return false;
    };

    return {
        isNavigating,
        isNavigationMinimized,
        destination,
        navigateTo,
        exitNavigation,
        minimizeNavigation,
        restoreNavigation,
        handleNavigationMessage,
    };
} 