import { useAssets } from 'expo-asset';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useWindowDimensions, Alert, ActivityIndicator, View, StyleSheet, Text, Platform, AppState, AppStateStatus } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';
import { port } from '@/constants/https';
import io from 'socket.io-client';
import * as Localization from 'expo-localization';
import 'moment/locale/id';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign } from '@expo/vector-icons';

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
    const socketRef = useRef<any>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [otherUsers, setOtherUsers] = useState<any[]>([]);
    // Add loading states
    const [isAssetsLoading, setIsAssetsLoading] = useState(true);
    const [isSensorDataLoaded, setIsSensorDataLoaded] = useState(false);
    const [isLocationDataLoaded, setIsLocationDataLoaded] = useState(false);
    const [webViewLoadProgress, setWebViewLoadProgress] = useState(0);

    // Tambahkan referensi untuk mentrack subscription lokasi
    const locationWatchId = useRef<Location.LocationSubscription | null>(null);

    // Function to get the current location
    const getCurrentLocation = async () => {
        try {
            setIsFetchingLocation(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Izin lokasi diperlukan untuk fitur ini');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
            });

            const { latitude, longitude } = location.coords;
            setLocation([latitude, longitude]);

            if (webViewRef.current) {
                await webViewRef.current.injectJavaScript(`
                    if (window.updateMapLocation) {
                        window.updateMapLocation(${latitude}, ${longitude});
                        map.setView([${latitude}, ${longitude}], 18, {
                            animate: true,
                            duration: 0.5
                        });
                    }
                    document.documentElement.lang = '${Localization.locale}';
                    true;
                `);
            }

            // Send to parent component if callback exists
            if (onGetCurrentLocation) {
                onGetCurrentLocation(getCurrentLocationFunc);
            }

        } catch (error) {
            console.error('Error getting location:', error);
            throw error;
        } finally {
            setIsFetchingLocation(false);
        }
    };

    useEffect(() => {
        getCurrentLocation(); // Get location on component mount
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
                setIsAssetsLoading(true);
                try {
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
                } catch (error) {
                    console.error('Error initializing map:', error);
                } finally {
                    setIsAssetsLoading(false);
                }
            }
        };
        initialize();
    }, [assets]);

    // Initialize socket separately to ensure it's available
    useEffect(() => {
        console.log('Initializing socket connection');
        const newSocket = io(port);
        socketRef.current = newSocket;

        return () => {
            if (newSocket) {
                console.log('Disconnecting socket');
                newSocket.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        // Only setup socket listeners once the socket is created
        if (socketRef.current) {
            console.log('Setting up socket listeners');

            // Add explicit connection monitoring and debugging
            socketRef.current.on('connect', () => {
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
                    socketRef.current.emit('mqttData', testData);
                }, 5000);
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            // Update listener untuk data MQTT
            socketRef.current.on('mqttData', (data: any) => {
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

            socketRef.current.on('new-location', fetchLocationData);
            socketRef.current.on('update-location', fetchLocationData);
            socketRef.current.on('delete-location', fetchLocationData);
            socketRef.current.on('sensor-data-changed', fetchSensorData);
        }

        return () => {
            if (socketRef.current) {
                console.log('Removing socket listeners');
                socketRef.current.off('connect');
                socketRef.current.off('connect_error');
                socketRef.current.off('mqttData');
                socketRef.current.off('new-location');
                socketRef.current.off('update-location');
                socketRef.current.off('delete-location');
                socketRef.current.off('sensor-data-changed');
            }
        };
    }, [socketRef]);

    // Fetch data sensor
    const fetchSensorData = async () => {
        try {
            setIsSensorDataLoaded(false);
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
                tanggal: item.tanggal
            }));

            webViewRef.current?.injectJavaScript(`
              window.updateSensorData(${JSON.stringify(formattedData)});
              map.invalidateSize();
            `);
            setIsSensorDataLoaded(true);
        } catch (error) {
            console.error('Error fetching sensor data:', error);
        }
    };

    // Fetch data lokasi
    const fetchLocationData = async () => {
        try {
            setIsLocationDataLoaded(false);
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
            setIsLocationDataLoaded(true);
        } catch (error) {
            console.error('Error fetching location data:', error);
        }
    };

    // Handle WebView load complete
    const handleWebViewLoad = () => {
        setIsMapLoaded(true);
        if (onInitialized) {
            onInitialized(zoomToGeoJSON);
        }
    };

    // Add function to handle webview load progress
    const handleLoadProgress = (event: any) => {
        const { progress } = event.nativeEvent;
        setWebViewLoadProgress(progress * 100);
    };

    // Check if everything is fully loaded
    const isFullyLoaded = isMapLoaded && isSensorDataLoaded && isLocationDataLoaded && !isAssetsLoading;

    const messageHandler = (e: WebViewMessageEvent) => {
        try {
            const data = JSON.parse(e.nativeEvent.data);

            // Handle loading status messages from WebView
            if (data.type === 'dataStatus') {
                switch (data.status) {
                    case 'sensorLoaded':
                        setIsSensorDataLoaded(true);
                        break;
                    case 'locationLoaded':
                        setIsLocationDataLoaded(true);
                        break;
                    case 'allDataLoaded':
                        setIsSensorDataLoaded(true);
                        setIsLocationDataLoaded(true);
                        setIsMapLoaded(true);
                        break;
                }
                return;
            }

            // Handle location selection
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

            // Handle map press (existing functionality)
            const coords = data as [number, number];
            onMapPress(coords);
        } catch (error) {
            console.error('Error parsing message from WebView:', error);
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
        zoomToLocation
    }));

    // Start or stop watching location based on app state changes
    const sendCurrentLocationToServer = async (socketToUse = null) => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            const { latitude, longitude, accuracy } = location.coords;
            const socket = socketToUse || socketRef.current;

            console.log('Mengirim lokasi ke server:', { latitude, longitude });

            if (socket && socket.connected) {
                socket.emit('update_location', {
                    latitude,
                    longitude,
                    accuracy,
                    deviceName: 'Device_' + Math.floor(Math.random() * 1000)
                });
                console.log('Lokasi berhasil dikirim ke server!');
            } else {
                console.log('Socket tidak terhubung, tidak bisa mengirim lokasi');
            }
        } catch (error) {
            console.error('Error mengirim lokasi:', error);
        }
    }

    // Fungsi untuk mulai memantau lokasi
    const startLocationWatching = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            locationWatchId.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 5000,
                    distanceInterval: 10
                },
                (location) => {
                    if (socketRef.current && socketRef.current.connected) {
                        const { latitude, longitude, accuracy } = location.coords;
                        console.log('Lokasi berubah, mengirim update:', { latitude, longitude });

                        socketRef.current.emit('update_location', {
                            latitude,
                            longitude,
                            accuracy,
                            deviceName: 'Device_' + Math.floor(Math.random() * 1000)
                        });
                    } else {
                        console.log('Socket tidak tersedia untuk update lokasi otomatis');
                    }
                }
            );
        } catch (error) {
            console.error('Error watching location:', error);
        }
    };

    // Fungsi untuk berhenti memantau lokasi
    const stopLocationWatching = () => {
        if (locationWatchId.current) {
            locationWatchId.current.remove();
            locationWatchId.current = null;
        }
    };

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('App kembali ke foreground, mencoba kirim lokasi');
                // Pastikan socket terhubung kembali jika terputus
                if (socketRef.current && !socketRef.current.connected) {
                    console.log('Socket terputus, mencoba menghubungkan kembali');
                    socketRef.current.connect();
                } else if (socketRef.current && socketRef.current.connected) {
                    console.log('Socket masih terhubung, mengirim lokasi');
                    sendCurrentLocationToServer(socketRef.current);
                }
            }
        };

        // Subscribe ke app state changes
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Cleanup
        return () => {
            subscription.remove();
        };
    }, []);

    // Tambahkan style sheet
    const styles = StyleSheet.create({
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f3f5'
        },
        loadingOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999
        },
        loadingCard: {
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            width: '80%',
            maxWidth: 320,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5
        },
        loadingTitle: {
            fontSize: 18,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 20,
            color: '#1e293b'
        },
        loadingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 8,
            width: '100%'
        },
        loadingText: {
            marginLeft: 12,
            fontSize: 15,
            color: '#64748b',
            flex: 1
        },
        loadedText: {
            color: '#0f172a',
            fontWeight: '500'
        },
        percentage: {
            fontSize: 14,
            fontWeight: '600',
            color: '#3b82f6'
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
        <View style={{ flex: 1 }}>
            {htmlString && (
                <WebView
                    ref={webViewRef}
                    source={{ html: htmlString, baseUrl: '' }}
                    style={{ flex: 1, width: dimensions.width }}
                    originWhitelist={['*']}
                    onMessage={messageHandler}
                    onLoad={handleWebViewLoad}
                    onLoadProgress={handleLoadProgress}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    geolocationEnabled={true}
                    allowFileAccess={true}
                    mixedContentMode={'always'}
                />
            )}

            {/* Loading overlay */}
            {!isFullyLoaded && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#ea5757" />
                        <Text style={styles.loadingTitle}>Memuat Data</Text>

                        <View style={styles.loadingRow}>
                            <AntDesign name={isMapLoaded ? "checkcircle" : "loading1"} size={18} color={isMapLoaded ? "#4ade80" : "#94a3b8"} />
                            <Text style={[styles.loadingText, isMapLoaded && styles.loadedText]}>Map Interface</Text>
                            {!isMapLoaded && <Text style={styles.percentage}>{webViewLoadProgress.toFixed(0)}%</Text>}
                        </View>

                        <View style={styles.loadingRow}>
                            <AntDesign name={isSensorDataLoaded ? "checkcircle" : "loading1"} size={18} color={isSensorDataLoaded ? "#4ade80" : "#94a3b8"} />
                            <Text style={[styles.loadingText, isSensorDataLoaded && styles.loadedText]}>Data Sensor</Text>
                        </View>

                        <View style={styles.loadingRow}>
                            <AntDesign name={isLocationDataLoaded ? "checkcircle" : "loading1"} size={18} color={isLocationDataLoaded ? "#4ade80" : "#94a3b8"} />
                            <Text style={[styles.loadingText, isLocationDataLoaded && styles.loadedText]}>Data Lokasi</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
});

export default Map;
