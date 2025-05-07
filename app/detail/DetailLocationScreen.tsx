import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Dimensions, Platform, SafeAreaView, StatusBar, FlatList, LogBox } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ButtonText } from '@/components/ui/button';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import { port } from '@/constants/https';
import { DataTable } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AntDesign, SimpleLineIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, MotiText, AnimatePresence, useAnimationState } from 'moti'
import { Easing } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import WebView from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as ScreenOrientation from 'expo-screen-orientation';

// useEffect(() => {
LogBox.ignoreLogs(["VirtualizedLists should never be nested"]);
// }, [])

interface ApiLocation {
    id_lokasi: number;
    nama_sungai: string;
    alamat: string;
    tanggal: string;
    lat: string;
    lon: string;
}

interface CombinedData {
    lat: string;
    lon: string;
    tanggal: string;
    nilai_accel_x: number;
    nilai_accel_y: number;
    nilai_accel_z: number;
    nilai_ph: number;
    nilai_temperature: number;
    nilai_turbidity: number;
    nilai_speed: number | null;
}

// Enhanced combined data with formatted date
interface EnhancedCombinedData extends CombinedData {
    formattedDate: string;
    rowNumber: number;
}

// Define download state type
type DownloadState = 'idle' | 'preparing' | 'downloading' | 'completed' | 'error';

// Download Animation Component
const DownloadAnimation = ({ downloadState }: { downloadState: DownloadState }) => {
    const states = {
        idle: {
            scale: 1,
            opacity: 1,
            backgroundColor: '#3b82f6',
        },
        preparing: {
            scale: 1.05,
            opacity: 1,
            backgroundColor: '#60a5fa',
        },
        downloading: {
            scale: 1.05,
            opacity: 1,
            backgroundColor: '#60a5fa',
        },
        completed: {
            scale: 1.1,
            opacity: 1,
            backgroundColor: '#2563eb',
        },
        error: {
            scale: 1,
            opacity: 1,
            backgroundColor: '#ef4444',
        }
    };

    const currentState = states[downloadState] || states.idle;

    return (
        <MotiView
            style={styles.gradientButton}
            from={states.idle}
            animate={currentState}
            transition={{
                type: 'timing',
                duration: 300,
            }}
        >
            <MotiView
                style={{ flexDirection: 'row', alignItems: 'center' }}
            >
                {downloadState === 'idle' && (
                    <Feather name="download" size={20} color="white" />
                )}
                {downloadState === 'preparing' && (
                    <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '360deg' }}
                        transition={{
                            loop: true,
                            repeatReverse: false,
                            duration: 1000,
                        }}
                    >
                        <Feather name="refresh-cw" size={20} color="white" />
                    </MotiView>
                )}
                {downloadState === 'downloading' && (
                    <MotiView
                        from={{ translateY: 0 }}
                        animate={{ translateY: [-4, 4, -4] }}
                        transition={{
                            loop: true,
                            duration: 1000,
                        }}
                    >
                        <Feather name="download-cloud" size={20} color="white" />
                    </MotiView>
                )}
                {downloadState === 'completed' && (
                    <MotiView
                        from={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: 'spring',
                            stiffness: 200,
                            damping: 15
                        }}
                    >
                        <Feather name="check-circle" size={20} color="white" />
                    </MotiView>
                )}
                {downloadState === 'error' && (
                    <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '10deg' }}
                        transition={{
                            loop: true,
                            repeatReverse: true,
                            duration: 100,
                        }}
                    >
                        <Feather name="alert-circle" size={20} color="white" />
                    </MotiView>
                )}
                <Text className="text-white font-semibold ml-2">
                    {downloadState === 'idle' && 'Unduh Data Excel'}
                    {downloadState === 'preparing' && 'Mempersiapkan Data...'}
                    {downloadState === 'downloading' && 'Mengunduh...'}
                    {downloadState === 'completed' && 'Berhasil Diunduh!'}
                    {downloadState === 'error' && 'Gagal Mengunduh'}
                </Text>
            </MotiView>
        </MotiView>
    );
};

// Row animation component - optimize animation for better performance
const AnimatedTableRow = ({
    item,
    index,
    isNewDataSet
}: {
    item: EnhancedCombinedData,
    index: number,
    isNewDataSet: boolean
}) => {
    return (
        <MotiView
            from={{
                opacity: 0,
                scale: 0.98,
                translateX: isNewDataSet ? 5 : 0
            }}
            animate={{
                opacity: 1,
                scale: 1,
                translateX: 0
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
                delay: isNewDataSet ? index * 3 : index * 5,
                type: 'timing',
                duration: 150
            }}
        >
            <DataTable.Row style={[
                styles.dataRow,
                index % 2 === 0 && { backgroundColor: '#f8fafc' }
            ]}>
                <DataTable.Cell style={styles.numberCell}>
                    <Text style={styles.rowNumberText} numberOfLines={1} adjustsFontSizeToFit>
                        {item.rowNumber}
                    </Text>
                </DataTable.Cell>
                <DataTable.Cell style={[styles.dataCell, { width: 200 }]}>
                    <Text className="text-slate-600 text-sm">
                        {item.formattedDate}
                    </Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={[styles.dataCell, { width: 80 }]}>
                    <Text style={{
                        color: item.nilai_ph < 6 ? '#ef4444' : '#10b981',
                        fontWeight: '600'
                    }}>
                        {item.nilai_ph.toFixed(2)}
                    </Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={[styles.dataCell, { width: 100 }]}>
                    <Text style={{
                        color: item.nilai_temperature > 30 ? '#ef4444' : '#3b82f6',
                        fontWeight: '600'
                    }}>
                        {item.nilai_temperature.toFixed(2)}°C
                    </Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={[styles.dataCell, { width: 120 }]}>
                    {item.nilai_turbidity.toFixed(2)} NTU
                </DataTable.Cell>
                <DataTable.Cell numeric style={[styles.dataCell, { width: 100 }]}>
                    {item.nilai_speed?.toFixed(2) ?? '0.00'} m/s
                </DataTable.Cell>
                <DataTable.Cell numeric style={[styles.dataCell, { width: 100 }]}>
                    {item.nilai_accel_x.toFixed(2)}
                </DataTable.Cell>
                <DataTable.Cell numeric style={[styles.dataCell, { width: 100 }]}>
                    {item.nilai_accel_y.toFixed(2)}
                </DataTable.Cell>
                <DataTable.Cell numeric style={[styles.dataCell, { width: 100 }]}>
                    {item.nilai_accel_z.toFixed(2)}
                </DataTable.Cell>
            </DataTable.Row>
        </MotiView>
    );
};

const SensorListItem = ({ item }: { item: EnhancedCombinedData }) => {
    return (
        <MotiView
            from={{ opacity: 0, translateY: 3 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 150 }}
            style={styles.listItem}
        >
            <View style={styles.listItemHeader}>
                <Text style={styles.listItemNumber} numberOfLines={1} adjustsFontSizeToFit>
                    {item.rowNumber}
                </Text>
                <Text style={styles.listItemDate}>{item.formattedDate}</Text>
            </View>
            <View style={styles.listItemGrid}>
                <View style={styles.listItemValue}>
                    <Text style={styles.listItemLabel}>pH</Text>
                    <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: item.nilai_ph < 6 ? '#ef4444' : '#10b981',
                    }}>
                        {item.nilai_ph.toFixed(2)}
                    </Text>
                </View>
                <View style={styles.listItemValue}>
                    <Text style={styles.listItemLabel}>Suhu</Text>
                    <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: item.nilai_temperature > 30 ? '#ef4444' : '#3b82f6',
                    }}>
                        {item.nilai_temperature.toFixed(2)}°C
                    </Text>
                </View>
                <View style={styles.listItemValue}>
                    <Text style={styles.listItemLabel}>Turbidity</Text>
                    <Text style={styles.listItemValueText}>
                        {item.nilai_turbidity.toFixed(2)} NTU
                    </Text>
                </View>
            </View>
            <View style={styles.listItemGrid}>
                <View style={styles.listItemValue}>
                    <Text style={styles.listItemLabel}>Kecepatan</Text>
                    <Text style={styles.listItemValueText}>
                        {item.nilai_speed?.toFixed(2) ?? '0.00'} m/s
                    </Text>
                </View>
                <View style={styles.listItemValue}>
                    <Text style={styles.listItemLabel}>Accel X</Text>
                    <Text style={styles.listItemValueText}>
                        {item.nilai_accel_x.toFixed(2)}
                    </Text>
                </View>
                <View style={styles.listItemValue}>
                    <Text style={styles.listItemLabel}>Accel Y</Text>
                    <Text style={styles.listItemValueText}>
                        {item.nilai_accel_y.toFixed(2)}
                    </Text>
                </View>
            </View>
            <View style={[styles.listItemGrid, { justifyContent: 'flex-start' }]}>
                <View style={styles.listItemValue}>
                    <Text style={styles.listItemLabel}>Accel Z</Text>
                    <Text style={styles.listItemValueText}>
                        {item.nilai_accel_z.toFixed(2)}
                    </Text>
                </View>
            </View>
        </MotiView>
    );
};

// Update LoadingOverlay for better performance
const LoadingOverlay = ({ isVisible }: { isVisible: boolean }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 0.9 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'timing', duration: 150 }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                    }}
                >
                    <MotiView
                        from={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'timing', duration: 200 }}
                        style={{
                            backgroundColor: 'white',
                            padding: 24,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 5,
                        }}
                    >
                        <MotiView
                            from={{ rotate: '0deg' }}
                            animate={{ rotate: '360deg' }}
                            transition={{
                                loop: true,
                                repeatReverse: false,
                                duration: 800,
                                type: 'timing',
                                easing: Easing.linear,
                            }}
                            style={{ marginBottom: 16 }}
                        >
                            <Feather name="refresh-cw" size={30} color="#3b82f6" />
                        </MotiView>
                        <MotiText
                            from={{ opacity: 0, translateY: 5 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 150 }}
                            className="text-slate-700 font-medium"
                        >
                            Memuat data...
                        </MotiText>
                    </MotiView>
                </MotiView>
            )}
        </AnimatePresence>
    );
};

const DetailLocationScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<ApiLocation | null>(null);
    const [allCombinedData, setAllCombinedData] = useState<CombinedData[]>([]);
    const [allSensorData, setAllSensorData] = useState<CombinedData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(0);
    const numberOfItemsPerPageList = [10, 20, 50, 100];
    const [downloadState, setDownloadState] = useState<DownloadState>('idle');
    const [mapLoading, setMapLoading] = useState(true);
    const [webViewContent, setWebViewContent] = useState<string | null>(null);
    const webViewRef = useRef<WebView | null>(null);
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'list'>('list');
    const flatListRef = useRef<FlatList>(null);

    // Add state for screen orientation
    const [isLandscape, setIsLandscape] = useState(false);

    // Add loading transition state
    const [isLoadingTransition, setIsLoadingTransition] = useState(false);
    const [isNewDataSet, setIsNewDataSet] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${port}data_lokasi/${id}`);
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        const fetchCombinedData = async () => {
            try {
                const response = await fetch(
                    `${port}data_combined/paginated/${id}?page=${page + 1}&limit=${itemsPerPage}`
                );
                const result = await response.json();
                if (result.success) {
                    setAllCombinedData(result.data);
                    setTotalItems(result.total);
                }
            } catch (error) {
                console.error('Error fetching combined data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCombinedData();
    }, [id, page, itemsPerPage]);

    // Load the HTML content for Expo
    useEffect(() => {
        const loadHtml = async () => {
            try {
                setMapLoading(true);
                const path = require("../../assets/index.html");
                const asset = Asset.fromModule(path);
                await asset.downloadAsync();

                // Modify HTML content to remove search control
                let htmlContent = await FileSystem.readAsStringAsync(asset.localUri!);

                // Remove the search control initialization code
                htmlContent = htmlContent.replace(
                    /const searchControl = new L\.Control\.Geocoder\(.*?\)\.addTo\(map\);/gs,
                    '// Search control removed'
                );

                // Also remove the event listener for search
                htmlContent = htmlContent.replace(
                    /L\.DomEvent\.on\(searchControl.*?\}\);/gs,
                    '// Search event listener removed'
                );

                setWebViewContent(htmlContent);
                setMapLoading(false);
            } catch (error) {
                console.error('Error loading HTML:', error);
                Alert.alert('Error loading HTML', JSON.stringify(error));
                setMapLoading(false);
            }
        };

        loadHtml();
    }, []);

    // Add new useEffect to fetch all sensor data for the map
    useEffect(() => {
        const fetchAllSensorData = async () => {
            try {
                const response = await fetch(`${port}data_combined/${id}`);
                const result = await response.json();
                if (result.success) {
                    setAllSensorData(result.data);
                }
            } catch (error) {
                console.error('Error fetching all sensor data:', error);
            }
        };

        if (id) {
            fetchAllSensorData();
        }
    }, [id]);

    // Handle WebView message
    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Received message from WebView:', data);
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    // Update map with location and sensor data
    const updateMapData = useCallback(() => {
        if (!webViewRef.current || !data || !allSensorData.length) return;

        // Format location data
        const locationData = [{
            id_lokasi: data.id_lokasi,
            lat: data.lat,
            lon: data.lon,
            nama_sungai: data.nama_sungai,
            alamat: data.alamat,
            tanggal: data.tanggal
        }];

        // Format sensor data with historical data
        const sensorData = allSensorData.map(item => ({
            lat: item.lat,
            lon: item.lon,
            nilai_accel_x: item.nilai_accel_x,
            nilai_accel_y: item.nilai_accel_y,
            nilai_accel_z: item.nilai_accel_z,
            nilai_ph: item.nilai_ph,
            nilai_temperature: item.nilai_temperature,
            nilai_turbidity: item.nilai_turbidity,
            nilai_speed: item.nilai_speed,
            tanggal: item.tanggal
        }));

        // Inject JavaScript to update map
        webViewRef.current.injectJavaScript(`
            // Remove search control if exists
            if (window.searchControl) {
                map.removeControl(window.searchControl);
            }

            // Clear existing markers
            if (window.markerClusterGroup) {
                window.markerClusterGroup.clearLayers();
            }

            // Update location marker
            window.updateLocationData(${JSON.stringify(locationData)});

            // Update sensor data with clustering
            window.updateSensorData(${JSON.stringify(sensorData)});

            // Center map on location
            map.setView([${data.lat}, ${data.lon}], 15);

            // Initialize marker cluster group if not exists
            if (!window.markerClusterGroup) {
                window.markerClusterGroup = L.markerClusterGroup({
                    chunkedLoading: true,
                    chunkInterval: 200,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true,
                    maxClusterRadius: 40,
                    disableClusteringAtZoom: 18,
                    spiderLegPolylineOptions: {
                        weight: 1.5,
                        color: '#222',
                        opacity: 0.5
                    },
                    iconCreateFunction: function(cluster) {
                        return L.divIcon({
                            html: '<div class="cluster-marker">' + cluster.getChildCount() + '</div>',
                            className: 'marker-cluster-custom',
                            iconSize: L.point(40, 40, true)
                        });
                    }
                }).addTo(map);
            }

            // Add sensor markers to cluster group
            const geoJsonLayer = L.geoJSON({
                "type": "FeatureCollection",
                "features": ${JSON.stringify(sensorData)}.map(item => ({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [parseFloat(item.lon), parseFloat(item.lat)]
                    },
                    "properties": item
                }))
            }, {
                pointToLayer: function(feature, latlng) {
                    return L.marker(latlng, {
                        icon: window.markerWaterWays,
                        title: 'Sensor Data',
                        zIndexOffset: 0
                    }).bindPopup(createSensorPopup(feature.properties));
                }
            });

            window.markerClusterGroup.addLayer(geoJsonLayer);

            // Enable all map interactions - will make the map work better in fullscreen
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            map.scrollWheelZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            if (map.tap) map.tap.enable();

            // Force map to invalidate size
            map.invalidateSize();
            
            true;
        `);
    }, [data, allSensorData]);

    // Call updateMapData when toggling fullscreen mode
    useEffect(() => {
        // Only update the map after the component has re-rendered in the new mode
        const timer = setTimeout(() => {
            if (webViewRef.current && data && allSensorData.length > 0) {
                updateMapData();
            }
        }, 500); // Short delay to ensure WebView is ready

        return () => clearTimeout(timer);
    }, [isMapFullscreen, updateMapData]);

    // Update map when data changes
    useEffect(() => {
        if (data && allSensorData.length > 0) {
            updateMapData();
        }
    }, [data, allSensorData, updateMapData]);

    // Toggle map fullscreen mode
    const toggleMapFullscreen = () => {
        setIsMapFullscreen(!isMapFullscreen);
    };

    const handleBack = () => {
        // Reset to portrait mode first if in landscape
        if (isLandscape) {
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (error) {
                console.error('Error resetting orientation:', error);
            }
        }

        // Use more reliable navigation approach
        setTimeout(() => {
            router.back();
        }, 100);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        setDownloadState('preparing');

        try {
            // Create a notification ID for tracking
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Mengunduh Data Sensor",
                    body: "Sedang mempersiapkan data...",
                },
                trigger: null,
            });

            // Fetch Excel data from API
            const response = await fetch(`${port}data_combined/export/${Number(id)}`);
            const blob: Blob = await response.blob();

            // Generate filename
            const filename = `data_${id}_${data?.nama_sungai || 'lokasi'}.xlsx`;

            // Convert blob to base64
            const base64Data = await blobToBase64(blob);

            // Update notification and state
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Mengunduh Data Sensor",
                    body: "Sedang menyimpan file...",
                },
                trigger: null,
                identifier: notificationId.toString(),
            });

            setDownloadState('downloading');

            if (Platform.OS === 'android') {
                try {
                    // Request directory permissions for Android
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

                    if (permissions.granted) {
                        // Create file in the selected directory
                        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                            permissions.directoryUri,
                            filename,
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );

                        // Write the file content directly
                        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                            encoding: FileSystem.EncodingType.Base64
                        });

                        // Create a temporary copy in cache for sharing
                        const tempFileUri = FileSystem.cacheDirectory + filename;
                        await FileSystem.writeAsStringAsync(tempFileUri, base64Data, {
                            encoding: FileSystem.EncodingType.Base64
                        });

                        // Update notification to show completion
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: "Unduhan Selesai",
                                body: `File ${filename} berhasil disimpan. Ketuk untuk membuka file.`,
                                data: {
                                    filepath: fileUri,
                                    tempFilepath: tempFileUri
                                },
                            },
                            trigger: null,
                            identifier: notificationId.toString(),
                        });

                        setDownloadState('completed');

                        // Reset state after 2 seconds
                        setTimeout(() => {
                            setDownloadState('idle');
                        }, 2000);

                        Alert.alert(
                            'Download Berhasil',
                            `File telah berhasil disimpan di folder yang dipilih.`,
                            [{ text: 'OK', style: 'default' }]
                        );
                    } else {
                        // If permissions denied, fallback to sharing
                        await handleFileSharing(base64Data, filename, notificationId);
                    }
                } catch (error) {
                    console.error('Error saving file on Android:', error);
                    setDownloadState('error');
                    setTimeout(() => {
                        setDownloadState('idle');
                    }, 2000);
                    await handleFileSharing(base64Data, filename, notificationId);
                }
            } else {
                // For iOS, use sharing
                await handleFileSharing(base64Data, filename, notificationId);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            setDownloadState('error');

            // Reset state after 2 seconds
            setTimeout(() => {
                setDownloadState('idle');
            }, 2000);

            Alert.alert('Error', 'Gagal mengunduh file.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Helper function to handle file sharing
    const handleFileSharing = async (base64Data: string, filename: string, notificationId: string) => {
        try {
            setDownloadState('downloading');

            // Save file temporarily
            const fileUri = FileSystem.cacheDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64
            });

            // Share the file
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Export Data Sensor',
                UTI: 'org.openxmlformats.spreadsheetml.sheet'
            });

            // Update notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Unduhan Selesai",
                    body: `File ${filename} berhasil diunduh. Ketuk untuk membuka file.`,
                    data: {
                        filepath: fileUri,
                        tempFilepath: fileUri
                    },
                },
                trigger: null,
                identifier: notificationId.toString(),
            });

            setDownloadState('completed');

            // Reset state after 2 seconds
            setTimeout(() => {
                setDownloadState('idle');
            }, 2000);
        } catch (error) {
            console.error('Error sharing file:', error);
            setDownloadState('error');

            // Reset state after 2 seconds
            setTimeout(() => {
                setDownloadState('idle');
            }, 2000);

            throw new Error('Gagal membagikan file');
        }
    };

    // Handle notification response
    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
            const { filepath, tempFilepath } = response.notification.request.content.data || {};
            const fileToOpen = tempFilepath || filepath;

            if (fileToOpen) {
                try {
                    if (Platform.OS === 'android' && filepath && filepath.startsWith('content://')) {
                        // For Android content URIs, use the temporary file for sharing
                        await Sharing.shareAsync(tempFilepath, {
                            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            dialogTitle: 'Export Data Sensor',
                            UTI: 'org.openxmlformats.spreadsheetml.sheet'
                        });
                    } else {
                        // Otherwise use the file path directly
                        await Sharing.shareAsync(fileToOpen, {
                            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            dialogTitle: 'Export Data Sensor',
                            UTI: 'org.openxmlformats.spreadsheetml.sheet'
                        });
                    }
                } catch (error) {
                    console.error('Error opening file:', error);
                    Alert.alert(
                        'Error',
                        'Tidak dapat membuka file. Silakan buka file secara manual dari folder penyimpanan.',
                        [{ text: 'OK', style: 'default' }]
                    );
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Memoize the data transformation
    const transformedData = useMemo(() => {
        // Sort the data by timestamp (oldest to newest)
        const sortedData = [...allCombinedData].sort((a, b) => {
            return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
        });

        return sortedData.map((item, index) => ({
            ...item,
            formattedDate: new Date(item.tanggal).toLocaleString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }),
            rowNumber: (page * itemsPerPage) + index + 1
        })) as EnhancedCombinedData[];
    }, [allCombinedData, page, itemsPerPage]);

    // Enhanced pagination handlers
    const handlePageChange = useCallback((newPage: number) => {
        setIsLoadingTransition(true);
        setIsNewDataSet(false);

        // Reduced delay time for better responsiveness
        setTimeout(() => {
            setPage(newPage);

            // Reduced loading time
            setTimeout(() => {
                setIsLoadingTransition(false);
            }, 200);
        }, 100);
    }, []);

    const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
        setIsLoadingTransition(true);
        setIsNewDataSet(true);

        // Reduced delay for better responsiveness
        setTimeout(() => {
            setItemsPerPage(newItemsPerPage);
            setPage(0); // Reset to first page when changing items per page

            // Reduced loading time
            setTimeout(() => {
                setIsLoadingTransition(false);
            }, 300);
        }, 100);
    }, []);

    // Animasi untuk tabel
    const tableAnimation = useAnimationState({
        from: { opacity: 0, translateY: 20 },
        to: { opacity: 1, translateY: 0 },
    });

    // Function to toggle screen orientation
    const toggleOrientation = async () => {
        try {
            if (isLandscape) {
                // Change to portrait
                await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.PORTRAIT_UP
                );
                setIsLandscape(false);
            } else {
                // Change to landscape
                await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.LANDSCAPE
                );
                setIsLandscape(true);
            }
        } catch (error) {
            console.error('Error changing screen orientation:', error);
            Alert.alert('Error', 'Failed to change screen orientation');
        }
    };

    // Handle orientation changes
    useEffect(() => {
        // Temporarily disable automatic orientation handling
        const getOrientation = async () => {
            try {
                const orientation = await ScreenOrientation.getOrientationAsync();
                setIsLandscape(
                    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
                    orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
                );
            } catch (error) {
                console.error('Error getting orientation:', error);
            }
        };

        getOrientation();

        // Don't add orientation change listener for now
        // Let user manually control with the button only

        return () => {
            // Reset to portrait when component unmounts
            try {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (error) {
                console.error('Error resetting orientation:', error);
            }
        };
    }, []);

    // Render item for FlatList
    const renderItem = useCallback(({ item }: { item: EnhancedCombinedData }) => {
        return <SensorListItem item={item} />;
    }, []);

    // Footer for FlatList with pagination
    const renderFooter = useCallback(() => {
        return (
            <View style={styles.paginationContainer}>
                <View style={styles.paginationControls}>
                    <TouchableOpacity
                        style={[styles.paginationButton, page === 0 && styles.paginationButtonDisabled]}
                        onPress={() => handlePageChange(0)}
                        disabled={page === 0}
                    >
                        <MaterialIcons name="first-page" size={24} color={page === 0 ? "#a0aec0" : "#3b82f6"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.paginationButton, page === 0 && styles.paginationButtonDisabled]}
                        onPress={() => handlePageChange(page - 1)}
                        disabled={page === 0}
                    >
                        <MaterialIcons name="chevron-left" size={24} color={page === 0 ? "#a0aec0" : "#3b82f6"} />
                    </TouchableOpacity>
                    <Text style={styles.paginationText}>
                        {`${page * itemsPerPage + 1}-${Math.min((page + 1) * itemsPerPage, totalItems)} dari ${totalItems}`}
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.paginationButton,
                            page >= Math.ceil(totalItems / itemsPerPage) - 1 && styles.paginationButtonDisabled
                        ]}
                        onPress={() => handlePageChange(page + 1)}
                        disabled={page >= Math.ceil(totalItems / itemsPerPage) - 1}
                    >
                        <MaterialIcons name="chevron-right" size={24} color={
                            page >= Math.ceil(totalItems / itemsPerPage) - 1 ? "#a0aec0" : "#3b82f6"
                        } />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.paginationButton,
                            page >= Math.ceil(totalItems / itemsPerPage) - 1 && styles.paginationButtonDisabled
                        ]}
                        onPress={() => handlePageChange(Math.ceil(totalItems / itemsPerPage) - 1)}
                        disabled={page >= Math.ceil(totalItems / itemsPerPage) - 1}
                    >
                        <MaterialIcons name="last-page" size={24} color={
                            page >= Math.ceil(totalItems / itemsPerPage) - 1 ? "#a0aec0" : "#3b82f6"
                        } />
                    </TouchableOpacity>
                </View>
                <View style={styles.rowsPerPageContainer}>
                    <Text style={styles.rowsPerPageText}>Baris per halaman:</Text>
                    <View style={styles.rowsPerPageButtons}>
                        {numberOfItemsPerPageList.map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={[
                                    styles.rowsPerPageButton,
                                    itemsPerPage === num && styles.rowsPerPageButtonActive
                                ]}
                                onPress={() => handleItemsPerPageChange(num)}
                            >
                                <Text style={[
                                    styles.rowsPerPageButtonText,
                                    itemsPerPage === num && styles.rowsPerPageButtonTextActive
                                ]}>
                                    {num}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        );
    }, [page, itemsPerPage, totalItems, handlePageChange, handleItemsPerPageChange]);

    // Add a function to toggle view mode
    const toggleViewMode = () => {
        setViewMode(viewMode === 'table' ? 'list' : 'table');
    };

    // Render the data section - conditional based on viewMode
    const renderDataSection = () => {
        if (loading) {
            return (
                <MotiView
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring' }}
                    style={styles.loadingContainer}
                >
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <MotiText
                        from={{ translateY: 10 }}
                        animate={{ translateY: 0 }}
                        transition={{ loop: true, type: 'timing', duration: 1000 }}
                        className="text-slate-600 mt-4"
                    >
                        Memuat data sensor...
                    </MotiText>
                </MotiView>
            );
        }

        if (allCombinedData.length === 0) {
            return (
                <MotiView style={styles.emptyContainer}>
                    <Text>Tidak ada data sensor di lokasi {data?.nama_sungai}</Text>
                </MotiView>
            );
        }

        return (
            <MotiView
                state={tableAnimation}
                style={[
                    styles.tableWrapper,
                    isLandscape && styles.tableWrapperLandscape
                ]}
            >
                <View style={styles.dataHeaderContainer}>
                    <Text style={styles.dataHeaderTitle}>Data Sensor</Text>
                    <View style={styles.dataHeaderButtons}>
                        <TouchableOpacity
                            style={styles.viewToggleButton}
                            onPress={toggleViewMode}
                        >
                            <MaterialIcons
                                name={viewMode === 'table' ? "view-list" : "view-column"}
                                size={22}
                                color="#3b82f6"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.orientationButton}
                            onPress={() => {
                                toggleOrientation();
                                if (!isLandscape && viewMode !== 'table') {
                                    setViewMode('table');
                                }
                            }}
                        >
                            <MaterialCommunityIcons
                                name={isLandscape ? "phone-rotate-portrait" : "phone-rotate-landscape"}
                                size={22}
                                color="#3b82f6"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {viewMode === 'table' ? (
                    <View style={{ flex: 1 }}>
                        <ScrollView
                            horizontal={true}
                            contentContainerStyle={{ flexGrow: 1 }}
                            showsHorizontalScrollIndicator={true}
                        >
                            <DataTable style={styles.dataTable}>
                                <DataTable.Header style={styles.tableHeader}>
                                    <DataTable.Title style={styles.numberCell}>
                                        <Text style={styles.tableHeaderTitle}>No.</Text>
                                    </DataTable.Title>
                                    <DataTable.Title style={[styles.headerCell, { width: 200 }]}>
                                        <Text style={styles.tableHeaderTitle}>Waktu</Text>
                                    </DataTable.Title>
                                    <DataTable.Title numeric style={[styles.headerCell, { width: 80 }]}>
                                        <Text style={styles.tableHeaderTitle}>pH</Text>
                                    </DataTable.Title>
                                    <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>
                                        <Text style={styles.tableHeaderTitle}>Suhu</Text>
                                    </DataTable.Title>
                                    <DataTable.Title numeric style={[styles.headerCell, { width: 120 }]}>
                                        <Text style={styles.tableHeaderTitle}>Turbidity</Text>
                                    </DataTable.Title>
                                    <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>
                                        <Text style={styles.tableHeaderTitle}>Speed</Text>
                                    </DataTable.Title>
                                    <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>
                                        <Text style={styles.tableHeaderTitle}>Accel X</Text>
                                    </DataTable.Title>
                                    <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>
                                        <Text style={styles.tableHeaderTitle}>Accel Y</Text>
                                    </DataTable.Title>
                                    <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>
                                        <Text style={styles.tableHeaderTitle}>Accel Z</Text>
                                    </DataTable.Title>
                                </DataTable.Header>

                                <ScrollView
                                    style={styles.tableContent}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {transformedData.map((item, index) => (
                                        <AnimatedTableRow
                                            key={`row-${item.rowNumber}-${item.tanggal}`}
                                            item={item}
                                            index={index}
                                            isNewDataSet={isNewDataSet}
                                        />
                                    ))}
                                </ScrollView>
                            </DataTable>
                        </ScrollView>

                        {/* Add pagination for table view */}
                        {renderFooter()}
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={transformedData}
                        renderItem={renderItem}
                        keyExtractor={(item) => `sensor-${item.rowNumber}-${item.tanggal}`}
                        contentContainerStyle={styles.listContainer}
                        ListFooterComponent={renderFooter}
                        onEndReachedThreshold={0.5}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        showsVerticalScrollIndicator={true}
                    />
                )}
            </MotiView>
        );
    };

    // Render the fullscreen map
    const renderFullscreenMap = () => {
        return (
            <SafeAreaView style={styles.fullscreenContainer}>
                <View style={styles.fullscreenMapContainer}>
                    {mapLoading ? (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator size="large" color="#3b82f6" />
                            <Text style={styles.mapLoadingText}>Memuat peta...</Text>
                        </View>
                    ) : (
                        webViewContent && (
                            <WebView
                                ref={webViewRef}
                                source={{ html: webViewContent }}
                                onMessage={handleWebViewMessage}
                                style={{ flex: 1 }}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                scrollEnabled={false}
                                bounces={false}
                                startInLoadingState={true}
                                renderLoading={() => (
                                    <View style={styles.mapLoading}>
                                        <ActivityIndicator size="large" color="#3b82f6" />
                                        <Text style={styles.mapLoadingText}>Memuat peta...</Text>
                                    </View>
                                )}
                            />
                        )
                    )}
                    <TouchableOpacity
                        style={styles.fullscreenButton}
                        onPress={toggleMapFullscreen}
                    >
                        <AntDesign name="shrink" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    };

    // Render content
    if (isMapFullscreen) {
        return renderFullscreenMap();
    }

    return (
        <LinearGradient
            colors={['#f0f4ff', '#ffffff']}
            style={[styles.gradientContainer, isLandscape && styles.gradientContainerLandscape]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                scrollEnabled={true}
                nestedScrollEnabled={true}
            >
                <MotiView
                    style={styles.container}
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 800 }}
                >
                    {/* Header Section */}
                    <MotiView
                        style={styles.headerContainer}
                        from={{ translateY: -50, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 10 }}
                    >
                        <TouchableOpacity onPress={handleBack}>
                            <MotiView
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring' }}
                            >
                                <Feather name="arrow-left" size={28} color="#2563eb" />
                            </MotiView>
                        </TouchableOpacity>

                        <MotiText
                            from={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 200 }}
                        >
                            <Heading size="xl" className="text-blue-600">
                                {data?.nama_sungai || 'Loading...'}
                            </Heading>
                        </MotiText>
                    </MotiView>

                    {/* Info Cards */}
                    <MotiView
                        style={styles.infoGrid}
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 300 }}
                    >
                        <MotiView
                            style={styles.infoCard}
                            from={{ translateX: -20 }}
                            animate={{ translateX: 0 }}
                        >
                            <Feather name="map-pin" size={20} color="#3b82f6" />
                            <Text className="text-slate-600 mt-2" size="sm">Alamat</Text>
                            <Text className="text-slate-800 font-semibold" size="md">{data?.alamat}</Text>
                        </MotiView>

                        <MotiView
                            style={styles.infoCard}
                            from={{ translateX: 20 }}
                            animate={{ translateX: 0 }}
                        >
                            <Feather name="calendar" size={20} color="#3b82f6" />
                            <Text className="text-slate-600 mt-2" size="sm">Tanggal Pengukuran (WIB)</Text>
                            <Text className="text-slate-800 font-semibold" size="md">
                                {data && new Date(data.tanggal).toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false,
                                })}
                            </Text>
                        </MotiView>
                    </MotiView>

                    {/* Coordinate Badges */}
                    <MotiView
                        style={styles.coordinateContainer}
                        from={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 400 }}
                    >
                        <View style={styles.coordinateBadge}>
                            <MaterialIcons name="gps-fixed" size={16} color="#3b82f6" />
                            <Text className="text-blue-600 ml-2">Lat : {parseFloat(data?.lat || '0').toFixed(8)}</Text>
                        </View>
                        <View style={styles.coordinateBadge}>
                            <MaterialIcons name="gps-not-fixed" size={16} color="#3b82f6" />
                            <Text className="text-blue-600 ml-2">Lon : {parseFloat(data?.lon || '0').toFixed(8)}</Text>
                        </View>
                    </MotiView>

                    {/* Download Button */}
                    {allCombinedData.length > 0 && (
                        <MotiView
                            style={styles.downloadContainer}
                            from={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', delay: 500 }}
                        >
                            <TouchableOpacity
                                onPress={handleDownload}
                                disabled={isDownloading || downloadState !== 'idle'}
                            >
                                <DownloadAnimation downloadState={downloadState} />
                            </TouchableOpacity>
                        </MotiView>
                    )}

                    {/* Map Section */}
                    <MotiView
                        style={styles.mapContainer}
                        from={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 200 }}
                    >
                        <View style={styles.mapHeaderContainer}>
                            <Text style={[styles.label]}>
                                Peta Lokasi dan Data Sensor
                            </Text>
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={toggleMapFullscreen}
                            >
                                <SimpleLineIcons name="size-fullscreen" size={24} color="black" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.mapOuterContainer}>
                            <View style={styles.leafletContainer}>
                                {mapLoading ? (
                                    <View style={styles.mapLoading}>
                                        <ActivityIndicator size="large" color="#3b82f6" />
                                        <Text style={styles.mapLoadingText}>Memuat peta...</Text>
                                    </View>
                                ) : (
                                    webViewContent && (
                                        <WebView
                                            ref={webViewRef}
                                            source={{ html: webViewContent }}
                                            onMessage={handleWebViewMessage}
                                            style={{ flex: 1 }}
                                            javaScriptEnabled={true}
                                            domStorageEnabled={true}
                                            scrollEnabled={false}
                                            bounces={false}
                                            startInLoadingState={true}
                                            renderLoading={() => (
                                                <View style={styles.mapLoading}>
                                                    <ActivityIndicator size="large" color="#3b82f6" />
                                                    <Text style={styles.mapLoadingText}>Memuat peta...</Text>
                                                </View>
                                            )}
                                        />
                                    )
                                )}
                            </View>
                        </View>
                    </MotiView>

                    {/* Data Section */}
                    {renderDataSection()}

                    {/* Loading overlay for transitions */}
                    <LoadingOverlay isVisible={isLoadingTransition} />
                </MotiView>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
        padding: 16,
    },
    container: {
        flex: 1,
        padding: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        elevation: 2,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        elevation: 1,
    },
    coordinateContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    coordinateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    downloadContainer: {
        marginBottom: 24,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    tableWrapper: {
        flex: 1,
        minHeight: Dimensions.get('window').height * 0.6, // Minimum 60% dari tinggi layar
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
    },
    tableHeader: {
        backgroundColor: '#3b82f6',
        elevation: 3,
    },
    dataRow: {
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 16,
        marginVertical: 24,
        elevation: 2
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 16,
    },
    tableHeaderTitle: {
        color: 'white',
        fontWeight: 'bold',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    card: {
        marginVertical: 8,
        marginHorizontal: 12,
    },
    lastCard: {
        marginBottom: 80, // Space for bottom navigation
    },
    horizontalScroll: {
        flex: 1,
    },
    tableContent: {
        flexGrow: 1,
        paddingBottom: 16,
        minHeight: Dimensions.get('window').height * 0.4,
    },
    dataTable: {
        flex: 1,
        minWidth: Dimensions.get('window').width * 1.5,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    headerCell: {
        paddingVertical: 12,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
    },
    dataCell: {
        paddingVertical: 10,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        justifyContent: 'center',
    },
    numberCell: {
        width: 70,
        justifyContent: 'center',
    },
    rowNumberText: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
    },
    listItem: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    listItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 8,
    },
    listItemNumber: {
        backgroundColor: '#3b82f6',
        color: 'white',
        fontWeight: 'bold',
        minWidth: 30,
        height: 30,
        borderRadius: 15,
        textAlign: 'center',
        lineHeight: 30,
        marginRight: 12,
        paddingHorizontal: 8,
        overflow: 'hidden',
    },
    listItemDate: {
        fontSize: 14,
        color: '#64748b',
        flex: 1,
    },
    listItemGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    listItemValue: {
        flex: 1,
        alignItems: 'flex-start',
        marginRight: 10,
    },
    listItemLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 2,
    },
    listItemValueText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
    },
    paginationContainer: {
        backgroundColor: '#f8fafc',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        marginTop: 16,
    },
    paginationControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    paginationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        marginHorizontal: 4,
        elevation: 1,
    },
    paginationButtonDisabled: {
        backgroundColor: '#e2e8f0',
        elevation: 0,
    },
    paginationText: {
        marginHorizontal: 12,
        fontSize: 14,
        color: '#475569',
        paddingVertical: 10,
    },
    rowsPerPageContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    rowsPerPageText: {
        fontSize: 14,
        color: '#475569',
        marginRight: 8,
        paddingVertical: 6,
    },
    rowsPerPageButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    rowsPerPageButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginHorizontal: 4,
        marginBottom: 4,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        elevation: 1,
    },
    rowsPerPageButtonActive: {
        backgroundColor: '#3b82f6',
        elevation: 2,
    },
    rowsPerPageButtonText: {
        fontSize: 14,
        color: '#475569',
        textAlign: 'center',
        minWidth: 20,
    },
    rowsPerPageButtonTextActive: {
        color: 'white',
        fontWeight: '500',
    },
    dataHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    dataHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#334155',
    },
    dataHeaderButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    viewToggleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 2,
    },
    orientationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 2,
    },
    gradientContainerLandscape: {
        paddingTop: 0,
    },
    tableWrapperLandscape: {
        minHeight: 'auto',
    },
    mapContainer: {
        marginBottom: 24,
        borderRadius: 8,
        overflow: 'hidden',
    },
    mapOuterContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    leafletContainer: {
        position: 'relative',
        height: 300,
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
    },
    mapLoading: {
        width: '100%',
        height: 300,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapLoadingText: {
        marginTop: 8,
        color: '#64748b',
    },
    mapHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    expandButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    fullscreenContainer: {
        flex: 1,
        backgroundColor: '#000',
        position: 'relative',
    },
    fullscreenMapContainer: {
        flex: 1,
        position: 'relative',
    },
    fullscreenButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    listContainer: {
        paddingBottom: 80,
        paddingHorizontal: 8,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingCard: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
});

export default DetailLocationScreen; 