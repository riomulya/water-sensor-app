import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Dimensions, StatusBar, TouchableOpacity, Linking, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import WebView from 'react-native-webview';
import * as Location from 'expo-location';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatePresence, MotiView } from 'moti';
import { AntDesign, MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Debug utility functions
const DEBUG = {
    log: (message: string, data?: any) => {
        console.log(`[Navigation Debug] ${message}`, data ? data : '');
    },
    error: (message: string, error?: any) => {
        console.error(`[Navigation Error] ${message}`, error ? error : '');
    },
    warn: (message: string, data?: any) => {
        console.warn(`[Navigation Warning] ${message}`, data ? data : '');
    },
    info: (message: string, data?: any) => {
        console.info(`[Navigation Info] ${message}`, data ? data : '');
    }
};

// Define the type for route params
type RouteParams = {
    NavigationScreen: {
        latitude: string;
        longitude: string;
        name: string;
        address: string;
    };
};

const { width, height } = Dimensions.get('window');
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibXVseWFzIiwiYSI6ImNtOXgybmZpdTEyNGgycW13b3M5ZTRjZ2gifQ.T9_kfIpCkiEisItinWrRpw';

// Default to Indonesia coordinates
const DEFAULT_LAT = -6.2088;
const DEFAULT_LNG = 106.8456;

const NavigationScreen = () => {
    const insets = useSafeAreaInsets();
    const route = useRoute<RouteProp<RouteParams, 'NavigationScreen'>>();
    const { latitude, longitude, name, address } = route.params;

    DEBUG.log('Navigation Screen Initialized', { latitude, longitude, name, address });

    const destination = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name,
        address: address || ''
    };

    DEBUG.log('Destination Set', destination);

    const webViewRef = useRef<WebView>(null);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [locationWatchId, setLocationWatchId] = useState<Location.LocationSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [navigationInfo, setNavigationInfo] = useState({
        distance: '-- m',
        time: '-- min',
        instruction: 'Menghitung rute...',
        nextInstruction: '',
        remainingDistance: '-- m',
        remainingTime: '-- min',
        currentSpeed: '0 km/h',
        bearing: 0
    });
    const [webViewLoaded, setWebViewLoaded] = useState(false);
    const [isNavigating, setIsNavigating] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Get user location when component mounts
    useEffect(() => {
        const getUserLocation = async () => {
            try {
                DEBUG.log('Requesting location permissions...');
                const { status } = await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    DEBUG.error('Location permission denied');
                    Alert.alert('Izin Lokasi Diperlukan', 'Aplikasi membutuhkan akses lokasi untuk navigasi');
                    router.back();
                    return;
                }

                DEBUG.log('Location permission granted, getting current position...');
                setIsLoading(true);
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.BestForNavigation,
                });

                DEBUG.log('Current position obtained', {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    accuracy: location.coords.accuracy
                });

                setUserLocation(location);

                // Start watching location with high accuracy
                DEBUG.log('Starting location watch...');
                const subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        distanceInterval: 5,
                        timeInterval: 1000,
                    },
                    (location) => {
                        if (!isNavigating) {
                            DEBUG.warn('Location update ignored - navigation stopped');
                            return;
                        }

                        DEBUG.log('Location updated', {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            accuracy: location.coords.accuracy,
                            speed: location.coords.speed,
                            heading: location.coords.heading
                        });

                        setUserLocation(location);

                        // Update speed and bearing
                        const speed = location.coords.speed ? (location.coords.speed * 3.6).toFixed(1) : '0';
                        const bearing = location.coords.heading || 0;

                        setNavigationInfo(prev => ({
                            ...prev,
                            currentSpeed: `${speed} km/h`,
                            bearing: bearing
                        }));

                        if (webViewRef.current && webViewLoaded && isNavigating) {
                            try {
                                const { latitude, longitude, accuracy } = location.coords;
                                DEBUG.log('Updating WebView position', {
                                    latitude,
                                    longitude,
                                    accuracy,
                                    bearing
                                });

                                const updateScript = `
                                    try {
                                        if (window.updateUserPosition) {
                                            window.updateUserPosition(${latitude}, ${longitude}, ${accuracy || 0}, ${bearing});
                                            true;
                                        }
                                    } catch(e) {
                                        console.error('Error updating position:', e);
                                        true;
                                    }
                                `;
                                webViewRef.current.injectJavaScript(updateScript);
                            } catch (error) {
                                DEBUG.error('Error updating WebView position', error);
                            }
                        }
                    }
                );

                DEBUG.log('Location watch started successfully');
                setLocationWatchId(subscription);
                setIsLoading(false);
            } catch (error) {
                DEBUG.error('Error in location handling', error);
                Alert.alert('Error', 'Gagal memulai navigasi. Coba lagi.');
                router.back();
            }
        };

        getUserLocation();

        return () => {
            if (locationWatchId) {
                DEBUG.log('Cleaning up location watch');
                locationWatchId.remove();
            }
        };
    }, []);

    // Initialize navigation when user location is available and WebView is loaded
    useEffect(() => {
        if (!userLocation || !webViewRef.current || !webViewLoaded || !isNavigating) {
            DEBUG.log('Navigation initialization skipped', {
                hasUserLocation: !!userLocation,
                hasWebViewRef: !!webViewRef.current,
                isWebViewLoaded: webViewLoaded,
                isNavigating
            });
            return;
        }

        DEBUG.log('Initializing navigation in WebView', {
            userLocation: userLocation.coords,
            destination
        });

        const initScript = `
            try {
                if (window.updateNavigation) {
                    window.updateNavigation(
                        ${userLocation.coords.latitude},
                        ${userLocation.coords.longitude},
                        ${destination.latitude},
                        ${destination.longitude},
                        "${destination.name.replace(/"/g, '\\"')}",
                        "${(destination.address || '').replace(/"/g, '\\"')}"
                    );
                }
                true;
            } catch(e) {
                console.error('Error initializing navigation:', e);
                true;
            }
        `;

        setTimeout(() => {
            if (webViewRef.current && isNavigating) {
                DEBUG.log('Injecting navigation initialization script');
                webViewRef.current.injectJavaScript(initScript);
            }
        }, 1000);
    }, [userLocation, destination, webViewLoaded]);

    const handleWebViewLoad = () => {
        DEBUG.log('WebView loaded');
        setWebViewLoaded(true);
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            DEBUG.log('Received WebView message', data);

            if (data.type === 'exitNavigation') {
                DEBUG.log('Exiting navigation');
                cleanupAndGoBack();
            } else if (data.type === 'returnToMainMap') {
                DEBUG.log('Returning to main map');
                cleanupAndGoBack();
            } else if (data.type === 'routeInfo') {
                DEBUG.log('Route info updated', data.data);
                setNavigationInfo({
                    ...navigationInfo,
                    distance: data.data.formattedDistance || '-- m',
                    time: data.data.formattedTime || '-- min',
                    instruction: data.data.instruction || 'Menghitung rute...',
                    nextInstruction: data.data.nextInstruction || '',
                    remainingDistance: data.data.remainingDistance || '-- m',
                    remainingTime: data.data.remainingTime || '-- min'
                });
            } else if (data.type === 'openGoogleMaps') {
                DEBUG.log('Opening Google Maps', data.data);
                const { latitude, longitude, name } = data.data;
                const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving&destination_place_id=${encodeURIComponent(name)}`;
                Linking.openURL(url);
            }
        } catch (error) {
            DEBUG.error('Error handling WebView message', error);
        }
    };

    const cleanupAndGoBack = () => {
        DEBUG.log('Cleaning up and going back');
        setIsNavigating(false);
        if (locationWatchId) {
            locationWatchId.remove();
            setLocationWatchId(null);
        }
        router.back();
    };

    const navigationHTML = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
            <style>
                html, body { 
                    margin: 0; 
                    height: 100%; 
                    font-family: 'Arial', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                
                #map { 
                    width: 100%; 
                    height: 100%; 
                }
                
                .nav-header {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: rgba(16, 185, 129, 0.95);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    color: white;
                    padding: 20px;
                    z-index: 1000;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    border-bottom-left-radius: 24px;
                    border-bottom-right-radius: 24px;
                }
                
                .dest-info {
                    flex-grow: 1;
                    margin-left: 15px;
                }
                
                .dest-name {
                    font-weight: 700;
                    font-size: 20px;
                    letter-spacing: -0.3px;
                    margin-bottom: 4px;
                }
                
                .dest-address {
                    font-size: 13px;
                    opacity: 0.9;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 250px;
                    font-weight: 400;
                }
                
                .nav-btn {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 16px;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transition: all 0.3s ease;
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .nav-btn:active {
                    transform: scale(0.95);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
                
                .nav-info {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    border-top-left-radius: 28px;
                    border-top-right-radius: 28px;
                    box-shadow: 0 -4px 30px rgba(0,0,0,0.15);
                    z-index: 1000;
                    transform: translateY(calc(100% - 160px));
                    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    max-height: 90vh;
                    overflow: hidden;
                }
                
                .nav-info.expanded {
                    transform: translateY(0);
                }
                
                .nav-info-handle {
                    width: 48px;
                    height: 5px;
                    background: #e2e8f0;
                    border-radius: 3px;
                    margin: 16px auto;
                    cursor: pointer;
                }
                
                .instruction {
                    display: flex;
                    align-items: center;
                    margin: 0 24px 20px;
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 20px;
                }
                
                .turn-icon {
                    background: #f0f9ff;
                    width: 60px;
                    height: 60px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 20px;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
                }
                
                .instruction-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1e293b;
                    flex: 1;
                    line-height: 1.4;
                }
                
                .next-instruction {
                    font-size: 15px;
                    color: #64748b;
                    margin-top: 6px;
                }
                
                .distance-time {
                    display: flex;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-top: 1px solid #f1f5f9;
                    background: white;
                }
                
                .metric-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0 16px;
                }
                
                .metric-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #0f172a;
                }
                
                .metric-label {
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 4px;
                    font-weight: 500;
                }
                
                .directions-panel {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    background: #f8fafc;
                }
                
                .directions-panel.expanded {
                    max-height: calc(90vh - 220px);
                    overflow-y: auto;
                    padding-bottom: 24px;
                }
                
                .direction-step {
                    display: flex;
                    align-items: center;
                    padding: 16px 24px;
                    border-bottom: 1px solid #f1f5f9;
                    background: white;
                    margin: 8px 16px;
                    border-radius: 16px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }
                
                .step-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 16px;
                    flex-shrink: 0;
                }
                
                .step-text {
                    flex: 1;
                    font-size: 15px;
                    color: #334155;
                    line-height: 1.4;
                }
                
                .step-distance {
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 4px;
                }

                .step-number {
                    position: absolute;
                    top: 0;
                    left: 0;
                    background: #3b82f6;
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 3px 8px;
                    border-radius: 0 0 12px 0;
                }

                .step-container {
                    position: relative;
                    margin: 12px 0;
                }

                .expand-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .expand-button:hover {
                    background: #f1f5f9;
                }

                .expand-button-text {
                    font-size: 15px;
                    font-weight: 600;
                    color: #3b82f6;
                    margin-left: 8px;
                }
                
                .google-maps-btn {
                    position: absolute;
                    bottom: 200px;
                    right: 24px;
                    background: rgba(66, 133, 244, 0.95);
                    color: white;
                    padding: 14px 28px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 600;
                    font-size: 15px;
                    box-shadow: 0 4px 20px rgba(66, 133, 244, 0.3);
                    z-index: 100;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
                
                .google-maps-btn:active {
                    transform: scale(0.98);
                    box-shadow: 0 2px 10px rgba(66, 133, 244, 0.2);
                }
                
                .action-buttons {
                    position: absolute;
                    bottom: 120px;
                    right: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    z-index: 1000;
                }
                
                .action-btn {
                    background: rgba(255, 255, 255, 0.95);
                    width: 60px;
                    height: 60px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
                
                .action-btn:active {
                    transform: scale(0.95);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .speed-indicator {
                    position: absolute;
                    top: 120px;
                    right: 24px;
                    background: rgba(255, 255, 255, 0.95);
                    padding: 16px 20px;
                    border-radius: 20px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }

                .speed-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .speed-label {
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 4px;
                    font-weight: 500;
                }

                .compass {
                    position: absolute;
                    top: 200px;
                    right: 24px;
                    width: 70px;
                    height: 70px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 35px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }

                .compass-arrow {
                    width: 36px;
                    height: 36px;
                    transition: transform 0.3s ease;
                }

                .mapboxgl-ctrl-top-right {
                    top: 100px;
                }

                .mapboxgl-ctrl-group {
                    border-radius: 16px !important;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
                }

                .mapboxgl-ctrl-group button {
                    width: 48px !important;
                    height: 48px !important;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            
            <div class="nav-header">
                <button class="nav-btn back-btn" onclick="returnToMainMap()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <div class="dest-info">
                    <div class="dest-name" id="dest-name">Loading...</div>
                    <div class="dest-address" id="dest-address"></div>
                </div>
            </div>
            
            <div class="speed-indicator">
                <div class="speed-value" id="speed-value">0</div>
                <div class="speed-label">km/h</div>
            </div>

            <div class="compass">
                <svg class="compass-arrow" id="compass-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L12 22M12 2L8 6M12 2L16 6"/>
                </svg>
            </div>
            
            <div class="nav-info" id="nav-info">
                <div class="nav-info-handle"></div>
                
                
                <div class="distance-time">
                    <div class="metric-item">
                        <div class="metric-value" id="distance">--</div>
                        <div class="metric-label">Jarak</div>
                    </div>
                    
                    <div class="metric-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                    </div>
                    
                    <div class="metric-item">
                        <div class="metric-value" id="time">--</div>
                        <div class="metric-label">Waktu</div>
                    </div>
                </div>

                <div class="expand-button" id="expand-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    <span class="expand-button-text">Lihat Rute Lengkap</span>
                </div>

                <div class="directions-panel" id="directions-panel">
                    <!-- Directions will be populated here -->
                </div>
            </div>
            
            <button class="google-maps-btn" onclick="openGoogleMaps()">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Maps
            </button>
            
            <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
            <script>
                // Initialize Mapbox
                mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
                let map = null;
                let userMarker = null;
                let destMarker = null;
                let routeLine = null;
                let userBearing = 0;
                
                // Initialize with default values
                let userLat = ${DEFAULT_LAT};
                let userLng = ${DEFAULT_LNG};
                let destLat = 0;
                let destLng = 0;
                let destName = "Destination";
                let destAddress = "";
                
                // Initialize map
                document.addEventListener('DOMContentLoaded', function() {
                    initializeMap();
                    setupDirectionsPanel();
                    setupCompass();
                });
                
                function initializeMap() {
                    map = new mapboxgl.Map({
                        container: 'map',
                        style: 'mapbox://styles/mapbox/navigation-night-v1',
                        center: [userLng, userLat],
                        zoom: 15,
                        pitch: 60,
                        bearing: 0,
                        antialias: true
                    });

                    // Add 3D building layer
                    map.on('load', () => {
                        map.addLayer({
                            'id': '3d-buildings',
                            'source': 'composite',
                            'source-layer': 'building',
                            'filter': ['==', 'extrude', 'true'],
                            'type': 'fill-extrusion',
                            'minzoom': 15,
                            'paint': {
                                'fill-extrusion-color': '#aaa',
                                'fill-extrusion-height': ['get', 'height'],
                                'fill-extrusion-base': ['get', 'min_height'],
                                'fill-extrusion-opacity': 0.6
                            }
                        });
                    });
                    
                    // Make sure global functions are available
                    window.updateNavigation = updateNavigation;
                    window.updateUserPosition = updateUserPosition;
                    window.exitNavigation = exitNavigation;
                    window.returnToMainMap = returnToMainMap;
                    window.openGoogleMaps = openGoogleMaps;
                }
                
                function setupDirectionsPanel() {
                    const navInfo = document.getElementById('nav-info');
                    const handle = document.querySelector('.nav-info-handle');
                    const expandButton = document.getElementById('expand-button');
                    let startY = 0;
                    let currentY = 0;
                    let isDragging = false;

                    // Handle drag functionality
                    handle.addEventListener('touchstart', (e) => {
                        startY = e.touches[0].clientY;
                        currentY = navInfo.getBoundingClientRect().top;
                        isDragging = true;
                    });

                    handle.addEventListener('touchmove', (e) => {
                        if (!isDragging) return;
                        const deltaY = e.touches[0].clientY - startY;
                        const newY = Math.max(0, Math.min(window.innerHeight - 140, currentY + deltaY));
                        navInfo.style.transform = \`translateY(\${newY}px)\`;
                    });

                    handle.addEventListener('touchend', () => {
                        isDragging = false;
                        const currentTransform = navInfo.style.transform;
                        const currentY = parseInt(currentTransform.replace('translateY(', '').replace('px)', ''));
                        
                        if (currentY < window.innerHeight / 2) {
                            navInfo.classList.add('expanded');
                            document.getElementById('directions-panel').classList.add('expanded');
                            expandButton.style.display = 'none';
                        } else {
                            navInfo.classList.remove('expanded');
                            document.getElementById('directions-panel').classList.remove('expanded');
                            expandButton.style.display = 'flex';
                        }
                    });

                    // Handle expand button click
                    expandButton.addEventListener('click', () => {
                        navInfo.classList.add('expanded');
                        document.getElementById('directions-panel').classList.add('expanded');
                        expandButton.style.display = 'none';
                    });

                    // Add collapse button to directions panel
                    const directionsPanel = document.getElementById('directions-panel');
                    const collapseButton = document.createElement('div');
                    collapseButton.className = 'expand-button';
                    collapseButton.innerHTML = \`
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                        <span class="expand-button-text">Tutup Rute</span>
                    \`;
                    
                    collapseButton.addEventListener('click', () => {
                        navInfo.classList.remove('expanded');
                        document.getElementById('directions-panel').classList.remove('expanded');
                        expandButton.style.display = 'flex';
                    });
                    
                    directionsPanel.insertBefore(collapseButton, directionsPanel.firstChild);

                    // Prevent scrolling of the map when interacting with the panel
                    navInfo.addEventListener('touchmove', (e) => {
                        if (navInfo.classList.contains('expanded')) {
                            e.stopPropagation();
                        }
                    }, { passive: false });
                }

                function setupCompass() {
                    const compassArrow = document.getElementById('compass-arrow');
                    if (compassArrow) {
                        compassArrow.style.transform = \`rotate(\${userBearing}deg)\`;
                    }
                }
                
                function updateNavigation(uLat, uLng, dLat, dLng, name, address) {
                    userLat = Number(uLat);
                    userLng = Number(uLng);
                    destLat = Number(dLat);
                    destLng = Number(dLng);
                    destName = name || "Destination";
                    destAddress = address || "";
                    
                    document.getElementById("dest-name").textContent = destName;
                    document.getElementById("dest-address").textContent = destAddress;
                    
                    if (userMarker) {
                        userMarker.setLngLat([userLng, userLat]);
                    } else {
                        userMarker = new mapboxgl.Marker({
                            color: '#4338ca',
                            scale: 1.2
                        })
                        .setLngLat([userLng, userLat])
                        .addTo(map);
                    }
                    
                    if (destMarker) {
                        destMarker.setLngLat([destLng, destLat]);
                    } else {
                        destMarker = new mapboxgl.Marker({
                            color: '#ef4444',
                            scale: 1.2
                        })
                        .setLngLat([destLng, destLat])
                        .addTo(map);
                    }
                    
                    getDirections();
                }
                
                function updateUserPosition(lat, lng, accuracy, bearing) {
                    userLat = Number(lat);
                    userLng = Number(lng);
                    userBearing = Number(bearing) || 0;
                    
                    if (userMarker && map) {
                        userMarker.setLngLat([userLng, userLat]);
                        
                        // Update compass
                        const compassArrow = document.getElementById('compass-arrow');
                        if (compassArrow) {
                            compassArrow.style.transform = \`rotate(\${userBearing}deg)\`;
                        }
                        
                        // Update speed indicator
                        const speedValue = document.getElementById('speed-value');
                        if (speedValue) {
                            speedValue.textContent = Math.round(userBearing);
                        }
                        
                        // Update route
                        getDirections();
                    }
                }
                
                function getDirections() {
                    if (routeLine) {
                        map.removeLayer('route');
                        map.removeSource('route');
                    }
                    
                    fetch(\`https://api.mapbox.com/directions/v5/mapbox/driving/\${userLng},\${userLat};\${destLng},\${destLat}?geometries=geojson&steps=true&access_token=\${mapboxgl.accessToken}\`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.routes && data.routes.length > 0) {
                                const route = data.routes[0];
                                
                                map.addSource('route', {
                                    'type': 'geojson',
                                    'data': {
                                        'type': 'Feature',
                                        'properties': {},
                                        'geometry': route.geometry
                                    }
                                });
                                
                                map.addLayer({
                                    'id': 'route',
                                    'type': 'line',
                                    'source': 'route',
                                    'layout': {
                                        'line-join': 'round',
                                        'line-cap': 'round'
                                    },
                                    'paint': {
                                        'line-color': '#3b82f6',
                                        'line-width': 5,
                                        'line-opacity': 0.8
                                    }
                                });
                        
                                const distance = route.distance;
                                const duration = route.duration;
                        
                                document.getElementById('distance').textContent = formatDistance(distance);
                                document.getElementById('time').textContent = formatTime(duration);
                                
                                updateDirectionsPanel(route.legs[0].steps);
                        
                                window.ReactNativeWebView?.postMessage(JSON.stringify({
                                    type: 'routeInfo',
                                    data: {
                                        distance: distance,
                                        formattedDistance: formatDistance(distance),
                                        time: duration,
                                        formattedTime: formatTime(duration),
                                        instruction: route.legs[0].steps[0].maneuver.instruction,
                                        nextInstruction: route.legs[0].steps[1]?.maneuver.instruction || '',
                                        remainingDistance: formatDistance(route.legs[0].distance),
                                        remainingTime: formatTime(route.legs[0].duration)
                                    }
                                }));
                                
                                const bounds = new mapboxgl.LngLatBounds(
                                    [userLng, userLat],
                                    [destLng, destLat]
                                );
                                map.fitBounds(bounds, {
                                    padding: 50,
                                    maxZoom: 15
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Error getting directions:', error);
                        });
                }
                
                function updateDirectionsPanel(steps) {
                    const panel = document.getElementById('directions-panel');
                    panel.innerHTML = '';
                    
                    steps.forEach((step, index) => {
                        const stepContainer = document.createElement('div');
                        stepContainer.className = 'step-container';
                        
                        const stepElement = document.createElement('div');
                        stepElement.className = 'direction-step';
                        
                        const icon = getDirectionIcon(step.maneuver.type, step.maneuver.modifier);
                        
                        stepElement.innerHTML = \`
                            <div class="step-number">\${index + 1}</div>
                            <div class="step-icon">
                                \${icon}
                            </div>
                            <div class="step-text">
                                \${step.maneuver.instruction}
                                <div class="step-distance">\${formatDistance(step.distance)}</div>
                            </div>
                        \`;
                        
                        stepContainer.appendChild(stepElement);
                        panel.appendChild(stepContainer);
                    });
                }

                function getDirectionIcon(type, modifier) {
                    const icons = {
                        'turn': {
                            'left': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 12l6-6M3 12l6 6"/></svg>',
                            'right': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M21 12l-6-6M21 12l-6 6"/></svg>',
                            'slight left': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 12l4-4M3 12l4 4"/></svg>',
                            'slight right': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M21 12l-4-4M21 12l-4 4"/></svg>',
                            'sharp left': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 12l8-8M3 12l8 8"/></svg>',
                            'sharp right': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M21 12l-8-8M21 12l-8 8"/></svg>'
                        },
                        'continue': {
                            'straight': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
                        },
                        'arrive': {
                            'destination': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>'
                        }
                    };
                    
                    return icons[type]?.[modifier] || icons['continue']['straight'];
                }
                
                function formatDistance(distance) {
                    if (distance < 1000) {
                        return Math.round(distance) + 'm';
                    } else {
                        return (distance / 1000).toFixed(1) + 'km';
                    }
                }
                
                function formatTime(seconds) {
                    if (seconds < 60) {
                        return '<1 min';
                    } else if (seconds < 3600) {
                        return Math.round(seconds / 60) + ' min';
                    } else {
                        const hours = Math.floor(seconds / 3600);
                        const minutes = Math.round((seconds % 3600) / 60);
                        return hours + ' jam ' + (minutes > 0 ? minutes + ' min' : '');
                    }
                }
                
                function exitNavigation() {
                    window.ReactNativeWebView?.postMessage(JSON.stringify({
                        type: 'exitNavigation'
                    }));
                }
                
                function returnToMainMap() {
                    window.ReactNativeWebView?.postMessage(JSON.stringify({
                        type: 'returnToMainMap'
                    }));
                }

                function openGoogleMaps() {
                    window.ReactNativeWebView?.postMessage(JSON.stringify({
                        type: 'openGoogleMaps',
                        data: {
                            latitude: destLat,
                            longitude: destLng,
                            name: destName,
                            address: destAddress
                        }
                    }));
                }
            </script>
        </body>
        </html>
    `;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <LinearGradient
                        colors={['#10b981', '#059669']}
                        style={styles.loadingGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <MotiView
                            from={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'timing', duration: 500 }}
                        >
                            <MaterialIcons name="navigation" size={40} color="white" />
                        </MotiView>

                        <MotiView
                            from={{ translateY: 20, opacity: 0 }}
                            animate={{ translateY: 0, opacity: 1 }}
                            transition={{ type: 'timing', duration: 500, delay: 200 }}
                            style={styles.loadingTitleContainer}
                        >
                            <Text style={styles.loadingTitle}>Memulai Navigasi</Text>
                            <Text style={styles.loadingSubtitle}>Menyiapkan rute terbaik ke tujuan anda...</Text>
                        </MotiView>

                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: 'timing', duration: 300, delay: 400 }}
                            style={styles.loadingIndicatorContainer}
                        >
                            <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
                        </MotiView>
                    </LinearGradient>
                </View>
            ) : (
                <WebView
                    ref={webViewRef}
                    source={{ html: navigationHTML }}
                    style={StyleSheet.absoluteFill}
                    onMessage={handleWebViewMessage}
                    onLoadEnd={handleWebViewLoad}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    geolocationEnabled={true}
                />
            )}
        </View>
    );
};

export default NavigationScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    loadingTitleContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    loadingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    loadingIndicatorContainer: {
        marginTop: 40,
    }
}); 