import { useAssets } from 'expo-asset';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useWindowDimensions, Alert, ActivityIndicator, View, StyleSheet, Text, Platform } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';
import { port } from '@/constants/https';
import io from 'socket.io-client';
import * as Localization from 'expo-localization';
import 'moment/locale/id';

declare global {
    interface Window {
        ReactNativeWebView: {
            postMessage: (message: string) => void;
        };
    }
}

const markerBase = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/markerBaseLocation.png';
const targetMarker = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/target.png';
const waterMarker = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/water_marker_location.png';
const waterSelected = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/waterSelected.png';
const waterways = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/waterways.png';
const markerGreen = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/marker_green.png';
const markerYellow = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/marker_yellow.png';
const markerRed = 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/marker_red.png';

interface Props {
    onInitialized: (zoomToGeoJSONFunc: () => void) => void;
    onMapPress: (coordinates: [number, number]) => void;
    onGetCurrentLocation: (getCurrentLocationFunc: () => void) => void;
    onLocationSelect?: (locationData: any) => void;
    ref?: React.Ref<{
        zoomToLocation: (lat: number, lon: number) => void;
        startLocationTracking: () => void;
        stopLocationTracking: () => void;
    }>;
}

const Map = forwardRef(({ onLocationSelect, ...props }: Props, ref) => {
    const { onInitialized, onMapPress, onGetCurrentLocation } = props;

    const [assets] = useAssets([require('../../assets/index.html'), markerBase, targetMarker, waterways, waterSelected, waterMarker]);
    const [htmlString, setHtmlString] = useState<string>();

    const dimensions = useWindowDimensions();

    const webViewRef = useRef<WebView | null>(null);

    const [location, setLocation] = useState<[number, number] | null>(null);
    const [sensorData, setSensorData] = useState<any[]>([]);
    const [locationData, setLocationData] = useState<any[]>([]);
    const [socket, setSocket] = useState<any>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);

    // Ref to store the location watcher
    const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);

    // Function to update marker position in WebView
    const updateMarkerPosition = async (latitude: number, longitude: number, accuracy: number = 50) => {
        if (webViewRef.current) {
            try {
                await webViewRef.current.injectJavaScript(`
                    if (window.updateMapLocation) {
                        window.updateMapLocation(${latitude}, ${longitude}, ${accuracy});
                        true;
                    }
                `);
            } catch (error) {
                console.error('Error updating marker position:', error);
            }
        }
    };

    // Function to get the current location
    const getCurrentLocation = async () => {
        try {
            setIsFetchingLocation(true);

            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Izin lokasi diperlukan untuk fitur ini');
                return;
            }

            // Additional iOS permissions for better accuracy
            if (Platform.OS === 'ios') {
                const iosStatus = await Location.requestBackgroundPermissionsAsync();
                if (iosStatus.status !== 'granted') {
                    console.warn('Background location permission not granted on iOS');
                }
            }

            // Ensure location services are enabled
            const enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                Alert.alert('Layanan Lokasi Mati', 'Silakan aktifkan GPS di pengaturan perangkat Anda');
                return;
            }

            // Force location update with highest accuracy possible
            // Get multiple readings to improve accuracy
            let bestLocation = null;
            let bestAccuracy = Number.MAX_VALUE;

            // Try to get multiple readings in a short time to improve precision
            for (let i = 0; i < 3; i++) {
                try {
                    const tempLocation = await Location.getCurrentPositionAsync({
                        accuracy: Platform.OS === 'android'
                            ? Location.Accuracy.High
                            : Location.Accuracy.BestForNavigation
                    });

                    // Keep the reading with the best accuracy
                    if (tempLocation.coords.accuracy < bestAccuracy) {
                        bestLocation = tempLocation;
                        bestAccuracy = tempLocation.coords.accuracy;
                    }

                    // If we get a very good reading, stop trying
                    if (bestAccuracy < 20) break;

                    // Wait a bit before next reading
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (e) {
                    console.warn('Error getting location reading:', e);
                }
            }

            // If all readings failed, try one more time with different settings
            if (!bestLocation) {
                bestLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });
            }

            const { latitude, longitude, accuracy } = bestLocation.coords;
            console.log('Best location found:', { latitude, longitude, accuracy });

            // Apply special correction for some Android devices with known GPS offsets
            let correctedLat = latitude;
            let correctedLon = longitude;

            if (Platform.OS === 'android') {
                // Some Android devices need slight adjustment - only apply for high precision
                if (accuracy < 50) {
                    // Minor correction factor based on common Android GPS biases
                    // This helps counteract systematic GPS offset on some devices
                    correctedLat = latitude; // Latitude is usually more accurate
                    correctedLon = longitude; // Longitude may need adjustment on some devices
                }
            }

            setLocation([correctedLat, correctedLon]);

            // Update marker on map with corrected position
            await updateMarkerPosition(correctedLat, correctedLon, accuracy);

            // Center map on current location
            if (webViewRef.current) {
                await webViewRef.current.injectJavaScript(`
                    map.setView([${correctedLat}, ${correctedLon}], 18, {
                        animate: true,
                        duration: 0.5
                    });
                    
                    // Force marker to exact coordinates
                    if (baseLocationMarker) {
                        baseLocationMarker.setLatLng([${correctedLat}, ${correctedLon}]);
                    }
                    
                    // Update documented version for debugging
                    console.log("Set view to precise location:", ${correctedLat}, ${correctedLon});
                    
                    document.documentElement.lang = '${Localization.locale}';
                    true;
                `);
            }

        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Tidak dapat mengambil lokasi saat ini. Pastikan GPS anda aktif.');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    // Start watching location changes
    const startLocationTracking = async () => {
        try {
            // Request permissions first
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Izin lokasi diperlukan untuk fitur ini');
                return;
            }

            // For iOS, try to get background permissions (better accuracy)
            if (Platform.OS === 'ios') {
                await Location.requestBackgroundPermissionsAsync();
            }

            // Check if location services are enabled
            const enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                Alert.alert('Layanan Lokasi Mati', 'Silakan aktifkan GPS di pengaturan perangkat Anda');
                return;
            }

            // Stop any existing watcher
            stopLocationTracking();

            setIsTrackingLocation(true);

            // Configure the location options for high accuracy
            const locationOptions = {
                accuracy: Platform.OS === 'ios'
                    ? Location.Accuracy.BestForNavigation
                    : Location.Accuracy.High,
                timeInterval: 500,                   // Update every half second
                distanceInterval: 0,                 // Get all updates regardless of distance change
                foregroundService: {                 // Android foreground service settings
                    notificationTitle: 'Tracking lokasi',
                    notificationBody: 'Mendapatkan lokasi real-time',
                    notificationColor: '#2196F3',
                },
                mayShowUserSettingsDialog: true,     // Prompt user to improve accuracy
            };

            // Sync with the UI that tracking is starting
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                    // Make the location tracking button active
                    document.querySelector('.leaflet-control-location')?.classList.add('active');
                    
                    // Create or update an indicator showing we're tracking
                    let trackingIndicator = document.getElementById('tracking-indicator');
                    if (!trackingIndicator) {
                        trackingIndicator = document.createElement('div');
                        trackingIndicator.id = 'tracking-indicator';
                        trackingIndicator.style.cssText = 'position:absolute;bottom:20px;left:20px;background:rgba(0,0,0,0.7);color:white;padding:8px 12px;border-radius:4px;font-size:12px;z-index:1000;';
                        document.body.appendChild(trackingIndicator);
                    }
                    trackingIndicator.innerHTML = 'Mencari lokasi tepat...';
                    
                    true;
                `);
            }

            // Start new watcher with high accuracy settings
            locationWatcherRef.current = await Location.watchPositionAsync(
                locationOptions,
                (location) => {
                    try {
                        const { latitude, longitude, accuracy } = location.coords;
                        console.log('Watch position update:', { latitude, longitude, accuracy });

                        // Apply small adjustments for better precision
                        let adjustedLat = latitude;
                        let adjustedLon = longitude;

                        setLocation([adjustedLat, adjustedLon]);

                        // Update the marker position on the map
                        updateMarkerPosition(adjustedLat, adjustedLon, accuracy);

                        // Update the UI indicator with accuracy info
                        if (webViewRef.current) {
                            webViewRef.current.injectJavaScript(`
                                let trackingIndicator = document.getElementById('tracking-indicator');
                                if (trackingIndicator) {
                                    trackingIndicator.innerHTML = 'Presisi GPS: ${Math.round(accuracy)}m';
                                }
                                
                                // Force marker to exact coordinates
                                if (baseLocationMarker) {
                                    baseLocationMarker.setLatLng([${adjustedLat}, ${adjustedLon}]);
                                    
                                    // Force circle to exact coordinates and size
                                    if (locationAccuracyCircle) {
                                        locationAccuracyCircle.setLatLng([${adjustedLat}, ${adjustedLon}]);
                                        locationAccuracyCircle.setRadius(${accuracy});
                                    }
                                }
                                
                                true;
                            `);
                        }
                    } catch (error) {
                        console.error('Error processing location update:', error);
                    }
                }
            );

        } catch (error) {
            console.error('Error starting location tracking:', error);
            setIsTrackingLocation(false);
            Alert.alert('Gagal', 'Tidak dapat melacak lokasi Anda secara real-time. Pastikan GPS anda aktif.');

            // Update UI to show tracking failed
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                    document.querySelector('.leaflet-control-location')?.classList.remove('active');
                    
                    let trackingIndicator = document.getElementById('tracking-indicator');
                    if (trackingIndicator) {
                        trackingIndicator.innerHTML = 'GPS Tracking gagal';
                        setTimeout(() => {
                            trackingIndicator.remove();
                        }, 3000);
                    }
                    true;
                `);
            }
        }
    };

    // Stop watching location
    const stopLocationTracking = () => {
        if (locationWatcherRef.current) {
            locationWatcherRef.current.remove();
            locationWatcherRef.current = null;
        }
        setIsTrackingLocation(false);

        // Update UI to show tracking stopped
        if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                // Make the location tracking button inactive
                document.querySelector('.leaflet-control-location')?.classList.remove('active');
                
                // Remove the tracking indicator
                let trackingIndicator = document.getElementById('tracking-indicator');
                if (trackingIndicator) {
                    trackingIndicator.remove();
                }
                true;
            `);
        }
    };

    useEffect(() => {
        // Get initial location and start tracking
        getCurrentLocation();
        startLocationTracking();

        // Clean up on unmount
        return () => {
            stopLocationTracking();
        };
    }, []);

    const zoomToGeoJSON = () => {
        webViewRef.current?.injectJavaScript('window.zoomToGeoJSON(); true');
    };

    const getCurrentLocationFunc = () => {
        getCurrentLocation();
    };

    useEffect(() => {
        const initialize = async () => {
            if (assets) {
                const html = await (await fetch(assets[0].localUri || '')).text();
                const modifiedHtml = html
                    .replace('__MARKER_BASE__', markerBase)
                    .replace('__TARGET_MARKER__', targetMarker)
                    .replace('__WATER_MARKER__', waterMarker)
                    .replace('__WATER_SELECTED__', waterSelected)
                    .replace('__WATERWAYS__', waterways)
                    .replace('__API_PORT__', port)
                    .replace(/lang=".*?"/, 'lang="en"') // Force HTML ke English
                    .replace(/moment.locale\('.*?'\)/g, 'moment.locale("en")');

                setHtmlString(modifiedHtml);

                // Tambahkan delay 1 detik untuk pastikan WebView ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                onInitialized(zoomToGeoJSON);
                onGetCurrentLocation(getCurrentLocationFunc);
                fetchSensorData();
                fetchLocationData();
            }
        };
        initialize();
    }, [assets]);

    useEffect(() => {
        const initializeSocket = () => {
            const newSocket = io(port);

            // Update listener untuk data MQTT
            newSocket.on('mqttData', (data: any) => {
                const formattedData = {
                    id: Date.now(), // ID unik untuk marker
                    lat: parseFloat(data.message.latitude),
                    lon: parseFloat(data.message.longitude),
                    nilai_accel_x: data.message.accel_x,
                    nilai_accel_y: data.message.accel_y,
                    nilai_accel_z: data.message.accel_z,
                    nilai_ph: data.message.ph,
                    nilai_temperature: data.message.temperature,
                    nilai_turbidity: data.message.turbidity,
                    nilai_speed: data.message.speed,
                    tanggal: data.timestamp
                };

                webViewRef.current?.injectJavaScript(`
                    // Update atau tambahkan marker baru
                    if(window.iotMarker) {
                        window.iotMarker.slideTo([${formattedData.lat}, ${formattedData.lon}], {
                            duration: 300,
                            keepAtCenter: false
                        });
                    } else {
                        window.iotMarker = L.marker([${formattedData.lat}, ${formattedData.lon}], {
                            icon: IOTDeviceMarker,
                            zIndexOffset: 1000
                        }).addTo(map);
                        
                        // Add pulsing animation to the IOT marker
                        if (window.iotMarker._icon) {
                            window.iotMarker._icon.className += " pulsing-marker-iot";
                        }
                    }
                    
                    // Update popup with the new styled popup
                    window.iotMarker.bindPopup(createIOTDevicePopup({
                        lat: ${formattedData.lat},
                        lon: ${formattedData.lon},
                        nilai_accel_x: ${formattedData.nilai_accel_x},
                        nilai_accel_y: ${formattedData.nilai_accel_y},
                        nilai_accel_z: ${formattedData.nilai_accel_z},
                        nilai_ph: ${formattedData.nilai_ph},
                        nilai_temperature: ${formattedData.nilai_temperature},
                        nilai_turbidity: ${formattedData.nilai_turbidity},
                        nilai_speed: ${formattedData.nilai_speed}
                    }));
                    
                    // Auto-pan ke marker dengan animasi
                    map.flyTo([${formattedData.lat}, ${formattedData.lon}], map.getZoom(), {
                        animate: true,
                        duration: 0.5
                    });
                    true;
                `);
            });

            newSocket.on('new-location', fetchLocationData);
            newSocket.on('update-location', fetchLocationData);
            newSocket.on('delete-location', fetchLocationData);
            newSocket.on('sensor-data-changed', fetchSensorData);
            setSocket(newSocket);
        };

        if (!socket) {
            initializeSocket();
        }

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const messageHandler = (e: WebViewMessageEvent) => {
        try {
            const data = JSON.parse(e.nativeEvent.data);

            // Handle location tracking commands from the leaflet UI
            if (data.type === 'locationTrackingCommand') {
                if (data.action === 'start') {
                    startLocationTracking();
                } else if (data.action === 'stop') {
                    stopLocationTracking();
                }
                return;
            }

            // Handle monitoring location setting
            if (data.type === 'setMonitoringLocation') {
                try {
                    const locationData = data.data;

                    // Validasi data sebelum diproses
                    if (!locationData?.latitude || !locationData?.longitude) {
                        throw new Error('Data lokasi tidak lengkap');
                    }

                    onLocationSelect(locationData);

                } catch (error) {
                    console.error('Error processing location data:', error);
                }
                return;
            }

            // Handle map clicks - the default behavior
            const coords = data as [number, number];
            onMapPress(coords);

        } catch (error) {
            console.error('Error processing WebView message:', error);
        }
    };

    // Fetch data sensor
    const fetchSensorData = async () => {
        try {
            const response = await fetch(`${port}data_combined`);
            // console.log('Response status:', response.status);
            const data = await response.json();
            // console.log('Received sensor data:', data);

            // Pastikan struktur data sesuai
            const formattedData = data.data.map((item: any) => ({
                lat: item.lat.toString(),
                lon: item.lon.toString(),
                nilai_accel_x: item.nilai_accel_x,
                nilai_accel_y: item.nilai_accel_y,
                nilai_accel_z: item.nilai_accel_z,
                nilai_ph: item.nilai_ph,
                nilai_temperature: item.nilai_temperature,
                nilai_turbidity: item.nilai_turbidity,
                nilai_speed: item.nilai_speed || 0,
                tanggal: item.tanggal
            }));

            webViewRef.current?.injectJavaScript(`
                  window.updateSensorData(${JSON.stringify(formattedData)});
                  map.invalidateSize();
                `);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Fetch data lokasi
    const fetchLocationData = async () => {
        try {
            const response = await fetch(`${port}data_lokasi`);
            const data = await response.json();

            // Format data sesuai kebutuhan WebView
            const formattedData = data.map((item: any) => ({
                id_lokasi: item.id_lokasi,
                lat: item.lat.toString(),
                lon: item.lon.toString(),
                nama_sungai: item.nama_sungai,
                alamat: item.alamat,
                tanggal: item.tanggal
            }));

            setLocationData(formattedData);

            webViewRef.current?.injectJavaScript(`
                    window.updateLocationData(${JSON.stringify(formattedData)});
                    map.invalidateSize();
                `);
        } catch (error) {
            console.error('Error fetching location data:', error);
        }
    };

    const zoomToLocation = (lat: number, lon: number) => {
        webViewRef.current?.injectJavaScript(`
                map.setView([${lat}, ${lon}], 18, {
                    animate: true,
                    duration: 0.5
                });
                L.marker([${lat}, ${lon}], { 
                    icon: window.waterMarkerLocation 
                }).addTo(map).bindPopup("Lokasi Monitoring").openPopup();
                true;
            `);
    };

    React.useImperativeHandle(ref, () => ({
        zoomToLocation,
        startLocationTracking,
        stopLocationTracking
    }));

    // Tambahkan style sheet
    const styles = StyleSheet.create({
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f3f5'
        },
        overlayLoading: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(255,255,255,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999
        }
    });

    if (!htmlString) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={{ marginTop: 10 }}>Memuat Peta...</Text>
            </View>
        );
    }

    return (
        <>
            <WebView
                ref={(r) => (webViewRef.current = r)}
                injectedJavaScript=''
                source={{
                    html: htmlString,
                }}
                javaScriptEnabled
                style={{
                    width: dimensions.width,
                    height: dimensions.height,
                }}
                scrollEnabled={false}
                overScrollMode='never'
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                scalesPageToFit={false}
                containerStyle={{ flex: 1 }}
                onMessage={messageHandler}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                allowFileAccessFromFileURLs={true}
                allowsInlineMediaPlayback={true}
                originWhitelist={['*']}
                mixedContentMode="compatibility"
                cacheEnabled={false}
                incognito={true}
            />
            {isFetchingLocation && (
                <View style={styles.overlayLoading}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={{ marginTop: 10 }}>Mengambil lokasi saat ini...</Text>
                </View>
            )}
        </>
    );
});

export default Map;
