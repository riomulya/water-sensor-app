import { useAssets } from 'expo-asset';
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useWindowDimensions, Alert } from 'react-native';
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

    // Function to get the current location
    const getCurrentLocation = async () => {
        try {
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
                        Lokasi Terakhir: ${new Date().toLocaleString()}<br>
                        Accel X: ${formattedData.nilai_accel_x}<br>
                        Accel Y: ${formattedData.nilai_accel_y}<br>
                        Accel Z: ${formattedData.nilai_accel_z}<br>
                        pH: ${formattedData.nilai_ph}<br>
                        Suhu: ${formattedData.nilai_temperature}°C<br>
                        Kekeruhan: ${formattedData.nilai_turbidity} NTU
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

        if (data.type === 'clearNavigation') {
            // Handle clear navigation
            webViewRef.current?.injectJavaScript(`
                if (window.clearNavigationRoute) {
                    clearNavigationRoute();
                }
            `);
        } else if (data.type === 'selectLocation') {
            // Handle location selection from map marker
            const locationData = data.data;
            if (locationData) {
                // Kirim data lokasi yang dipilih ke React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationSelected',
                    data: locationData
                }));
            }
        } else if (data.type === 'locationSelected' && onLocationSelect) {
            onLocationSelect(data.data);
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

    if (!htmlString) {
        return <></>;
    }

    return (
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
    );
});

export default Map;
