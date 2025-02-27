import { useAssets } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, Alert } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';
import { port } from '@/constants/https';
import io from 'socket.io-client';

const markerBaseLocation = Asset.fromModule(require('../../assets/images/markerBaseLocation.png')).uri;
const markerSelected = Asset.fromModule(require('../../assets/images/waterSelected.png')).uri;
const markerWaterWays = Asset.fromModule(require('../../assets/images/waterways.png')).uri;
const waterMarkerLocation = Asset.fromModule(require('../../assets/images/waterMarkerLocation.png')).uri;

type Props = {
    onInitialized: (zoomToGeoJSONFunc: () => void) => void;
    onMapPress: (coordinates: [number, number]) => void;
    onGetCurrentLocation: (getCurrentLocationFunc: () => void) => void;
};

const Map = (props: Props) => {
    const { onInitialized, onMapPress, onGetCurrentLocation } = props;

    const [assets] = useAssets([require('../../assets/index.html')]);
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
                        map.setView([${latitude}, ${longitude}], map.getZoom(), {
                            animate: true,
                            duration: 0.5
                        });
                    }
                    true; // Penting untuk return value
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
                    .replace('__MARKER_BASE__', markerBaseLocation)
                    .replace('__MARKER_SELECTED__', markerSelected)
                    .replace('__MARKER_WATER_WAYS__', markerWaterWays)
                    .replace('__MARKER_WATER_LOCATION__', waterMarkerLocation)
                    .replace('__API_PORT__', port);

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

        if (data.type === 'navigationData') {
            // Handle navigation instructions
            console.log('Navigation Data:', data.data);
            Alert.alert(
                'Navigasi Dimulai',
                `Jarak: ${(data.data.totalDistance / 1000).toFixed(1)} km\n` +
                `Perkiraan Waktu: ${Math.round(data.data.totalTime / 60)} menit`
            );
        } else if (data.type === 'clearNavigation') {
            // Handle clear navigation
            webViewRef.current?.injectJavaScript(`
                if (window.clearNavigationRoute) {
                    clearNavigationRoute();
                }
            `);
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
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Received sensor data:', data);

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
            setLocationData(data);
            console.log({ data })
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  window.updateLocationData(${JSON.stringify(data)});
                  map.invalidateSize();
                `);
            }
        } catch (error) {
            console.error('Error fetching location data:', error);
        }
    };

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
        />
    );
};

export default Map;
