import React, { useEffect, useState, useRef, useContext } from 'react';

import { StyleSheet, View, Alert, TextInput, FlatList, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Platform, LogBox, ScrollView, Text as RNText } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps'; // Import Marker
import { BottomSheet, BottomSheetBackdrop, BottomSheetContent, BottomSheetDragIndicator, BottomSheetItem, BottomSheetItemText, BottomSheetPortal, BottomSheetScrollView, BottomSheetTrigger } from '@/components/ui/bottomsheet';
import Donut from '@/components/Donut';
import RealTimeClock from '@/components/RealTimeClock';
import { Fab, FabIcon, FabLabel } from '@/components/ui/fab';
import Map from '@/components/map/Map';
import { io, Socket } from 'socket.io-client'; // Import Socket.IO client
import { port } from '@/constants/https';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Button, ButtonText } from "@/components/ui/button"
import { Center } from "@/components/ui/center"
import { Heading } from "@/components/ui/heading"
import {
    Modal,
    ModalBackdrop,
    ModalContent,
    ModalCloseButton,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text"
import { Icon, CloseIcon } from "@/components/ui/icon"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogBody,
    AlertDialogBackdrop
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
// import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { calculateDistance } from '@/utils/geoUtils'; // Fungsi hitung jarak
// import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Speedometer from 'react-native-speedometer-chart';
import { HStack } from '@/components/ui/hstack';
import { DeviceEventEmitter } from 'react-native';
import { Divider } from '@/components/ui/divider';
import { AnimatePresence, MotiView } from 'moti';
// import { NotificationComponent } from '@/components/notification/NotificationComponent';
import { useForegroundService } from '@/hooks/useForegroundService';
import { useForm, Controller } from "react-hook-form";
import { logout } from '@/controllers/auth';
import { router } from 'expo-router';
import CustomDrawer from '../../components/CustomDrawer';
import { Switch } from '@/components/ui/switch';
import WebView from 'react-native-webview';
import * as Location from 'expo-location';

// Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//         shouldShowAlert: true,
//         shouldPlaySound: false,
//         shouldSetBadge: false,
//     }),
// });

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse?";

// Update interface
interface SavedLocation {
    id_lokasi: number;
    nama_sungai: string;
    address: string;
    latitude: any;
    longitude: any;
}

interface SensorConfig {
    id: string;
    name: string;
    min: number;
    max: number;
    unit: string;
    thresholds: {
        value: number;
        label: string;
        color: string;
    }[];
}

const sensorConfigs: SensorConfig[] = [
    // Sensor Accelerometer
    {
        id: 'accel_x',
        name: 'Accelerometer X',
        min: -20,
        max: 20,
        unit: 'm/s²',
        thresholds: [
            { value: -10, label: 'Kiri', color: '#FF6B6B' },
            { value: -5, label: 'Miring Kiri', color: '#FFD93D' },
            { value: 5, label: 'Stabil', color: '#6BCB77' },
            { value: 10, label: 'Miring Kanan', color: '#FFD93D' },
            { value: 20, label: 'Kanan', color: '#FF6B6B' }
        ]
    },
    {
        id: 'accel_y',
        name: 'Accelerometer Y',
        min: -20,
        max: 20,
        unit: 'm/s²',
        thresholds: [
            { value: -10, label: 'Bawah', color: '#FF6B6B' },
            { value: -5, label: 'Turun', color: '#FFD93D' },
            { value: 5, label: 'Stabil', color: '#6BCB77' },
            { value: 10, label: 'Naik', color: '#FFD93D' },
            { value: 20, label: 'Atas', color: '#FF6B6B' }
        ]
    },
    {
        id: 'accel_z',
        name: 'Accelerometer Z',
        min: -20,
        max: 20,
        unit: 'm/s²',
        thresholds: [
            { value: -10, label: 'Belakang', color: '#FF6B6B' },
            { value: -5, label: 'Miring Belakang', color: '#FFD93D' },
            { value: 5, label: 'Stabil', color: '#6BCB77' },
            { value: 10, label: 'Miring Depan', color: '#FFD93D' },
            { value: 20, label: 'Depan', color: '#FF6B6B' }
        ]
    },
    // Sensor PH
    {
        id: 'ph',
        name: 'Tingkat pH',
        min: 0,
        max: 14,
        unit: 'pH',
        thresholds: [
            { value: 0, label: 'Asam Ekstrim', color: '#FF0000' },
            { value: 4, label: 'Asam', color: '#FF4444' },
            { value: 6.5, label: 'Normal', color: '#44FF44' },
            { value: 8.5, label: 'Basa', color: '#FF4444' },
            { value: 14, label: 'Basa Ekstrim', color: '#FF0000' }
        ]
    },
    // Sensor Kekeruhan
    {
        id: 'turbidity',
        name: 'Tingkat Kekeruhan',
        min: 0,
        max: 100,
        unit: 'NTU',
        thresholds: [
            { value: 0, label: 'Jernih', color: '#87CEEB' },
            { value: 25, label: 'Sedikit Keruh', color: '#4682B4' },
            { value: 50, label: 'Keruh', color: '#2F4F4F' }
        ]
    },
    // Sensor Suhu
    {
        id: 'temperature',
        name: 'Suhu Air',
        min: 0,
        max: 100,
        unit: '°C',
        thresholds: [
            { value: 0, label: 'Beku', color: '#2196F3' },
            { value: 15, label: 'Dingin', color: '#4CAF50' },
            { value: 30, label: 'Normal', color: '#FF9800' },
            { value: 50, label: 'Panas', color: '#F44336' }
        ]
    },
    // Sensor Kecepatan
    {
        id: 'speed',
        name: 'Kecepatan Alat',
        min: 0,
        max: 5,
        unit: 'm/s',
        thresholds: [
            { value: 0, label: 'Diam', color: '#4CAF50' },
            { value: 0.5, label: 'Tenang', color: '#4CAF50' },
            { value: 1.5, label: 'Sedang', color: '#FF9800' },
            { value: 3, label: 'Cepat', color: '#F44336' }
        ]
    }
];

// Tambahkan interface di atas komponen
interface SensorData {
    accel_x: number;
    accel_y: number;
    accel_z: number;
    ph: number;
    turbidity: number;
    temperature: number;
    speed: number;
}

// Simple NavigationScreen component implemented directly in the file
interface NavigationScreenProps {
    destination: {
        latitude: number;
        longitude: number;
        name: string;
        address?: string;
    };
    onClose: () => void;
    onReturn: () => void;
}

const NavigationScreen: React.FC<NavigationScreenProps> = ({ destination, onClose, onReturn }) => {
    const webViewRef = useRef<WebView>(null);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [locationWatchId, setLocationWatchId] = useState<Location.LocationSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Get user location when component mounts
    useEffect(() => {
        const getUserLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Izin Lokasi Diperlukan', 'Aplikasi membutuhkan akses lokasi untuk navigasi');
                    onClose();
                    return;
                }

                setIsLoading(true);
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.BestForNavigation,
                });
                setUserLocation(location);

                // Start watching location
                const subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        distanceInterval: 5,
                        timeInterval: 3000,
                    },
                    (location) => {
                        setUserLocation(location);

                        // Update the navigation UI with the new location
                        if (webViewRef.current) {
                            const { latitude, longitude, accuracy } = location.coords;
                            const updateScript = `
                                try {
                                    window.updateUserPosition(${latitude}, ${longitude}, ${accuracy || 0});
                                    true;
                                } catch(e) {
                                    console.error('Error updating position:', e);
                                    true;
                                }
                            `;
                            webViewRef.current.injectJavaScript(updateScript);
                        }
                    }
                );

                setLocationWatchId(subscription);
                setIsLoading(false);
            } catch (error) {
                console.error('Error starting navigation:', error);
                Alert.alert('Error', 'Gagal memulai navigasi. Coba lagi.');
                onClose();
            }
        };

        getUserLocation();

        // Cleanup
        return () => {
            if (locationWatchId) {
                locationWatchId.remove();
            }
        };
    }, []);

    // Initialize navigation when user location is available
    useEffect(() => {
        if (!userLocation || !webViewRef.current) return;

        const initScript = `
            try {
                window.updateNavigation(
                    ${userLocation.coords.latitude},
                    ${userLocation.coords.longitude},
                    ${destination.latitude},
                    ${destination.longitude},
                    "${destination.name.replace(/"/g, '\\"')}",
                    "${(destination.address || '').replace(/"/g, '\\"')}"
                );
                true;
            } catch(e) {
                console.error('Error initializing navigation:', e);
                true;
            }
        `;

        webViewRef.current.injectJavaScript(initScript);
    }, [userLocation, destination]);

    // Handle messages from WebView
    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'exitNavigation') {
                if (locationWatchId) {
                    locationWatchId.remove();
                }
                onClose();
            } else if (data.type === 'returnToMainMap') {
                onReturn();
            }
        } catch (error) {
            console.error('Error handling WebView message:', error);
        }
    };

    // Create a simple HTML for navigation
    const navigationHTML = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
            <style>
                html, body { margin: 0; height: 100%; }
                #map { width: 100%; height: 100%; }
                
                .nav-header {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    padding: 12px 20px;
                    z-index: 1000;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .dest-info {
                    flex-grow: 1;
                    margin-left: 15px;
                }
                
                .dest-name {
                    font-weight: bold;
                    font-size: 16px;
                }
                
                .dest-address {
                    font-size: 12px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 200px;
                }
                
                .nav-btn {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                }
                
                .back-btn {
                    background: rgba(255,255,255,0.25);
                    color: white;
                    margin-right: 10px;
                }
                
                .close-btn {
                    background: #ff5252;
                    color: white;
                }
                
                .nav-info {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    padding: 15px 20px;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    width: 90%;
                    max-width: 350px;
                    z-index: 1000;
                }
                
                .instruction {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .turn-icon {
                    background: #f0f9ff;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                }
                
                .instruction-text {
                    font-size: 16px;
                    font-weight: 500;
                }
                
                .distance-time {
                    display: flex;
                    justify-content: space-between;
                    padding-top: 10px;
                    border-top: 1px solid #f1f5f9;
                    margin-top: 10px;
                }
                
                .recenter-btn {
                    position: absolute;
                    bottom: 130px;
                    right: 20px;
                    background: white;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    z-index: 1000;
                    border: none;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            
            <div class="nav-header">
                <button class="nav-btn back-btn" onclick="returnToMainMap()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <div class="dest-info">
                    <div class="dest-name" id="dest-name">Loading...</div>
                    <div class="dest-address" id="dest-address"></div>
                </div>
                <button class="nav-btn close-btn" onclick="exitNavigation()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <div class="nav-info">
                <div class="instruction">
                    <div class="turn-icon" id="turn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div class="instruction-text" id="instruction">Menghitung rute...</div>
                </div>
                <div class="distance-time">
                    <div>
                        <div id="distance" style="font-size:18px;font-weight:bold;">--</div>
                        <div style="font-size:12px;color:#64748b;">Jarak</div>
                    </div>
                    <div>
                        <div id="time" style="font-size:18px;font-weight:bold;">--</div>
                        <div style="font-size:12px;color:#64748b;">Waktu</div>
                    </div>
                </div>
            </div>
            
            <button class="recenter-btn" onclick="centerOnLocation()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            
            <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
            <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
            <script>
                // Global variables
                let map, userMarker, destMarker, route;
                let userLat, userLng, destLat, destLng;
                
                // Initialize map
                map = L.map('map').setView([0, 0], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);
                
                // Icons
                const userIcon = L.icon({
                    iconUrl: 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/markerBaseLocation.png',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                
                const destIcon = L.icon({
                    iconUrl: 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/waterSelected.png',
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                });
                
                // Initialize navigation
                function updateNavigation(uLat, uLng, dLat, dLng, name, address) {
                    userLat = uLat;
                    userLng = uLng;
                    destLat = dLat;
                    destLng = dLng;
                    
                    // Update destination info
                    document.getElementById('dest-name').textContent = name || 'Tujuan';
                    document.getElementById('dest-address').textContent = address || '';
                    
                    // Add user marker
                    if (userMarker) {
                        userMarker.setLatLng([userLat, userLng]);
                    } else {
                        userMarker = L.marker([userLat, userLng], {
                            icon: userIcon,
                            zIndexOffset: 1000
                        }).addTo(map);
                    }
                    
                    // Add destination marker
                    if (destMarker) {
                        destMarker.setLatLng([destLat, destLng]);
                    } else {
                        destMarker = L.marker([destLat, destLng], {
                            icon: destIcon,
                            zIndexOffset: 900
                        }).addTo(map);
                    }
                    
                    // Calculate route
                    calculateRoute();
                    
                    // Center map to show both points
                    const bounds = L.latLngBounds(
                        L.latLng(userLat, userLng),
                        L.latLng(destLat, destLng)
                    );
                    map.fitBounds(bounds, { padding: [50, 50] });
                    
                    return true;
                }
                
                // Update user position
                function updateUserPosition(lat, lng, accuracy) {
                    if (!userMarker) return false;
                    
                    userLat = lat;
                    userLng = lng;
                    userMarker.setLatLng([lat, lng]);
                    
                    // Recalculate route
                    calculateRoute();
                    
                    return true;
                }
                
                // Calculate route
                function calculateRoute() {
                    if (route) {
                        map.removeControl(route);
                    }
                    
                    route = L.Routing.control({
                        waypoints: [
                            L.latLng(userLat, userLng),
                            L.latLng(destLat, destLng)
                        ],
                        router: L.Routing.osrmv1({
                            serviceUrl: 'https://router.project-osrm.org/route/v1',
                            profile: 'driving'
                        }),
                        lineOptions: {
                            styles: [
                                {color: '#3388ff', opacity: 0.8, weight: 5},
                                {color: '#1056db', opacity: 0.3, weight: 8}
                            ]
                        },
                        createMarker: function() { return null; },
                        addWaypoints: false,
                        draggableWaypoints: false,
                        fitSelectedRoutes: false,
                        showAlternatives: false
                    }).addTo(map);
                    
                    // Update navigation info when route is calculated
                    route.on('routesfound', function(e) {
                        const routes = e.routes;
                        const summary = routes[0].summary;
                        
                        // Format distance
                        let formattedDistance;
                        if (summary.totalDistance < 1000) {
                            formattedDistance = Math.round(summary.totalDistance) + 'm';
                        } else {
                            formattedDistance = (summary.totalDistance / 1000).toFixed(1) + 'km';
                        }
                        
                        // Format time
                        const mins = Math.floor(summary.totalTime / 60);
                        const formattedTime = mins < 60 ? 
                            mins + ' min' : 
                            Math.floor(mins / 60) + 'h ' + (mins % 60) + 'min';
                        
                        // Update UI
                        document.getElementById('distance').textContent = formattedDistance;
                        document.getElementById('time').textContent = formattedTime;
                        
                        // Get next instruction
                        const instruction = routes[0].instructions[0];
                        document.getElementById('instruction').textContent = instruction.text;
                        
                        // Send data to React Native
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'routeInfo',
                            data: {
                                distance: summary.totalDistance,
                                time: summary.totalTime,
                                instruction: instruction.text
                            }
                        }));
                    });
                }
                
                // Center map on user location
                function centerOnLocation() {
                    if (!userMarker) return;
                    
                    map.setView(userMarker.getLatLng(), 18, {
                        animate: true,
                        duration: 0.5
                    });
                }
                
                // Exit navigation
                function exitNavigation() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'exitNavigation'
                    }));
                }
                
                // Return to main map
                function returnToMainMap() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'returnToMainMap'
                    }));
                }
            </script>
        </body>
        </html>
    `;

    return isLoading ? (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text size="md" className="mt-2">Memulai Navigasi...</Text>
        </View>
    ) : (
        <View style={StyleSheet.absoluteFill}>
            <WebView
                ref={webViewRef}
                source={{ html: navigationHTML }}
                style={StyleSheet.absoluteFill}
                onMessage={handleWebViewMessage}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                geolocationEnabled={true}
            />
        </View>
    );
};

const HomeScreen = () => {
    const [destination, setDestination] = useState<{ latitude: number, longitude: number } | null>(null); // Untuk marker destinasi
    const [address, setAddress] = useState<string | null>(null); // Untuk menyimpan alamat lengkap
    const [mqttData, setMqttData] = useState<any>(null);
    const [bottomSheetOpen, setBottomSheetOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'location' | 'sensor'>('location');
    const [sensorData, setSensorData] = useState<SensorData>({
        accel_x: 0,
        accel_y: 0,
        accel_z: 0,
        ph: 7,
        turbidity: 0,
        temperature: 0,
        speed: 0,
    });
    const socketRef = useRef<Socket | null>(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);
    const [showAddressDialog, setShowAddressDialog] = useState(false);
    const [dialogContent, setDialogContent] = useState({
        nama_sungai: '',
        address: '',
        latitude: 0,
        longitude: 0
    });
    const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null); // Change to single location
    const [locations, setLocations] = useState<SavedLocation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [locationsError, setLocationsError] = useState('');

    // Tambah ref untuk input
    const riverNameInputRef = useRef<TextInput>(null);

    // Add toast hook after state declarations
    const toast = useToast();

    const GEOFENCE_TASK = 'geofence-monitoring';

    const { isServiceRunning, startService, stopService } = useForegroundService(sensorData);

    // Tambahkan setup react-hook-form
    const { control, handleSubmit, setValue, formState: { errors }, reset } = useForm({
        defaultValues: {
            nama_sungai: '',
            address: ''
        }
    });

    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = io(port, {
                transports: ['websocket'],
                reconnectionAttempts: 5,
                timeout: 10000,
            });

            socketRef.current.on('connect', () => {
                toast.show({
                    placement: 'top',
                    duration: 3000,
                    render: ({ id }) => (
                        <Toast nativeID={"toast-" + id} action="success" variant="solid">
                            <ToastTitle>Connected</ToastTitle>
                            <ToastDescription>Successfully connected to server</ToastDescription>
                        </Toast>
                    ),
                });
            });

            socketRef.current?.on('mqttData', (data: any) => {
                console.log('📩 Data MQTT diterima:', data);
                if (data?.message) {
                    setSensorData({
                        accel_x: data.message.accel_x || 0,
                        accel_y: data.message.accel_y || 0,
                        accel_z: data.message.accel_z || 0,
                        ph: data.message.ph || 7,
                        turbidity: data.message.turbidity || 0,
                        temperature: data.message.temperature || 0,
                        speed: data.message.speed || 0,
                    });
                }
                // console.log({ sensorData });
                // console.log(data.message);
                // console.log(data.message.accel_x);
                setMqttData({ ...data });
                if (!data.isStart) {
                    setDestination(null);
                    setAddress(null);
                }
            });

            socketRef.current.on('disconnect', () => {
                toast.show({
                    placement: 'top',
                    duration: 3000,
                    render: ({ id }) => (
                        <Toast nativeID={"toast-" + id} action="error" variant="solid">
                            <ToastTitle>Disconnected</ToastTitle>
                            <ToastDescription>Lost connection to server</ToastDescription>
                        </Toast>
                    ),
                });
            });

            // Tambahkan event listener untuk mengirim lokasi yang tersimpan
            if (savedLocation) {
                socketRef.current.emit('updateLocation', {
                    id_lokasi: savedLocation.id_lokasi,
                    nama_sungai: savedLocation.nama_sungai,
                    alamat: savedLocation.address,
                    latitude: savedLocation.latitude,
                    longitude: savedLocation.longitude
                });
            }
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [savedLocation]); // Tambahkan savedLocation ke dependency array

    // Fungsi untuk melakukan reverse geocoding (mengambil alamat dari lat dan lon)
    const fetchAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
        try {
            const response = await fetch(
                `${NOMINATIM_REVERSE_URL}lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'WaterSensorApp/1.0 (your-contact-email@example.com)'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Periksa error dari API Nominatim
            if (data.error) {
                setAddress(data.error);
                return null;
            }

            if (data?.display_name) {
                const newAddress = data.display_name;
                setAddress(newAddress);
                return newAddress;
            } else {
                setAddress("Alamat tidak ditemukan");
                return null;
            }
        } catch (error) {
            console.error('Gagal fetch alamat:', error);
            setAddress("Gagal memuat alamat. Coba lagi beberapa saat.");
            return null;
        }
    };

    // Event handler untuk klik di peta
    const handleMapPress = async (coordinates: [number, number]) => {
        const latitude = coordinates[0];
        const longitude = coordinates[1];
        setDestination({ latitude, longitude });

        setIsFetchingAddress(true);
        const fetchedAddress = await fetchAddressFromCoordinates(latitude, longitude);
        setIsFetchingAddress(false);

        // Set konten dialog
        setDialogContent({
            nama_sungai: '',
            address: fetchedAddress || address || 'Alamat tidak diketahui',
            latitude,
            longitude
        });
        setShowAddressDialog(true);

        requestAnimationFrame(() => {
            setTimeout(() => {
                riverNameInputRef.current?.focus();
            }, 3000);
        });
    };

    const zoomToGeoJSONFuncRef = useRef<() => void>();

    const getCurrentLocationFuncRef = useRef<() => void>();

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                setShowExitModal(true);
                return true;
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                BackHandler.removeEventListener('hardwareBackPress', onBackPress);
            };
        }, [])
    );

    // Fungsi generate ID
    const generateLocationId = () => {
        return Math.floor(1000000 + Math.random() * 9000000); // 7-digit random number
    };

    // Pertahankan logic yang sudah ada, hanya ubah cara akses value
    useEffect(() => {
        if (dialogContent.address) {
            setValue('address', dialogContent.address);
        }
        // Reset nama_sungai saat dialog terbuka
        setValue('nama_sungai', '');
    }, [dialogContent.address, showAddressDialog]);

    // Modifikasi handleSaveLocation
    const handleSaveLocation = async () => {
        // Validasi nama sungai terlebih dahulu
        if (!control._formValues.nama_sungai || control._formValues.nama_sungai.trim() === '') {
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="error">
                        <ToastTitle>Nama Lokasi Dibutuhkan</ToastTitle>
                        <ToastDescription>Silakan isi nama lokasi sungai</ToastDescription>
                    </Toast>
                )
            });
            riverNameInputRef.current?.focus();
            return;
        }

        try {
            const formValues = control._formValues;
            const postData = {
                id_lokasi: generateLocationId(),
                nama_sungai: formValues.nama_sungai,
                alamat: formValues.address || dialogContent.address,
                lat: Number(dialogContent.latitude),
                lon: Number(dialogContent.longitude),
                tanggal: new Date().toISOString()
            };

            const response = await fetch(`${port}data_lokasi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal menyimpan lokasi');
            }

            const responseData = await response.json();

            setSavedLocation({
                id_lokasi: postData.id_lokasi,
                nama_sungai: postData.nama_sungai,
                address: postData.alamat,
                latitude: postData.lat,
                longitude: postData.lon
            });

            // Tambahkan toast sukses
            toast.show({
                placement: 'top',
                duration: 3000,
                render: ({ id }) => (
                    <Toast nativeID={"toast-" + id} action="success" variant="solid">
                        <ToastTitle>Berhasil</ToastTitle>
                        <ToastDescription>Lokasi monitoring berhasil ditambahkan</ToastDescription>
                    </Toast>
                ),
            });

            // Reset form setelah sukses
            reset({
                nama_sungai: '',
                address: ''
            });

            // Tutup dialog
            setShowAddressDialog(false);

            // Setelah menyimpan, kirim lokasi ke server
            if (socketRef.current) {
                socketRef.current.emit('updateLocation', {
                    id_lokasi: postData.id_lokasi,
                    nama_sungai: postData.nama_sungai,
                    alamat: postData.alamat,
                    latitude: postData.lat.toString(),
                    longitude: postData.lon.toString()
                });

                // Tambahkan listener untuk konfirmasi
                socketRef.current.on('locationUpdated', (confirmation) => {
                    console.log('Location update confirmed:', confirmation);
                });
            }
        } catch (error) {
            console.error('Error:', error);

            // Ganti alert dengan toast error yang lebih baik
            toast.show({
                placement: 'top',
                duration: 4000,
                render: ({ id }) => (
                    <Toast nativeID={"toast-" + id} action="error" variant="solid">
                        <ToastTitle>Gagal Menyimpan</ToastTitle>
                        <ToastDescription>{(error as Error).message || 'Terjadi kesalahan saat menyimpan lokasi'}</ToastDescription>
                    </Toast>
                ),
            });
        }
    };

    // Tambahkan fungsi untuk menutup dan me-reset form
    const handleCloseAddressDialog = () => {
        reset({
            nama_sungai: '',
            address: ''
        });
        setShowAddressDialog(false);
    };

    // Update delete handler
    const handleDeleteLocation = () => {
        // Kirim event clear location ke server
        if (socketRef.current) {
            socketRef.current.emit('clearLocation');
        }

        setSavedLocation(null);
        toast.show({
            placement: 'top',
            render: () => (
                <Toast>
                    <ToastTitle>Lokasi berhasil dihapus</ToastTitle>
                </Toast>
            )
        });

        //
    };

    const webViewRef = useRef<any>(null);

    useEffect(() => {
        // Fetch initial saved location
        const fetchInitialLocation = async () => {
            try {
                const response = await fetch(`${port}getcurrentdata`);
                const result = await response.json();

                if (result.success && result.data.id_lokasi) {
                    // Fetch address from coordinates
                    const address = await fetchAddressFromCoordinates(
                        result.data.latitude,
                        result.data.longitude
                    );

                    setSavedLocation({
                        id_lokasi: result.data.id_lokasi,
                        nama_sungai: result.data['nama_sungai'], // Nama sungai tidak tersedia di response, bisa diisi manual
                        address: address || 'Alamat tidak diketahui',
                        latitude: result.data.latitude,
                        longitude: result.data.longitude
                    });
                }
            } catch (error) {
                console.error('Gagal memuat lokasi awal:', error);
                setSavedLocation(null);
            }
        };

        fetchInitialLocation();
    }, []); // Empty dependency array untuk eksekusi sekali saat mount

    const renderSpeedometer = ({ item }: { item: SensorConfig }) => {
        // Tambahkan default value 0 jika data tidak ada
        const currentValue = sensorData[item.id as keyof typeof sensorData] ?? 0;

        // Pastikan nilai dalam range min-max
        const clampedValue = Math.max(item.min, Math.min(item.max, currentValue));

        const activeThreshold = item.thresholds.findLast(t => clampedValue >= t.value) || item.thresholds[0];

        return (
            <View style={styles.speedometerContainer}>
                <Text style={styles.sensorTitle}>{item.name}</Text>
                <Speedometer
                    value={clampedValue}
                    totalValue={item.max}
                    size={140}
                    outerColor="#f1f5f9"
                    internalColor={activeThreshold.color}
                    showText={true}
                    showLabels={false}
                    showPercent={false}
                    text={`${clampedValue.toFixed(2)}`}
                    textStyle={[styles.speedometerText, { marginTop: -10 }]}
                    labelStyle={styles.speedometerLabel}
                // style={{ marginVertical: 8 }}
                />
                <Text style={styles.speedometerLabel}>{item.unit}</Text>
                <Text style={styles.statusText}>
                    {activeThreshold.label}
                </Text>
            </View>
        );
    };

    const mapRef = useRef<{ zoomToLocation: (lat: number, lon: number) => void }>(null);

    // Tambahkan useEffect untuk handle pemilihan lokasi dari peta
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('message', (event) => {
            if (event.data?.type === 'locationSelected') {
                const locationData = JSON.parse(event.data.data);
                handleSelectExistingLocation(locationData);
            }
        });

        return () => subscription.remove();
    }, []);

    const handleSelectExistingLocation = (locationData: any) => {
        try {
            // Perbaikan validasi data
            if (!locationData ||
                typeof locationData.latitude === 'undefined' ||
                typeof locationData.longitude === 'undefined') {
                console.error('Data lokasi tidak valid:', locationData);
                return;
            }

            // Perbaikan parsing koordinat
            const lat = parseFloat(locationData.latitude);
            const lon = parseFloat(locationData.longitude);

            // Perbaikan inisialisasi alamat
            const newLocation = {
                id_lokasi: locationData.id_lokasi,
                nama_sungai: locationData.nama_sungai || 'Lokasi Sungai',
                address: locationData.address || 'Alamat tidak tersedia',
                latitude: lat,
                longitude: lon
            };
            console.log({ newLocation })

            setSavedLocation(newLocation);
            setDestination({
                latitude: lat,
                longitude: lon
            });

            // Perbaikan pemanggilan API dengan data yang valid
            if (socketRef.current) {
                socketRef.current.emit('updateLocation', {
                    id_lokasi: newLocation.id_lokasi,
                    nama_sungai: newLocation.nama_sungai,
                    alamat: newLocation.address,
                    latitude: lat.toString(),
                    longitude: lon.toString()
                });
            }

            // Perbaikan toast dengan data yang benar
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="success">
                        <ToastTitle>Lokasi monitoring dipilih!</ToastTitle>
                        <ToastDescription>{newLocation.nama_sungai}</ToastDescription>
                    </Toast>
                )
            });



            // Perbaikan fetch alamat
            // fetchAddressFromCoordinates(lat, lon)
            //     .catch(error => console.error('Gagal mengambil alamat:', error));

        } catch (error) {
            console.error('Error handling location selection:', error);
        }
    };

    // Add filtered locations calculation
    const filteredLocations = locations.filter(loc =>
        loc.nama_sungai.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.latitude.toString().includes(searchQuery) ||
        loc.longitude.toString().includes(searchQuery) ||
        loc.id_lokasi.toString().includes(searchQuery)
    );

    // Add useEffect for fetching locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setIsLoadingLocations(true);
                const response = await fetch(`${port}data_lokasi`);

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorBody}`);
                }

                const data = await response.json();
                // console.log('API Response:', data); // Periksa response di console

                if (!Array.isArray(data)) {
                    throw new Error(`Format data tidak valid. Diterima: ${typeof data}`);
                }
                const validatedData = data.map((item: any) => ({
                    id_lokasi: Number(item.id_lokasi),
                    nama_sungai: item.nama_sungai || item.nama || 'Nama Tidak Tersedia',
                    address: item.alamat || item.lokasi || item.address || 'Alamat Tidak Tersedia',
                    latitude: Number(item.latitude || item.lat),
                    longitude: Number(item.longitude || item.lng || item.lon)
                }));
                setLocations(validatedData);
                setLocationsError('');
            } catch (error) {
                console.error('Fetch error:', error);
                setLocationsError('Gagal memuat daftar lokasi. Coba lagi nanti.');
            } finally {
                setIsLoadingLocations(false);
            }
        };

        // if (showSavedLocationsDialog) {
        fetchLocations();
        // }
    }, []);

    useEffect(() => {
        if (mqttData) {
            startService();
            // Update sensor data for background notifications

        } else {
            stopService();
        }
    }, [mqttData, sensorData]);

    // Tambahkan state untuk drawer
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Add state for navigation
    const [navigationDestination, setNavigationDestination] = useState<{
        latitude: number;
        longitude: number;
        name: string;
        address?: string;
    } | null>(null);

    const [isNavigating, setIsNavigating] = useState(false);

    // Add function to start navigation
    const startNavigation = () => {
        if (!savedLocation) return;

        // Validate coordinates
        const latitude = parseFloat(String(savedLocation.latitude));
        const longitude = parseFloat(String(savedLocation.longitude));

        if (isNaN(latitude) || isNaN(longitude)) {
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="error">
                        <ToastTitle>Error Navigasi</ToastTitle>
                        <ToastDescription>Koordinat tujuan tidak valid</ToastDescription>
                    </Toast>
                )
            });
            return;
        }

        setNavigationDestination({
            latitude,
            longitude,
            name: savedLocation.nama_sungai || 'Lokasi Monitoring',
            address: savedLocation.address
        });
        setIsNavigating(true);
        setBottomSheetOpen(false);
    };

    // Add function to close navigation
    const closeNavigation = () => {
        setIsNavigating(false);
        setNavigationDestination(null);
    };

    // Add function to minimize navigation (return to map)
    const minimizeNavigation = () => {
        setIsNavigating(false);
        // Keep navigation destination so we can restore it later if needed
    };

    return (
        <>
            {/* Tambahkan CustomDrawer dengan style spesifik untuk memastikan di depan semua komponen */}
            <SafeAreaView style={styles.container}>
                {isFetchingAddress && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#ea5757" />
                        <Text size="md" className="mt-2">Mengambil alamat...</Text>
                    </View>
                )}

                <Map
                    ref={mapRef}
                    onInitialized={(zoomToGeoJSON) =>
                        (zoomToGeoJSONFuncRef.current = zoomToGeoJSON)
                    }
                    onMapPress={handleMapPress}
                    onLocationSelect={handleSelectExistingLocation}
                    onGetCurrentLocation={(getCurrentLocationFunc) =>
                        (getCurrentLocationFuncRef.current = getCurrentLocationFunc)
                    }
                />
            </SafeAreaView>



            <Fab
                size="sm"
                isHovered={false}
                isDisabled={false}
                isPressed={true}
                onPress={() => getCurrentLocationFuncRef.current?.()}
                placement='bottom left'
                style={{
                    backgroundColor: 'white',
                    position: 'absolute',
                    bottom: 120,
                    left: 25,
                    zIndex: 0,
                }}
            >
                <AntDesign name="team" size={35} color="#ea5757" />
            </Fab>

            {/* FAB untuk zoom ke IOT device */}
            <Fab
                size="sm"
                isHovered={false}
                isDisabled={!mqttData?.message}
                isPressed={true}
                onPress={() => {
                    if (!mqttData?.message?.latitude || !mqttData?.message?.longitude) {
                        toast.show({
                            placement: "top",
                            render: ({ id }) => (
                                <Toast nativeID={"toast-" + id} action="warning" variant="solid">
                                    <ToastTitle>Perangkat IOT belum aktif</ToastTitle>
                                    <ToastDescription>Silakan tunggu data GPS dari perangkat</ToastDescription>
                                </Toast>
                            ),
                        });
                        return;
                    }
                    mapRef.current?.zoomToLocation(
                        Number(mqttData.message.latitude),
                        Number(mqttData.message.longitude)
                    );
                }}
                placement='bottom left'
                style={{
                    backgroundColor: 'white',
                    position: 'absolute',
                    bottom: 180,
                    left: 25,
                    zIndex: 0,
                }}
            >
                <AntDesign name="rocket1" size={35} color="#ea5757" />
            </Fab>

            {/* Combined Bottom Sheet */}
            <BottomSheet snapToIndex={bottomSheetOpen ? 0 : 1} onOpen={() => setBottomSheetOpen(true)} onClose={() => setBottomSheetOpen(false)}>
                <Fab
                    size="sm"
                    isHovered={false}
                    isDisabled={false}
                    isPressed={true}
                    onPress={() => setBottomSheetOpen(true)}
                    placement='bottom right'
                    style={{ backgroundColor: 'white', bottom: 120, right: 25, zIndex: 0 }}
                >
                    <BottomSheetTrigger>
                        <AntDesign name={activeTab === 'location' ? "enviromento" : "piechart"} size={35} color="#ea5757" />
                    </BottomSheetTrigger>
                </Fab>

                <BottomSheetPortal
                    snapPoints={["30%", "70%", "100%"]}
                    snapToIndex={bottomSheetOpen ? 1 : 0}
                    onClose={() => setBottomSheetOpen(false)}
                    enablePanDownToClose={true}
                    backdropComponent={BottomSheetBackdrop}
                    handleComponent={BottomSheetDragIndicator}
                    style={{ zIndex: 1000, elevation: 1000 }}
                >
                    <AnimatePresence>
                        {bottomSheetOpen && (
                            <MotiView
                                from={{
                                    opacity: 0,
                                    scale: 0.9,
                                    translateY: 50
                                }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    translateY: 0
                                }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.9,
                                    translateY: 50
                                }}
                                transition={{ type: 'timing', duration: 300 }}
                                style={{ flex: 1 }}
                            >
                                <SafeAreaView style={{ flex: 1, zIndex: 1000, elevation: 1000 }}>
                                    {/* Toggle Switch */}
                                    <View style={styles.toggleContainer}>
                                        <View style={styles.toggleBackground}>
                                            <MotiView
                                                animate={{
                                                    translateX: activeTab === 'location' ? 0 : '100%',
                                                }}
                                                transition={{
                                                    type: 'timing',
                                                    duration: 300,
                                                }}
                                                style={styles.activeTabIndicator}
                                            />
                                        </View>
                                        <BottomSheetItem
                                            style={[styles.toggleTab, activeTab === 'location' ? styles.activeToggleTab : null]}
                                            onPress={() => setActiveTab('location')}
                                            closeOnSelect={false}
                                        >
                                            <MotiView
                                                animate={{
                                                    scale: activeTab === 'location' ? 1 : 0.9,
                                                }}
                                                transition={{ type: 'timing', duration: 200 }}
                                                style={styles.toggleButton}
                                            >
                                                <AntDesign
                                                    name="enviromento"
                                                    size={20}
                                                    color={activeTab === 'location' ? "#ea5757" : "#64748b"}
                                                />
                                                <BottomSheetItemText
                                                    style={[
                                                        styles.toggleText,
                                                        activeTab === 'location' ? styles.activeToggleText : null
                                                    ]}
                                                >
                                                    Lokasi Monitoring
                                                </BottomSheetItemText>
                                            </MotiView>
                                        </BottomSheetItem>
                                        <BottomSheetItem
                                            style={[styles.toggleTab, activeTab === 'sensor' ? styles.activeToggleTab : null]}
                                            onPress={() => setActiveTab('sensor')}
                                            closeOnSelect={false}
                                        >
                                            <MotiView
                                                animate={{
                                                    scale: activeTab === 'sensor' ? 1 : 0.9,
                                                }}
                                                transition={{ type: 'timing', duration: 200 }}
                                                style={styles.toggleButton}
                                            >
                                                <AntDesign
                                                    name="dashboard"
                                                    size={20}
                                                    color={activeTab === 'sensor' ? "#ea5757" : "#64748b"}
                                                />
                                                <BottomSheetItemText
                                                    style={[
                                                        styles.toggleText,
                                                        activeTab === 'sensor' ? styles.activeToggleText : null
                                                    ]}
                                                >
                                                    Data Sensor
                                                </BottomSheetItemText>
                                            </MotiView>
                                        </BottomSheetItem>
                                    </View>

                                    <BottomSheetScrollView nestedScrollEnabled={true} style={{ zIndex: 1000, elevation: 1000 }}>
                                        <BottomSheetContent>
                                            {activeTab === 'location' ? (
                                                <>
                                                    <View style={styles.searchContainer}>
                                                        <TextInput
                                                            placeholder="Cari lokasi..."
                                                            placeholderTextColor="#94a3b8"
                                                            style={styles.searchInput}
                                                            onChangeText={(text) => setSearchQuery(text)}
                                                            value={searchQuery}
                                                        />
                                                        <AntDesign name="search1" size={20} color="#64748b" style={styles.searchIcon} />
                                                    </View>
                                                    {!savedLocation ? (
                                                        <Center className="py-8">
                                                            <Text size="sm" className=" text-red-700">
                                                                Belum ada lokasi monitoring terpasang
                                                            </Text>
                                                            <Text size="sm" className=" text-red-700">
                                                                Silahkan tambahkan lokasi monitoring terlebih dahulu
                                                            </Text>
                                                        </Center>
                                                    ) : (
                                                        <View style={styles.locationCard}>
                                                            <View style={styles.locationHeader}>
                                                                <AntDesign name="enviromento" size={24} color="#3b82f6" />
                                                                <Text style={styles.locationTitle} className='text-emerald-300'>
                                                                    {savedLocation.nama_sungai || "Lokasi Sungai"} <Text className='text-blue-600'> (Lokasi Monitoring) </Text>
                                                                </Text>
                                                            </View>

                                                            <View style={styles.locationDetail}>
                                                                <AntDesign name="infocirlceo" size={14} color="#64748b" />
                                                                <Text style={styles.detailText}>{savedLocation.address}</Text>
                                                            </View>

                                                            <View style={styles.coordinateBadge}>
                                                                <AntDesign name="earth" size={14} color="#64748b" />
                                                                <HStack className=" flex-col ms-3">
                                                                    <Text style={styles.coordinateText}>
                                                                        Latitude : {savedLocation?.latitude?.toFixed?.(6) ?? 'N/A'}
                                                                    </Text>
                                                                    <Text style={styles.coordinateText}>
                                                                        Longitude : {savedLocation?.longitude?.toFixed?.(6) ?? 'N/A'}
                                                                    </Text>
                                                                </HStack>
                                                            </View>

                                                            <HStack className="gap-2 mt-4">
                                                                <BottomSheetItem
                                                                    style={styles.outlineButton}
                                                                    closeOnSelect={false}
                                                                    onPress={handleDeleteLocation}
                                                                >
                                                                    <BottomSheetItemText style={styles.outlineButtonText}>
                                                                        Hapus Lokasi
                                                                    </BottomSheetItemText>
                                                                </BottomSheetItem>

                                                                <BottomSheetItem
                                                                    style={styles.locationButton}
                                                                    closeOnSelect={true}
                                                                    onPress={() => {
                                                                        if (savedLocation) {
                                                                            mapRef.current?.zoomToLocation(
                                                                                savedLocation.latitude,
                                                                                savedLocation.longitude
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    <BottomSheetItemText style={styles.locationButtonText}>
                                                                        Lihat Lokasi
                                                                    </BottomSheetItemText>
                                                                </BottomSheetItem>
                                                            </HStack>

                                                            {/* Add navigation button here */}
                                                            <BottomSheetItem
                                                                style={styles.navigationButton}
                                                                closeOnSelect={true}
                                                                onPress={startNavigation}
                                                            >
                                                                <MaterialIcons name="navigation" size={18} color="white" style={{ marginRight: 6 }} />
                                                                <BottomSheetItemText style={styles.navigationButtonText}>
                                                                    Navigasi ke Lokasi
                                                                </BottomSheetItemText>
                                                            </BottomSheetItem>
                                                        </View>
                                                    )}
                                                    {isLoadingLocations ? (
                                                        <Center className="py-8">
                                                            <ActivityIndicator size="large" color="#3b82f6" />
                                                            <Text className="mt-2 text-typography-500">Memuat daftar lokasi...</Text>
                                                        </Center>
                                                    ) : locationsError ? (
                                                        <Center className="py-8">
                                                            <AntDesign name="warning" size={24} color="#ef4444" />
                                                            <Text className="mt-2 text-danger-500">{locationsError}</Text>
                                                        </Center>
                                                    ) : (
                                                        <FlatList
                                                            data={filteredLocations.filter(loc => loc.id_lokasi !== savedLocation?.id_lokasi)}
                                                            ListHeaderComponent={<Text className="text-blue-600 text-center pb-3">
                                                                <Divider className='bg-emerald-300 my-2' />
                                                                Lokasi Lainnya </Text>}
                                                            ListFooterComponent={<View style={{
                                                                height: 150,
                                                            }}></View>}
                                                            scrollEnabled={false}
                                                            keyExtractor={(item) => item.id_lokasi.toString()}
                                                            renderItem={({ item }) => (
                                                                <View style={styles.locationCard}>
                                                                    <View style={styles.cardHeader}>
                                                                        <AntDesign name="enviromento" size={20} color="#3b82f6" />
                                                                        <Text style={styles.locationName}>{item.nama_sungai}</Text>
                                                                    </View>
                                                                    <View style={styles.locationDetail}>
                                                                        <AntDesign name="infocirlceo" size={14} color="#64748b" />
                                                                        <Text style={styles.detailText}>{item.address}</Text>
                                                                    </View>
                                                                    <View style={styles.coordinateBadge}>
                                                                        <AntDesign name="pushpino" size={14} color="#64748b" />
                                                                        <HStack className=" flex-col ms-3">
                                                                            <Text style={styles.coordinateText}>
                                                                                Latitude : {item?.latitude?.toFixed?.(6) ?? 'N/A'}
                                                                            </Text>
                                                                            <Text style={styles.coordinateText}>
                                                                                Longitude : {item?.longitude?.toFixed?.(6) ?? 'N/A'}
                                                                            </Text>
                                                                        </HStack>
                                                                    </View>
                                                                    <HStack className="">
                                                                        <BottomSheetItem
                                                                            style={styles.actionButton}
                                                                            closeOnSelect={false}
                                                                            onPress={() => handleSelectExistingLocation(item)}
                                                                        >
                                                                            <BottomSheetItemText style={styles.actionButtonText}>
                                                                                Set sebagai Monitoring
                                                                            </BottomSheetItemText>
                                                                        </BottomSheetItem>

                                                                        <BottomSheetItem
                                                                            style={styles.outlineButton}
                                                                            closeOnSelect={true}
                                                                            onPress={() => {
                                                                                if (item) {
                                                                                    mapRef.current?.zoomToLocation(
                                                                                        item.latitude,
                                                                                        item.longitude
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            <BottomSheetItemText style={styles.outlineButtonText}>
                                                                                Lihat di Peta
                                                                            </BottomSheetItemText>
                                                                        </BottomSheetItem>
                                                                    </HStack>

                                                                    {/* Navigation button for other locations */}
                                                                    <BottomSheetItem
                                                                        style={styles.navigationButton}
                                                                        closeOnSelect={true}
                                                                        onPress={() => {
                                                                            // Navigate to this specific location
                                                                            setNavigationDestination({
                                                                                latitude: item.latitude,
                                                                                longitude: item.longitude,
                                                                                name: item.nama_sungai || 'Lokasi Sungai',
                                                                                address: item.address
                                                                            });
                                                                            setIsNavigating(true);
                                                                            setBottomSheetOpen(false);
                                                                        }}
                                                                    >
                                                                        <MaterialIcons name="navigation" size={18} color="white" style={{ marginRight: 6 }} />
                                                                        <BottomSheetItemText style={styles.navigationButtonText}>
                                                                            Navigasi ke Lokasi
                                                                        </BottomSheetItemText>
                                                                    </BottomSheetItem>
                                                                </View>
                                                            )}
                                                            contentContainerStyle={styles.listContent}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                /* Sensor Data View */
                                                <>
                                                    <RealTimeClock />
                                                    <FlatList
                                                        scrollEnabled={false}
                                                        data={sensorConfigs}
                                                        renderItem={renderSpeedometer}
                                                        keyExtractor={item => item.id}
                                                        numColumns={2}
                                                        contentContainerStyle={styles.listContent}
                                                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                                                    />
                                                    <View style={{ height: 100 }}></View>
                                                </>
                                            )}
                                        </BottomSheetContent>
                                    </BottomSheetScrollView>
                                </SafeAreaView>
                            </MotiView>
                        )}
                    </AnimatePresence>
                </BottomSheetPortal>
            </BottomSheet >

            <Modal
                isOpen={showExitModal}
                onClose={() => setShowExitModal(false)}
                size="md"
            >
                <ModalBackdrop />
                <ModalContent>
                    <ModalHeader>
                        <Heading size="md" className="text-typography-950">
                            ⚠️ Yakin Mau Keluar?
                        </Heading>
                        <ModalCloseButton onPress={() => setShowExitModal(false)}>
                            <Icon
                                as={CloseIcon}
                                size="md"
                                className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700"
                            />
                        </ModalCloseButton>
                    </ModalHeader>
                    <ModalBody>
                        <Text size="sm" className="text-typography-500">
                            Aplikasi pemantauan kualitas air akan ditutup. Data real-time sensor sungai tidak akan terupdate jika aplikasi ditutup.
                        </Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="outline"
                            action="secondary"
                            onPress={() => setShowExitModal(false)}
                        >
                            <ButtonText>Lanjutkan Pantau</ButtonText>
                        </Button>
                        <Button
                            onPress={() => BackHandler.exitApp()}
                        >
                            <ButtonText style={{ color: 'white' }}>Ya, Keluar</ButtonText>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <Modal
                isOpen={showAddressDialog}
                onClose={handleCloseAddressDialog}
                size="md"
            >
                <ModalBackdrop />
                <ModalContent>
                    <ModalHeader className="pb-2">
                        <View className="flex-row items-center gap-3">
                            <AntDesign name="enviroment" size={24} color="#3b82f6" />
                            <View>
                                <Heading size="md" className="text-typography-950 font-bold">
                                    Tambah Lokasi Monitoring
                                </Heading>
                                <Text size="sm" className="text-typography-500 mt-1">
                                    Pilih titik di peta atau masukkan manual
                                </Text>
                            </View>
                        </View>
                        <ModalCloseButton onPress={handleCloseAddressDialog}>
                            <Icon
                                as={CloseIcon}
                                size="md"
                                className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700"
                            />
                        </ModalCloseButton>
                    </ModalHeader>
                    <ModalBody className="mt-3 mb-4">
                        <View className="gap-3">
                            <View>
                                <Text className="text-sm text-typography-600 mb-1.5">
                                    Nama Lokasi <Text className="text-red-500">*</Text>
                                </Text>
                                <Controller
                                    control={control}
                                    name="nama_sungai"
                                    rules={{ required: "Nama lokasi harus diisi" }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View>
                                            <TextInput
                                                ref={riverNameInputRef}
                                                style={[
                                                    styles.inputImproved,
                                                    errors.nama_sungai ? { borderColor: '#ef4444', borderWidth: 1.5 } : {}
                                                ]}
                                                placeholder="Contoh: Kali Ciliwung Depok"
                                                placeholderTextColor="#94a3b8"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                                autoFocus
                                            />
                                            {errors.nama_sungai && (
                                                <Text className="text-red-500 text-xs mt-1 ml-1">
                                                    {errors.nama_sungai.message}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                />
                            </View>

                            <View>
                                <Text className="text-sm text-typography-600 mb-1.5">Alamat Lengkap</Text>
                                <Controller
                                    control={control}
                                    name="address"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.inputImproved, styles.multilineInput]}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            placeholder="Alamat akan otomatis terisi dari koordinat peta"
                                            placeholderTextColor="#94a3b8"
                                            multiline={true}
                                            numberOfLines={4}
                                        />
                                    )}
                                />
                            </View>

                            <View className="flex-row gap-3">
                                <View style={styles.coordinateBadge}>
                                    <AntDesign name="pushpino" size={14} color="#64748b" />
                                    <Text style={styles.coordinateText}>
                                        {dialogContent.latitude.toFixed(6)}
                                    </Text>
                                </View>
                                <View style={styles.coordinateBadge}>
                                    <AntDesign name="pushpino" size={14} color="#64748b" />
                                    <Text style={styles.coordinateText}>
                                        {dialogContent.longitude.toFixed(6)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ModalBody>
                    <ModalFooter className="mt-2">
                        <View style={styles.footerButtonContainer}>
                            <Button
                                variant="outline"
                                onPress={handleCloseAddressDialog}
                                size="sm"
                                className="flex-1"
                            >
                                <ButtonText>Batal</ButtonText>
                            </Button>
                            <Button
                                onPress={handleSubmit(handleSaveLocation)}
                                size="sm"
                                className="flex-1 bg-emerald-600"
                            >
                                <AntDesign name="save" size={16} color="white" style={{ marginRight: 8 }} />
                                <ButtonText>Simpan Lokasi</ButtonText>
                            </Button>
                        </View>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            {/* <NotificationComponent
                isRunning={isServiceRunning}
                sensorData={sensorData}
            /> */}

            {/* Navigation Layer - now uses our internal component */}
            {isNavigating && navigationDestination && (
                <NavigationScreen
                    destination={navigationDestination}
                    onClose={closeNavigation}
                    onReturn={minimizeNavigation}
                />
            )}

        </>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },

    // Loading
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
    },

    // Navigation Button
    navigationButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        flexDirection: 'row',
    },
    navigationButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },

    // Search
    searchBox: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1000,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#334155',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },

    // Bottom Sheet
    bottomSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 8,
    },
    indicator: {
        width: 40,
        height: 4,
        backgroundColor: '#e2e8f0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 8,
    },

    // Location
    locationCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    locationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 12,
        color: '#1f2937',
    },
    locationDetail: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    detailText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#64748b',
        flex: 1,
    },
    coordinateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    coordinateText: {
        fontSize: 13,
        color: '#64748b',
        marginLeft: 3,
    },

    // Buttons
    locationButton: {
        flex: 1,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    outlineButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        backgroundColor: 'transparent',
    },
    outlineButtonText: {
        color: '#374151',
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#10b981',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
    },

    // Lists
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        color: '#1f2937',
    },

    // Sensor UI
    speedometerContainer: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sensorTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
        color: '#1f2937',
    },
    speedometerText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    speedometerLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
        marginTop: 8,
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#3b82f6',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    toggleContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginVertical: 12,
        height: 50,
        position: 'relative',
        zIndex: 10,
    },
    toggleBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f1f5f9',
        borderRadius: 30,
        overflow: 'hidden',
    },
    activeTabIndicator: {
        position: 'absolute',
        top: 4,
        left: 4,
        width: '48%',
        height: 42,
        backgroundColor: 'white',
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.5,
        elevation: 2,
    },
    toggleTab: {
        flex: 1,
        borderRadius: 25,
        paddingVertical: 12,
        zIndex: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    activeToggleText: {
        color: '#ea5757',
        fontWeight: '600',
    },
    activeToggleTab: {
        // Just for consistency, not actually needed for styling since indicator is separate
    },
    inputImproved: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1e293b',
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    footerButtonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
});