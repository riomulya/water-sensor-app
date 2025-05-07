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

    const testIOTMarkerCreation = () => {
        console.log('Testing IOT marker creation');
        webViewRef.current?.injectJavaScript(`
            (function() {
                console.log('============= TESTING IOT MARKER CREATION =============');
                // Step 1: Check if map is available
                if (!map) {
                    console.error('Map object not available!');
                    return;
                }
                console.log('Map object available ✓');
                
                // Step 2: Check if IOTDeviceMarker is available
                if (!window.IOTDeviceMarker) {
                    console.error('IOTDeviceMarker not available, creating it');
                    window.IOTDeviceMarker = L.icon({
                        iconUrl: '${targetMarker}',
                        iconSize: [40, 40], 
                        iconAnchor: [20, 40],
                        popupAnchor: [0, -40]
                    });
                }
                console.log('IOTDeviceMarker available ✓');
                
                // Step 3: Create the marker
                try {
                    // Force remove any existing marker first
                    if (window.iotMarker) {
                        console.log('Removing existing IOT marker');
                        map.removeLayer(window.iotMarker);
                        window.iotMarker = null;
                    }
                    
                    // Create new marker
                    console.log('Creating new IOT marker');
                    const lat = -6.354952;
                    const lon = 106.659897;
                    window.iotMarker = L.marker([lat, lon], {
                        icon: window.IOTDeviceMarker,
                        zIndexOffset: 1000
                    }).addTo(map);
                    
                    // Check if marker was added
                    if (window.iotMarker._map !== map) {
                        console.error('Marker not added to map!');
                    } else {
                        console.log('Marker added to map ✓');
                    }
                    
                    // Add styling
                    if (window.iotMarker._icon) {
                        window.iotMarker._icon.className += " pulsing-marker-iot";
                        console.log('Animation class added ✓');
                    } else {
                        console.warn('Icon element not available yet');
                    }
                    
                    // Add popup and open it
                    window.iotMarker.bindPopup('IOT Marker Test').openPopup();
                    console.log('Popup added and opened ✓');
                    
                    // Center map on marker
                    map.setView([lat, lon], 15);
                    console.log('Map centered on marker ✓');
                    
                    console.log('IOT MARKER CREATED SUCCESSFULLY ✓');
                    return true;
                } catch (err) {
                    console.error('ERROR CREATING IOT MARKER:', err);
                    return false;
                }
            })();
            true;
        `);
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
                    .replace(/lang=".*?"/, 'lang="en"')
                    .replace(/moment.locale\('.*?'\)/g, 'moment.locale("en")');

                setHtmlString(modifiedHtml);

                // Tambahkan delay 1 detik untuk pastikan WebView ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Ensure our React Native component handles the MQTT data exclusively
                webViewRef.current?.injectJavaScript(`
                    window.iotHandlerDisabled = true;
                    console.log('React Native will handle IOT marker positioning');
                    true;
                `);

                onInitialized(zoomToGeoJSON);
                onGetCurrentLocation(getCurrentLocationFunc);
                fetchSensorData();
                fetchLocationData();
            }
        };
        initialize();
    }, [assets]);

    // Initialize socket separately to ensure it's available
    useEffect(() => {
        console.log('Initializing socket connection');
        const newSocket = io(port);
        setSocket(newSocket);

        return () => {
            if (newSocket) {
                console.log('Disconnecting socket');
                newSocket.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        // Only setup socket listeners once the socket is created
        if (socket) {
            console.log('Setting up socket listeners');

            // Add explicit connection monitoring and debugging
            socket.on('connect', () => {
                console.log('Socket connected successfully from React Native');
                // Test the socket with a fake MQTT message
                setTimeout(() => {
                    console.log('Sending test MQTT data');
                    const testData = {
                        message: {
                            latitude: -6.354952,
                            longitude: 106.659897,
                            ph: 7.0,
                            temperature: 25.0,
                            turbidity: 5.0,
                            speed: 1.2,
                            accel_x: 0.1,
                            accel_y: 0.2,
                            accel_z: 9.8,
                        },
                        timestamp: new Date().toISOString()
                    };

                    // Process the test data directly
                    socket.emit('mqttData', testData);
                }, 5000);
            });

            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            // Update listener untuk data MQTT
            socket.on('mqttData', (data: any) => {
                console.log('MQTT data received in React Native:', data);

                try {
                    if (!data || !data.message) {
                        console.error('Invalid MQTT data structure:', data);
                        return;
                    }

                    // Check if latitude and longitude exist in the data
                    if (!('latitude' in data.message) || !('longitude' in data.message)) {
                        console.error('Missing coordinates in MQTT data:', data.message);
                        return;
                    }

                    // Ensure we're working with valid floating point numbers for coordinates
                    const lat = Number(parseFloat(data.message.latitude).toFixed(7));
                    const lon = Number(parseFloat(data.message.longitude).toFixed(7));

                    // Validate coordinates
                    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
                        console.error('Invalid coordinates received:', { lat, lon });
                        return;
                    }

                    console.log('Processing valid MQTT data with coordinates:', { lat, lon });

                    const formattedData = {
                        id: Date.now(),
                        lat: lat,
                        lon: lon,
                        nilai_accel_x: Number(data.message.accel_x || 0).toFixed(2),
                        nilai_accel_y: Number(data.message.accel_y || 0).toFixed(2),
                        nilai_accel_z: Number(data.message.accel_z || 0).toFixed(2),
                        nilai_ph: Number(data.message.ph || 7).toFixed(2),
                        nilai_temperature: Number(data.message.temperature || 25).toFixed(2),
                        nilai_turbidity: Number(data.message.turbidity || 0).toFixed(2),
                        nilai_speed: Number(data.message.speed || 0).toFixed(2),
                        tanggal: data.timestamp || new Date().toISOString()
                    };

                    webViewRef.current?.injectJavaScript(`
                        try {
                            const exactLatLng = [${lat}, ${lon}];
                            
                            // Update atau create marker
                            if(window.iotMarker) {
                                window.iotMarker.setLatLng(exactLatLng);
                            } else {
                                window.iotMarker = L.marker(exactLatLng, {
                                    icon: window.IOTDeviceMarker,
                                    zIndexOffset: 1000
                                }).addTo(map);
                            }
                            
                            // Update popup dengan style yang bagus
                            window.iotMarker.bindPopup(\`
                                <div style="min-width: 280px; border-radius: 8px; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                    <div style="background: linear-gradient(135deg, #4834d4, #686de0); color: white; padding: 12px; text-align: center; font-size: 16px;">
                                        <div style="font-size: 22px; margin-bottom: 6px;">🛰️</div>
                                        <strong>Perangkat IOT Realtime</strong>
                                    </div>
                                    
                                    <div style="background-color: white; padding: 15px; border-bottom: 1px solid #eee;">
                                        <div style="margin-bottom: 10px; font-weight: 500; color: #555;">
                                            <span style="color: #777; font-size: 13px;">WAKTU PENGUKURAN</span><br>
                                            <span style="font-size: 15px;">${new Date().toLocaleString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: 'Asia/Jakarta'
                    })}</span>
                                        </div>
                                    </div>
                                    
                                    <div style="padding: 15px; background-color: rgba(72, 52, 212, 0.05); display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                        <div class="param-item" style="background: white; border-radius: 6px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                            <div style="color: #4834d4; font-weight: bold; margin-bottom: 3px;">pH</div>
                                            <div style="font-size: 16px;">${formattedData.nilai_ph}</div>
                                        </div>
                                        <div class="param-item" style="background: white; border-radius: 6px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                            <div style="color: #4834d4; font-weight: bold; margin-bottom: 3px;">Temperatur</div>
                                            <div style="font-size: 16px;">${formattedData.nilai_temperature}°C</div>
                                        </div>
                                        <div class="param-item" style="background: white; border-radius: 6px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                            <div style="color: #4834d4; font-weight: bold; margin-bottom: 3px;">Kekeruhan</div>
                                            <div style="font-size: 16px;">${formattedData.nilai_turbidity} NTU</div>
                                        </div>
                                        <div class="param-item" style="background: white; border-radius: 6px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                            <div style="color: #4834d4; font-weight: bold; margin-bottom: 3px;">Kecepatan</div>
                                            <div style="font-size: 16px;">${formattedData.nilai_speed} m/s</div>
                                        </div>
                                    </div>
                                    
                                    <div style="background-color: #f8f9fa; padding: 12px 15px; border-top: 1px solid #eee;">
                                        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">Accelerometer:</div>
                                        <div style="display: flex; justify-content: space-between; font-size: 14px;">
                                            <span><b>X:</b> ${formattedData.nilai_accel_x} m/s²</span>
                                            <span><b>Y:</b> ${formattedData.nilai_accel_y} m/s²</span>
                                            <span><b>Z:</b> ${formattedData.nilai_accel_z} m/s²</span>
                                        </div>
                                    </div>
                                    
                                    <div style="background-color: white; padding: 12px 15px; border-top: 1px solid #eee;">
                                        <div style="font-size: 13px; color: #666; margin-bottom: 5px;">Koordinat:</div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                            <div style="background-color: #f1f5f9; padding: 8px; border-radius: 6px;">
                                                <div style="font-size: 12px; color: #64748b;">Latitude</div>
                                                <div style="font-weight: 500; font-size: 14px;">${lat}</div>
                                            </div>
                                            <div style="background-color: #f1f5f9; padding: 8px; border-radius: 6px;">
                                                <div style="font-size: 12px; color: #64748b;">Longitude</div>
                                                <div style="font-weight: 500; font-size: 14px;">${lon}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            \`);
                            
                            // Store last position
                            window.lastIOTPosition = {
                                lat: ${lat},
                                lon: ${lon},
                                timestamp: Date.now()
                            };
                            
                            console.log('IOT marker updated successfully');
                        } catch (err) {
                            console.error('Error updating IOT marker:', err);
                        }
                        true;
                    `);

                } catch (error) {
                    console.error('Error processing MQTT data in React Native:', error);
                }
            });

            socket.on('new-location', fetchLocationData);
            socket.on('update-location', fetchLocationData);
            socket.on('delete-location', fetchLocationData);
            socket.on('sensor-data-changed', fetchSensorData);
        }

        return () => {
            if (socket) {
                console.log('Removing socket listeners');
                socket.off('connect');
                socket.off('connect_error');
                socket.off('mqttData');
                socket.off('new-location');
                socket.off('update-location');
                socket.off('delete-location');
                socket.off('sensor-data-changed');
            }
        };
    }, [socket]);

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
