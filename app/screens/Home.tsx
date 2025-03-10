import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Alert, TextInput, FlatList, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator, Platform, LogBox, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { Marker } from 'react-native-maps'; // Import Marker
import { BottomSheet, BottomSheetBackdrop, BottomSheetContent, BottomSheetDragIndicator, BottomSheetPortal, BottomSheetScrollView, BottomSheetTrigger } from '@/components/ui/bottomsheet';
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
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { calculateDistance } from '@/utils/geoUtils'; // Fungsi hitung jarak
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Speedometer from 'react-native-speedometer-chart';
import { HStack } from '@/components/ui/hstack';
import { DeviceEventEmitter } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse?";

const data = [{
    title: 'accel_x',
    name: 'Accel X',
    color: 'orange',
    max: 100,
    suffix: " ms2"
}, {
    title: 'accel_y',
    name: 'Accel Y',
    color: 'tomato',
    max: 100,
    suffix: " ms2"
}, {
    title: 'accel_z',
    name: 'Accel Z',
    color: 'red',
    max: 100,
    suffix: " ms2"
}, {
    title: 'ph',
    name: 'pH',
    color: 'blue',
    max: 14,
    suffix: " pH"
}, {
    title: 'turbidity',
    name: 'Turbidity',
    color: 'lime',
    max: 100,
    suffix: " NTU"
}, {
    title: 'temperature',
    name: 'Temperature',
    color: 'cyan',
    max: 100,
    suffix: " °C"
},]

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
        name: 'Kecepatan Air',
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

const HomeScreen = () => {
    const [destination, setDestination] = useState<{ latitude: number, longitude: number } | null>(null); // Untuk marker destinasi
    const [address, setAddress] = useState<string | null>(null); // Untuk menyimpan alamat lengkap
    const [mqttData, setMqttData] = useState<any>(null);
    const [sensorData, setSensorData] = useState<{ [key: string]: number }>({
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
    const [showSavedLocationsDialog, setShowSavedLocationsDialog] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [location, setLocation] = useState<[number, number] | null>(null);
    const [channels, setChannels] = useState<Notifications.NotificationChannel[]>([]);
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(
        undefined
    );
    const notificationListener = useRef<Notifications.EventSubscription>();
    const responseListener = useRef<Notifications.EventSubscription>();

    useEffect(() => {
        // registerForPushNotificationsAsync().then(token => token && setExpoPushToken(token));

        if (Platform.OS === 'android') {
            Notifications.getNotificationChannelsAsync().then(value => setChannels(value ?? []));
        }
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
        }); return () => {
            notificationListener.current &&
                Notifications.removeNotificationSubscription(notificationListener.current);
            responseListener.current &&
                Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, []);

    // Tambah ref untuk input
    const riverNameInputRef = useRef<TextInput>(null);

    // Add toast hook after state declarations
    const toast = useToast();

    const GEOFENCE_TASK = 'geofence-monitoring';

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

    useEffect(() => {
        const setupNotifications = async () => {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin notifikasi diperlukan untuk mendapatkan peringatan perangkat');
            }
        };
        setupNotifications();
    }, []);

    useEffect(() => {
        if (!mqttData || !location) return;

        const checkDistance = async () => {
            try {
                const deviceLat = parseFloat(mqttData.message.latitude);
                const deviceLon = parseFloat(mqttData.message.longitude);
                const userLat = location[0];
                const userLon = location[1];

                const distance = calculateDistance(
                    userLat, userLon,
                    deviceLat, deviceLon
                );

                if (distance >= 1 && distance <= 10) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "🚨 Perangkat IOT Dekat!",
                            body: `Perangkat berada dalam jarak ${distance.toFixed(1)} meter`,
                            sound: true,
                            data: {
                                lat: deviceLat,
                                lon: deviceLon
                            },
                            // android: {
                            //     channelId: 'alerts',
                            //     priority: Notifications.AndroidNotificationPriority.HIGH,
                            //     vibrationPattern: [0, 250, 250, 250],
                            // }
                        },
                        trigger: {
                            type: SchedulableTriggerInputTypes.TIME_INTERVAL,
                            seconds: 2,
                        },
                    });
                }
            } catch (error) {
                console.error('Error checking distance:', error);
            }
        };

        checkDistance();
    }, [mqttData, location]); // Trigger saat ada update data MQTT atau lokasi user

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

    const handleSaveLocation = async () => {
        try {
            const postData = {
                id_lokasi: generateLocationId(),
                nama_sungai: dialogContent.nama_sungai,
                alamat: dialogContent.address,
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

            // Pastikan ini dipanggil
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
            Alert.alert(
                'Error Lokasi',
                (error as Error).message || 'Terjadi kesalahan saat menyimpan lokasi'
            );
        }
    };

    // Update delete handler
    const handleDeleteLocation = () => {
        // try {
        //     const response = await fetch(`${port}data_lokasi/${savedLocation?.id_lokasi}`, {
        //         method: 'DELETE'
        //     });

        // if (response.ok) {
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
        // }
        // } catch (error) {
        //     console.error('Error:', error);
        //     Alert.alert(
        //         'Error Lokasi',
        //         (error as Error).message || 'Terjadi kesalahan saat menghapus lokasi'
        //     );
        // }
        setShowSavedLocationsDialog(false);
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
        // Convert ke number dan handle undefined
        const lat = parseFloat(locationData.latitude) || 0;
        const lon = parseFloat(locationData.longitude) || 0;

        const newLocation = {
            id_lokasi: locationData.id_lokasi,
            nama_sungai: locationData.nama_sungai,
            address: locationData.alamat || 'Alamat tidak tersedia',
            latitude: lat,
            longitude: lon
        };

        setSavedLocation(newLocation);
        setDestination({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
        });

        if (socketRef.current) {
            socketRef.current.emit('updateLocation', {
                id_lokasi: newLocation.id_lokasi,
                nama_sungai: newLocation.nama_sungai,
                alamat: newLocation.address,
                latitude: newLocation.latitude.toString(),
                longitude: newLocation.longitude.toString()
            });
        }

        toast.show({
            placement: 'top',
            render: () => (
                <Toast action="success">
                    <ToastTitle>Lokasi monitoring dipilih!</ToastTitle>
                    <ToastDescription>{newLocation.nama_sungai}</ToastDescription>
                </Toast>
            )
        });
    };

    return (
        <>
            <SafeAreaView style={styles.container}>
                {isFetchingAddress && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#ea5757" />
                        <Text style={styles.loadingText}>Mengambil alamat...</Text>
                    </View>
                )}
                {isFetchingLocation && (
                    <View style={styles.loadingIndicator}>
                        <ActivityIndicator size="large" color="#3388ff" />
                        <Text style={{ marginTop: 10, color: '#333' }}>Mendapatkan lokasi...</Text>
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
                onPress={() => setShowSavedLocationsDialog(true)}
                placement='bottom left'
                style={{
                    backgroundColor: 'white',
                    position: 'absolute',
                    bottom: 200,
                    left: 25,
                    zIndex: 0,
                }}
            >
                <AntDesign name="enviromento" size={35} color="#ea5757" />
            </Fab>
            <Fab
                size="sm"
                isHovered={false}
                isDisabled={false}
                isPressed={true}
                onPress={() => getCurrentLocationFuncRef.current?.()}
                placement='bottom left'
                style={{
                    backgroundColor: 'white',
                    position: 'absolute', // FAB menjadi elemen absolut di layar
                    bottom: 120,           // Jarak dari bagian bawah layar
                    left: 25,            // Jarak dari sisi kiri layar
                    zIndex: 0,           // Memastikan FAB berada di atas elemen lain
                }}
            >
                <AntDesign name="team" size={35} color="#ea5757" />
            </Fab>
            <BottomSheet>
                <Fab
                    size="sm"
                    isHovered={false}
                    isDisabled={false}
                    isPressed={true}
                    style={{
                        backgroundColor: 'white',
                        position: 'absolute', // FAB menjadi elemen absolut di layar
                        bottom: 120,           // Jarak dari bagian bawah layar
                        right: 25,            // Jarak dari sisi kanan layar
                        zIndex: 0,           // Memastikan FAB berada di atas elemen lain
                    }}
                >
                    <BottomSheetTrigger>
                        <AntDesign name="piechart" size={35} color="#ea5757" />
                    </BottomSheetTrigger>
                </Fab>

                <BottomSheetPortal
                    snapPoints={["50%", "70%", "100%"]}
                    backdropComponent={BottomSheetBackdrop}
                    handleComponent={BottomSheetDragIndicator}
                >
                    <SafeAreaView style={{ flex: 1 }}>
                        <BottomSheetScrollView nestedScrollEnabled>
                            {/* <RealTimeClock /> */}

                            <FlatList
                                scrollEnabled={false}
                                // nestedScrollEnabled={true}
                                data={sensorConfigs}
                                renderItem={renderSpeedometer}
                                keyExtractor={item => item.id}
                                numColumns={2}
                                ListHeaderComponent={<RealTimeClock />}
                                // ListFooterComponent={<RealTimeClock />}
                                contentContainerStyle={styles.listContent}
                                columnWrapperStyle={{ justifyContent: 'space-between' }}
                            />
                            <View style={{ height: 100 }}></View>
                        </BottomSheetScrollView>
                    </SafeAreaView>
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
                onClose={() => setShowAddressDialog(false)}
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
                        <ModalCloseButton onPress={() => setShowAddressDialog(false)}>
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
                                <TextInput
                                    ref={riverNameInputRef}
                                    style={styles.inputImproved}
                                    placeholder="Contoh: Kali Ciliwung Depok"
                                    placeholderTextColor="#94a3b8"
                                    value={dialogContent.nama_sungai}
                                    onChangeText={(text) => setDialogContent(prev => ({
                                        ...prev,
                                        nama_sungai: text
                                    }))}
                                    autoFocus
                                />
                            </View>

                            <View>
                                <Text className="text-sm text-typography-600 mb-1.5">Alamat Lengkap</Text>
                                <TextInput
                                    style={[styles.inputImproved, styles.multilineInput]}
                                    value={dialogContent.address}
                                    onChangeText={(text) => setDialogContent(prev => ({ ...prev, address: text }))}
                                    placeholder="Alamat akan otomatis terisi dari koordinat peta"
                                    placeholderTextColor="#94a3b8"
                                    multiline={true}
                                    numberOfLines={4}
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
                                onPress={() => setShowAddressDialog(false)}
                                size="sm"
                                className="flex-1"
                            >
                                <ButtonText>Batal</ButtonText>
                            </Button>
                            <Button
                                onPress={handleSaveLocation}
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
            <Modal
                isOpen={showSavedLocationsDialog}
                onClose={() => setShowSavedLocationsDialog(false)}
                size="lg"
            >
                <ModalBackdrop />
                <ModalContent>
                    <ModalHeader>
                        <Heading size="md" className="text-typography-950 font-semibold">
                            📍 Lokasi Monitoring Aktif
                        </Heading>
                        <ModalCloseButton onPress={() => setShowSavedLocationsDialog(false)}>
                            <Icon
                                as={CloseIcon}
                                size="md"
                                className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700"
                            />
                        </ModalCloseButton>
                    </ModalHeader>
                    <ModalBody className="mt-3 mb-4">
                        {!savedLocation ? (
                            <Center className="py-8">
                                <Text size="sm" className="text-typography-500">
                                    Belum ada lokasi monitoring terpasang
                                </Text>
                            </Center>
                        ) : (
                            <View style={styles.savedLocationCard}>
                                <View style={styles.locationHeader}>
                                    <AntDesign name="enviromento" size={24} color="#3b82f6" />
                                    <Text style={styles.locationTitle}>
                                        {savedLocation.nama_sungai || "Lokasi Sungai"}
                                    </Text>
                                </View>

                                <View style={styles.locationDetail}>
                                    <AntDesign name="infocirlceo" size={14} color="#64748b" />
                                    <Text style={styles.detailText}>{savedLocation.address}</Text>
                                </View>

                                <View style={styles.coordinateBadge}>
                                    <AntDesign name="earth" size={14} color="#64748b" />
                                    <Text style={styles.coordinateText}>
                                        {savedLocation?.latitude?.toFixed?.(6) ?? 'N/A'},
                                        {savedLocation?.longitude?.toFixed?.(6) ?? 'N/A'}
                                    </Text>
                                </View>

                                <HStack className="gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onPress={handleDeleteLocation}
                                        className="flex-1"
                                    >
                                        <ButtonText>Hapus Lokasi</ButtonText>
                                    </Button>
                                    <Button
                                        size="sm"
                                        onPress={() => {
                                            if (savedLocation) {
                                                mapRef.current?.zoomToLocation(
                                                    savedLocation.latitude,
                                                    savedLocation.longitude
                                                );
                                                setShowSavedLocationsDialog(false);
                                            }
                                        }}
                                        className="flex-1 bg-emerald-500"
                                    >
                                        <ButtonText>Lihat Lokasi</ButtonText>
                                    </Button>
                                </HStack>
                            </View>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            onPress={() => setShowSavedLocationsDialog(false)}
                            size="sm"
                        >
                            <ButtonText>Tutup</ButtonText>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    searchBox: {
        position: 'absolute',
        top: 6,
        width: '70%',
        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
        zIndex: 0,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    input: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderColor: '#ccc',
        borderWidth: 1,
    },
    clearButton: {
        marginLeft: 8,
        marginRight: 5,
    },
    suggestions: {
        backgroundColor: 'white',
        marginTop: 5,
        borderRadius: 8,
        padding: 5,
    },
    suggestionText: {
        padding: 10,
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999
    },
    loadingText: {
        marginTop: 10,
        color: '#333',
        fontSize: 16
    },
    savedLocationCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 12
    },
    locationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b'
    },
    locationDetail: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
        marginBottom: 8
    },
    detailText: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        lineHeight: 20
    },
    coordinateBadge: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 8,
        marginTop: 8
    },
    coordinateText: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: 'monospace'
    },
    // Di StyleSheet:
    loadingIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        zIndex: 9999
    },
    listContent: {
        paddingBottom: 24
    },
    speedometerContainer: {
        width: '48%',
        margin: '1%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3
    },
    sensorTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 16,
        color: '#1e293b',
        textAlign: 'center',
        letterSpacing: 0.5
    },
    speedometerText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#334155',
        textAlign: 'center',
        marginTop: 8
    },
    speedometerLabel: {
        fontSize: 10,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 4
    },
    statusText: {
        marginTop: 12,
        fontSize: 13,
        color: 'white',
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: '#3b82f6',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        overflow: 'hidden',
        alignSelf: 'center'
    },
    coordinateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        gap: 8,
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