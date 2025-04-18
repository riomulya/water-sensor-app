import { useAssets } from 'expo-asset';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useWindowDimensions, Alert, ActivityIndicator, View, StyleSheet, Text } from 'react-native';
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
    const [socket, setSocket] = useState<any>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

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
                        window.iotMarker.setLatLng([${formattedData.lat}, ${formattedData.lon}]);
                    } else {
                        window.iotMarker = L.marker([${formattedData.lat}, ${formattedData.lon}], {
                            icon: IOTDeviceMarker,
                            zIndexOffset: 1000
                        }).addTo(map);
                    }
                    
                    // Update popup
                    window.iotMarker.bindPopup(\`
                        <b>Status Perangkat IOT</b><br>
                        <b>Lat</b>: ${formattedData.lat}<br>
                        <b>Lon</b>: ${formattedData.lon}<br>
                        <b>Waktu</b>: ${new Date().toLocaleString()}<br>
                        <b>Accel X</b> : ${formattedData.nilai_accel_x} m/s<sup>2</sup><br>
                        <b>Accel Y</b> : ${formattedData.nilai_accel_y} m/s<sup>2</sup><br>
                        <b>Accel Z</b> : ${formattedData.nilai_accel_z} m/s<sup>2</sup><br>
                        <b>pH</b> : ${formattedData.nilai_ph}<br>
                        <b>Suhu</b> : ${formattedData.nilai_temperature}°C<br>
                        <b>Kekeruhan</b> : ${formattedData.nilai_turbidity} NTU<br>
                        <b>Kecepatan</b> : ${formattedData.nilai_speed} m/s
                    \`);
                    
                    // Auto-pan ke marker
                    map.panTo([${formattedData.lat}, ${formattedData.lon}]);
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
        const data = JSON.parse(e.nativeEvent.data);

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
        } else {
            // Existing map press handler
            const coords = data as [number, number];
            onMapPress(coords);
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
        zoomToLocation
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
