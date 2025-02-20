import { useAssets } from 'expo-asset';
import React, { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, Alert } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';

const markerBaseLocation = Asset.fromModule(require('../../assets/images/markerBaseLocation.png')).uri;
const markerSelected = Asset.fromModule(require('../../assets/images/waterSelected.png')).uri;
const markerWaterWays = Asset.fromModule(require('../../assets/images/waterways.png')).uri;


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


    // Function to get the current location
    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required.');
                return;
            }

            const userLocation = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = userLocation.coords;
            setLocation([latitude, longitude]);
            // Send the location to WebView to center the map
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
          if (window.updateMapLocation) {
            window.updateMapLocation(${latitude}, ${longitude});
          }
        `);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not get location');
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
        if (assets) {
            fetch(assets[0].localUri || '')
                .then((res) => res.text())
                .then((html) => {
                    // Kirim path gambar ke HTML
                    const modifiedHtml = html
                        .replace('__MARKER_BASE__', markerBaseLocation)
                        .replace('__MARKER_SELECTED__', markerSelected)
                        .replace('__MARKER_WATER_WAYS__', markerWaterWays);

                    setHtmlString(modifiedHtml);
                    onInitialized(zoomToGeoJSON);
                    onGetCurrentLocation(getCurrentLocationFunc);
                });
        }
    }, [assets]);

    const messageHandler = (e: WebViewMessageEvent) => {
        const coords = JSON.parse(e.nativeEvent.data) as [number, number];
        onMapPress(coords);
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
