import React, { useEffect, useState, memo, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, InteractionManager, Modal, Pressable, Alert, Platform, TextInput, Dimensions, PanResponder, Animated, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { port } from '@/constants/https';
import { useDebouncedCallback } from 'use-debounce';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as XLSX from 'xlsx';
import type { WorkBook, WorkSheet } from 'xlsx';
import useChartStore, { TimeRange } from '@/app/stores/chartStore';
import { Divider } from '@/components/ui/divider';

// We're now importing chart types from the store
// import type { DataPoint, ChartData } from '@/app/stores/chartStore';

interface Location {
    id_lokasi: string;
    nama_sungai: string;
    alamat: string;
    lat: string;
    lon: string;
    tanggal: string;
}

// Time range options - sudah disesuaikan dengan format yang didukung oleh server
const timeRangeOptions: { label: string; value: TimeRange }[] = [
    { label: 'Semua', value: 'ALL' },
    { label: '1 Jam', value: '1h' },
    { label: '3 Jam', value: '3h' },
    { label: '7 Jam', value: '7h' },
    { label: '1 Hari', value: '1d' },
    { label: '2 Hari', value: '2d' },
    { label: '3 Hari', value: '3d' },
    { label: '7 Hari', value: '7d' },
    { label: '1 Bulan', value: '1m' },
    { label: '3 Bulan', value: '3m' },
    { label: '6 Bulan', value: '6m' },
    { label: '1 Tahun', value: '1y' },
];

// Setup notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Define download state type
type DownloadState = 'idle' | 'preparing' | 'downloading' | 'completed' | 'error';

// Download Animation Component
const DownloadAnimation = ({ downloadState }: { downloadState: DownloadState }) => {
    const states = {
        idle: {
            scale: 1,
            translateY: 0,
            opacity: 1,
            backgroundColor: '#edf4ff'
        },
        preparing: {
            scale: 1.05,
            translateY: -2,
            opacity: 1,
            backgroundColor: '#e3f2fd'
        },
        downloading: {
            scale: 1.05,
            translateY: -2,
            opacity: 1,
            backgroundColor: '#bbdefb'
        },
        completed: {
            scale: 1.1,
            translateY: -4,
            opacity: 1,
            backgroundColor: '#2196f3'
        },
        error: {
            scale: 1,
            translateY: 0,
            opacity: 1,
            backgroundColor: '#ffcdd2'
        }
    };

    const currentState = states[downloadState] || states.idle;

    return (
        <MotiView
            style={styles.downloadAnimationContainer}
            from={states.idle}
            animate={currentState}
            transition={{
                type: 'timing',
                duration: 300,
            }}
        >
            <HStack space="sm" style={styles.downloadAnimationContent}>
                {downloadState === 'idle' && (
                    <Ionicons name="download-outline" size={16} color="#333" />
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
                        <Ionicons name="sync-outline" size={16} color="#333" />
                    </MotiView>
                )}
                {downloadState === 'downloading' && (
                    <MotiView
                        from={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{
                            loop: true,
                            duration: 500,
                        }}
                    >
                        <Ionicons name="cloud-download-outline" size={16} color="#333" />
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
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
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
                        <Ionicons name="alert-circle-outline" size={16} color="#d32f2f" />
                    </MotiView>
                )}
                <Text style={[
                    styles.downloadAnimationText,
                    downloadState === 'completed' && styles.downloadAnimationTextCompleted
                ]}>
                    {downloadState === 'idle' && 'Download'}
                    {downloadState === 'preparing' && 'Mempersiapkan Data...'}
                    {downloadState === 'downloading' && 'Mengunduh...'}
                    {downloadState === 'completed' && 'Download Berhasil!'}
                    {downloadState === 'error' && 'Gagal Mengunduh'}
                </Text>
            </HStack>
        </MotiView>
    );
};

const convertToExcel = async (sensorData: Array<{
    title: string;
    as: string;
    data: any[];
}>): Promise<string> => {
    // Create a new workbook
    const wb: WorkBook = XLSX.utils.book_new();

    // Add headers
    const headers = ['Timestamp', ...sensorData.map(sensor => sensor.title)];
    const ws: WorkSheet = XLSX.utils.aoa_to_sheet([headers]);

    // Collect all timestamps and sort them
    const allTimestamps = new Set<string>();
    sensorData.forEach(sensor => {
        sensor.data.forEach(item => {
            allTimestamps.add(item.timestamp);
        });
    });
    const sortedTimestamps = Array.from(allTimestamps).sort();

    // Add data rows
    const rows = sortedTimestamps.map(timestamp => {
        const row = [timestamp];
        sensorData.forEach(sensor => {
            const dataPoint = sensor.data.find(item => item.timestamp === timestamp);
            row.push(dataPoint ? dataPoint[sensor.as] : '');
        });
        return row;
    });

    // Add rows to worksheet
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A2' });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sensor Data');

    // Convert to base64
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    return base64;
};

// Memoized chart component to prevent unnecessary re-renders
const MemoizedLineChart = memo(LineChart);

const FeedsScreen: React.FC = () => {
    // Replace multiple useState hooks with the Zustand store
    const {
        chartData,
        globalPage,
        isRefreshing,
        isDataLoaded,
        selectedTimeRange,
        selectedLocation,
        visibleCharts,
        setChartData,
        setGlobalPage,
        setIsRefreshing,
        setIsDataLoaded,
        setSelectedTimeRange,
        setSelectedLocation,
        setVisibleCharts,
        fetchAllData,
        refreshData,
        handlePageChange,
        handleGlobalPageChange,
        updateChartDataAtIndex
    } = useChartStore();

    // Keep these useState hooks as they are specific to this component
    const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const scrollViewRef = useRef<FlatList>(null);
    const [downloadState, setDownloadState] = useState<DownloadState>('idle');
    const [locations, setLocations] = useState<Location[]>([]);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationSearchQuery, setLocationSearchQuery] = useState('');

    // Tambahkan refs dan animasi untuk BottomSheet
    const bottomSheetAnimation = useRef(new Animated.Value(0)).current;
    const bottomSheetHeight = Dimensions.get('window').height * 0.75;
    const panY = useRef(new Animated.Value(bottomSheetHeight)).current;

    // Tambahkan state dan ref untuk scroll behavior
    const [headerVisible, setHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const headerAnimation = useRef(new Animated.Value(0)).current;

    // Reduce limit for first load to improve initial render speed
    const initialLimit = 100;
    const limit = isDataLoaded ? 100 : initialLimit;  // Number of data points per page

    // Optimize pagination buttons with proper memoization:
    const PaginationButton = memo(({ onPress, disabled, text }: {
        onPress: () => void,
        disabled: boolean,
        text: string
    }) => (
        <Button size="md" variant="solid" action="primary">
            <TouchableOpacity onPress={onPress} disabled={disabled}>
                <ButtonText>{text}</ButtonText>
            </TouchableOpacity>
        </Button>
    ));

    // Improved Empty state component with better user experience
    const EmptyStateView = ({ message, technicalError = '', onRetry = null }) => {
        // Pesan user-friendly berdasarkan error
        const userFriendlyMessage = React.useMemo(() => {
            if (message.includes('Network Error') || message.includes('Failed to fetch')) {
                return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
            }
            else if (message.includes('404') || message.includes('tidak ditemukan')) {
                return 'Data tidak tersedia untuk filter yang dipilih.';
            }
            else if (message.includes('500')) {
                return 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
            }
            else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
                return 'Koneksi timeout. Silakan coba lagi nanti.';
            }
            else if (message === '') {
                return 'Data tidak tersedia';
            }
            return message;
        }, [message]);

        // State untuk menampilkan detail teknis
        const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

        return (
            <View style={styles.emptyStateContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#999" />
                <Text style={styles.emptyStateText}>{userFriendlyMessage}</Text>

                {technicalError && (
                    <>
                        <TouchableOpacity
                            onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
                            style={styles.showDetailsButton}
                        >
                            <Text style={styles.showDetailsText}>
                                {showTechnicalDetails ? 'Sembunyikan Detail' : 'Lihat Detail Error'}
                            </Text>
                        </TouchableOpacity>

                        {showTechnicalDetails && (
                            <View style={styles.technicalErrorContainer}>
                                <Text style={styles.technicalErrorText}>{technicalError}</Text>
                            </View>
                        )}
                    </>
                )}

                {onRetry && (
                    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="refresh-outline" size={16} color="#2196f3" />
                            <Text style={styles.retryButtonText}> Coba Lagi</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // Add loading skeleton
    const ChartSkeleton = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#888" />
        </View>
    );

    const downloadExcel = async () => {
        try {
            setIsExporting(true);
            setDownloadState('preparing');

            // Create a notification ID for tracking
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Mengunduh Data Sensor",
                    body: "Sedang mempersiapkan data...",
                },
                trigger: null,
            });

            // Fetch all data for each sensor without pagination
            const allSensorData = await Promise.all(
                chartData.map(async (chart) => {
                    let allData: any[] = [];
                    let currentPage = 1;
                    let hasMoreData = true;

                    while (hasMoreData) {
                        let apiUrl = '';
                        const baseUrl = chart.url.split('?')[0];

                        if (selectedLocation && selectedLocation !== 'all') {
                            // Untuk semua endpoint gunakan format yang sama
                            apiUrl = `${baseUrl}/${selectedLocation}?page=${currentPage}&limit=1000`;

                            // time range
                            if (selectedTimeRange !== 'ALL') {
                                apiUrl += `&range=${selectedTimeRange}`;
                            }
                        } else {
                            // Jika tidak ada lokasi yang dipilih
                            apiUrl = `${baseUrl}?page=${currentPage}&limit=1000`;

                            // time range
                            if (selectedTimeRange !== 'ALL') {
                                apiUrl += `&range=${selectedTimeRange}`;
                            }
                        }

                        const response = await fetch(apiUrl);
                        if (!response.ok) {
                            throw new Error(`API responded with status ${response.status}`);
                        }

                        const json = await response.json();

                        if (json.success && json.data.length > 0) {
                            allData = [...allData, ...json.data];
                            currentPage++;
                            hasMoreData = currentPage <= json.totalPage;
                        } else {
                            hasMoreData = false;
                        }
                    }

                    return {
                        title: chart.title,
                        as: chart.as,
                        data: allData
                    };
                })
            );

            // Convert data to Excel format
            const base64Data: string = await convertToExcel(allSensorData);

            // Generate filename with timestamp
            const filename = `water_sensor_data_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;

            // Update notification to show downloading
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
                await handleFileSharing(base64Data, filename, notificationId);
            }
        } catch (error) {
            console.error('Error downloading data:', error);
            setDownloadState('error');
            setTimeout(() => {
                setDownloadState('idle');
            }, 2000);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Error",
                    body: "Gagal mengunduh data. Silakan coba lagi.",
                },
                trigger: null,
            });
            Alert.alert('Download Error', 'Gagal mengunduh data. Silakan coba lagi.');
        } finally {
            setIsExporting(false);
        }
    };

    // Helper function to handle file sharing
    const handleFileSharing = async (base64Data: string, filename: string, notificationId: string) => {
        try {
            setDownloadState('downloading');
            const fileUri = FileSystem.cacheDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64
            });

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Export Data Sensor',
                UTI: 'org.openxmlformats.spreadsheetml.sheet'
            });

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
            setTimeout(() => {
                setDownloadState('idle');
            }, 2000);

            Alert.alert(
                'Download Berhasil',
                `File telah berhasil diunduh.`,
                [{ text: 'OK', style: 'default' }]
            );
        } catch (error) {
            console.error('Error sharing file:', error);
            setDownloadState('error');
            setTimeout(() => {
                setDownloadState('idle');
            }, 2000);
            throw new Error('Gagal membagikan file');
        }
    };

    // Fetch data for a specific chart
    const fetchData = async (url: string, as: string, page: number) => {
        // Use the store's fetchData function instead
        const { fetchData } = useChartStore.getState();
        return await fetchData(url, as, page, limit);
    };

    // Use InteractionManager to defer non-critical operations
    useEffect(() => {
        if (isDataLoaded) return;

        InteractionManager.runAfterInteractions(() => {
            fetchAllData();
        });
    }, [isDataLoaded, fetchAllData]);

    // Add back effect for globalPage changes
    useEffect(() => {
        if (isDataLoaded) {
            fetchAllData();
        }
    }, [globalPage, isDataLoaded, fetchAllData]);

    // Add effect to handle parameter changes
    useEffect(() => {
        if (isDataLoaded) {
            // Delay slightly to give the UI time to update state
            setTimeout(() => {
                fetchAllData();
            }, 50);
        }
    }, [selectedTimeRange, selectedLocation, isDataLoaded, fetchAllData]); // Combine filters into single effect

    // Handler untuk memanage scroll dan menampilkan/menyembunyikan header
    const handleScrollHeader = useCallback((event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        // Deteksi arah scroll
        if (currentScrollY <= 10) {
            // Di paling atas atau hampir di atas, selalu tampilkan header
            setHeaderVisible(true);
            Animated.spring(headerAnimation, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 9
            }).start();
        } else if (currentScrollY > lastScrollY.current + 5) {
            // Scroll ke bawah (dengan threshold 5px untuk menghindari jitter), sembunyikan header
            if (headerVisible) {
                setHeaderVisible(false);
                Animated.spring(headerAnimation, {
                    toValue: -110, // Angka negatif sesuai dengan tinggi header
                    useNativeDriver: true,
                    tension: 100,
                    friction: 10
                }).start();
            }
        } else if (currentScrollY < lastScrollY.current - 5) {
            // Scroll ke atas (dengan threshold 5px), tampilkan header
            if (!headerVisible) {
                setHeaderVisible(true);
                Animated.spring(headerAnimation, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 9
                }).start();
            }
        }

        // Simpan posisi scroll terakhir
        lastScrollY.current = currentScrollY;

        // Calculate visible charts for FlatList
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const offsetY = contentOffset.y;
        const height = layoutMeasurement.height;

        // Estimate which charts are visible based on scroll position
        // Assuming each chart container is roughly 400px tall
        const chartHeight = 400;
        const startChart = Math.max(0, Math.floor(offsetY / chartHeight));
        const endChart = Math.min(chartData.length - 1, Math.ceil((offsetY + height) / chartHeight));

        // Set buffer of one chart above and below viewport
        const visibleIndices = [];
        for (let i = Math.max(0, startChart - 1); i <= Math.min(chartData.length - 1, endChart + 1); i++) {
            visibleIndices.push(i);
        }

        setVisibleCharts(visibleIndices);
    }, [headerVisible, setVisibleCharts, chartData.length]);

    // Handle notification response
    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
            const { filepath } = response.notification.request.content.data;
            if (filepath) {
                try {
                    if (Platform.OS === 'android') {
                        // For Android, we need to handle content URIs differently
                        if (filepath.startsWith('content://')) {
                            // Create a temporary copy of the file in cache directory
                            const filename = filepath.split('/').pop();
                            const tempFileUri = FileSystem.cacheDirectory + filename;

                            // Copy the file from content URI to cache
                            await FileSystem.copyAsync({
                                from: filepath,
                                to: tempFileUri
                            });

                            // Share the temporary file
                            await Sharing.shareAsync(tempFileUri, {
                                mimeType: 'text/csv',
                                dialogTitle: 'Export Data Sensor',
                                UTI: 'public.comma-separated-values-text'
                            });
                        } else {
                            // If it's already a file URI, share directly
                            await Sharing.shareAsync(filepath, {
                                mimeType: 'text/csv',
                                dialogTitle: 'Export Data Sensor',
                                UTI: 'public.comma-separated-values-text'
                            });
                        }
                    } else {
                        // For iOS, share directly
                        await Sharing.shareAsync(filepath, {
                            mimeType: 'text/csv',
                            dialogTitle: 'Export Data Sensor',
                            UTI: 'public.comma-separated-values-text'
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

    // Update chart data when time range changes
    useEffect(() => {
        if (isDataLoaded) {
            // Reset pages when time range changes
            const resetPagesChartData = chartData.map((chart) => ({
                ...chart,
                page: 1,
                hasError: false,
                errorMessage: ''
            }));
            setChartData(resetPagesChartData);
            setGlobalPage(1);
            fetchAllData(); // Fetch new data when time range changes
        }
    }, [selectedTimeRange]);

    // Update handler for time range change
    const handleTimeRangeChange = async (range: TimeRange) => {
        setSelectedTimeRange(range);
        setShowTimeRangeModal(false);
        // No need for special handling as we're using server-side filtering now
    };

    // 3) Fetch daftar lokasi sekali
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await fetch(`${port}data_lokasi`);
                const json = await response.json();
                setLocations(json);
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };
        fetchLocations();
    }, []);

    // Buat PanResponder untuk BottomSheet
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) {
                    panY.setValue(gesture.dy);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > bottomSheetHeight * 0.3) {
                    // Swipe down more than 30% -> close
                    closeLocationSheet();
                } else {
                    // Reset to opened position
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    // Function untuk membuka BottomSheet
    const openLocationSheet = () => {
        setShowLocationModal(true);
        setLocationSearchQuery('');
        Animated.timing(bottomSheetAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
        Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    // Function untuk menutup BottomSheet
    const closeLocationSheet = () => {
        Animated.timing(bottomSheetAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowLocationModal(false);
        });
        Animated.spring(panY, {
            toValue: bottomSheetHeight,
            useNativeDriver: true,
        }).start();
    };

    const handleLocationChange = (locationId: string) => {
        setSelectedLocation(locationId);
        closeLocationSheet();
    };

    useEffect(() => {
        if (isDataLoaded) {
            // reset halaman tiap chart
            const resetPagesChartData = chartData.map((chart) => ({
                ...chart,
                page: 1,
                hasError: false,
                errorMessage: ''
            }));
            setChartData(resetPagesChartData);
            setGlobalPage(1);
            fetchAllData();
        }
    }, [selectedLocation]);

    // Fungsi untuk memfilter lokasi berdasarkan search query
    const filteredLocations = useMemo(() => {
        if (!locationSearchQuery.trim()) return locations;
        return locations.filter(loc =>
            loc.nama_sungai.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
            loc.alamat.toLowerCase().includes(locationSearchQuery.toLowerCase())
        );
    }, [locations, locationSearchQuery]);

    return (
        <View style={styles.container}>
            {/* Wrapper untuk tombol filter dengan animasi */}
            <Animated.View
                style={[
                    styles.headerContainer,
                    { transform: [{ translateY: headerAnimation }] }
                ]}
            >
                <View style={styles.headerContentWrapper}>
                    {/* Filter Time Range */}
                    <View style={styles.timeRangeContainer}>
                        <Button variant="outline" size="sm" onPress={() => setShowTimeRangeModal(true)}>
                            <HStack space="sm">
                                <Ionicons name="time-outline" size={16} color="#000" />
                                <ButtonText>
                                    {timeRangeOptions.find(opt => opt.value === selectedTimeRange)?.label}
                                </ButtonText>
                            </HStack>
                        </Button>

                        {/* Download */}
                        <TouchableOpacity onPress={downloadExcel} disabled={isExporting}>
                            <DownloadAnimation downloadState={downloadState} />
                        </TouchableOpacity>
                    </View>

                    {/* Filter Lokasi Button - di tengah */}
                    <Divider className="my-0.5" />
                    <View style={styles.locationFilterContainer}>
                        <Button
                            variant="outline"
                            size="sm"
                            onPress={openLocationSheet}
                            style={styles.locationFilterButton}
                        >
                            <HStack space="sm">
                                <Ionicons name="location-outline" size={16} color="#000" />
                                <ButtonText>
                                    {selectedLocation
                                        ? (locations.find(loc => loc.id_lokasi === selectedLocation)?.nama_sungai || selectedLocation)
                                        : 'Semua Lokasi'}
                                </ButtonText>
                            </HStack>
                        </Button>
                    </View>
                </View>
            </Animated.View>

            <FlatList
                ref={scrollViewRef as any}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                data={chartData}
                keyExtractor={(item, index) => `chart-${index}-${item.title}`}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} />}
                onScroll={handleScrollHeader}
                scrollEventThrottle={16} // Increased for smoother header animation
                windowSize={5} // Controls how many items to render outside of the visible area
                maxToRenderPerBatch={2} // Limits the number of items rendered per batch
                initialNumToRender={2} // Only render 2 charts initially for faster startup
                updateCellsBatchingPeriod={50} // Batch updates to reduce rendering load
                removeClippedSubviews={Platform.OS === 'android'} // Helps with memory usage on Android
                renderItem={({ item: chart, index }) => (
                    <View style={styles.chartContainer} key={index}>
                        <HStack style={styles.chartHeader}>
                            <Text style={styles.title}>{chart.title}</Text>
                            {chart.hasError && (
                                <TouchableOpacity
                                    onPress={() => Alert.alert('Error', chart.errorMessage)}
                                    style={styles.errorInfo}
                                >
                                    <Ionicons name="alert-circle" size={18} color="#ff6b6b" />
                                </TouchableOpacity>
                            )}
                        </HStack>

                        {chart.loading ? (
                            <ChartSkeleton />
                        ) : chart.hasError ? (
                            <EmptyStateView
                                message={
                                    chart.errorMessage.includes('tidak ditemukan') ?
                                        'Data tidak tersedia' :
                                        'Gagal memuat data'
                                }
                                technicalError={chart.errorMessage}
                                onRetry={() => {
                                    // Set chart to loading state
                                    const updatedChartData = [...chartData];
                                    updatedChartData[index].loading = true;
                                    updatedChartData[index].hasError = false;
                                    setChartData(updatedChartData);

                                    // Fetch data for this specific chart
                                    fetchData(chart.url, chart.as, chart.page)
                                        .then(result => {
                                            const updatedData = [...chartData];
                                            updatedData[index] = {
                                                ...updatedData[index],
                                                data: result.formattedData,
                                                loading: false,
                                                totalPage: result.totalPage || 1,
                                                hasError: result.hasError,
                                                errorMessage: result.errorMessage
                                            };
                                            setChartData(updatedData);
                                        })
                                        .catch(error => {
                                            const updatedData = [...chartData];
                                            updatedData[index] = {
                                                ...updatedData[index],
                                                loading: false,
                                                hasError: true,
                                                errorMessage: error instanceof Error ? error.message : 'Terjadi kesalahan'
                                            };
                                            setChartData(updatedData);
                                        });
                                }}
                            />
                        ) : chart.data.length === 0 ? (
                            <EmptyStateView message="Data tidak ditemukan" />
                        ) : visibleCharts.includes(index) ? (
                            <MemoizedLineChart
                                key={`${index}-${chart.page}-${selectedTimeRange}`}  // Added timeRange to key for proper re-render
                                focusEnabled={false}  // Disable focus animation for performance
                                isAnimated={false}  // Disable animations for large datasets
                                data={chart.data}
                                initialSpacing={20}
                                spacing={50}
                                thickness={5} // Reduce line thickness
                                color={chart.color}
                                dataPointsColor={'black'}
                                dataPointLabelWidth={20}
                                dataPointsRadius={3} // Smaller data points
                                xAxisColor={'black'}
                                yAxisColor={'black'}
                                yAxisTextStyle={{ color: 'gray', fontSize: 15 }}
                                xAxisLabelTextStyle={styles.italicLabel}
                                xAxisLabelsHeight={20}
                                xAxisIndicesWidth={10}
                                maxValue={chart.maxValue}
                                mostNegativeValue={-(chart.maxValue / 2)}
                                startFillColor={'rgba(255, 154, 154, 0.4)'}
                                endFillColor={'rgba(255, 154, 154, 0.1)'}
                                startOpacity={0.4}
                                endOpacity={0.1}
                                areaChart
                                rotateLabel={false}
                                noOfSections={5}
                                pointerConfig={{
                                    pointerStripHeight: 160,
                                    pointerStripColor: 'lightgray',
                                    stripOverPointer: true,
                                    pointerColor: chart.color,
                                    radius: 6,
                                    pointerLabelWidth: 100,
                                    activatePointersOnLongPress: true,
                                    autoAdjustPointerLabelPosition: true,
                                }}
                                dashWidth={5}
                                labelsExtraHeight={60}
                                rulesColor="rgba(0,0,0,0.1)"
                            />
                        ) : (
                            <View style={styles.loadingContainer} />
                        )}

                        {/* Pagination for individual chart */}
                        {!chart.hasError && chart.data.length > 0 && (
                            <View style={styles.pagination}>
                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'first')}
                                    disabled={chart.page <= 1}
                                    text="First"
                                />

                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'prev')}
                                    disabled={chart.page <= 1}
                                    text="Prev"
                                />

                                <Text>{`Page ${chart.page} of ${chart.totalPage || 1}`}</Text>
                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'next')}
                                    disabled={chart.page >= chart.totalPage}
                                    text="Next"
                                />

                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'last')}
                                    disabled={chart.page >= chart.totalPage}
                                    text="Last"
                                />
                            </View>
                        )}
                    </View >
                )}
                ListFooterComponent={() => (
                    <View style={styles.globalPagination}>
                        <HStack space="md" reversed={false}>
                            <VStack space="md" reversed={false}>
                                <Button variant='outline' size='md'>
                                    <TouchableOpacity onPress={() => handleGlobalPageChange('prev')} disabled={globalPage === 1}>
                                        <ButtonText>Prev All</ButtonText>
                                    </TouchableOpacity>
                                </Button>

                                <Button variant='outline' size='md'>
                                    <TouchableOpacity onPress={() => handleGlobalPageChange('first')} disabled={globalPage === 1}>
                                        <ButtonText>First All</ButtonText>
                                    </TouchableOpacity>
                                </Button>
                            </VStack>

                            <Text className='px-5 text-center'>{`Global Page: ${globalPage}`}</Text>

                            <VStack space="md" reversed={false}>
                                <Button variant='outline' size='md'>
                                    <TouchableOpacity onPress={() => handleGlobalPageChange('next')} disabled={globalPage === chartData[0].totalPage}>
                                        <ButtonText>Next All</ButtonText>
                                    </TouchableOpacity>
                                </Button>

                                <Button variant='outline' size='md'>
                                    <TouchableOpacity onPress={() => handleGlobalPageChange('last')} disabled={globalPage === chartData[0].totalPage}>
                                        <ButtonText>Last All</ButtonText>
                                    </TouchableOpacity>
                                </Button>
                            </VStack>
                        </HStack>
                    </View>
                )}
            />

            <View style={{ height: 100 }}></View>

            {/* Time Range Modal */}
            <Modal
                visible={showTimeRangeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTimeRangeModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Pilih Rentang Waktu</Text>
                            <View style={styles.timeRangeOptions}>
                                {timeRangeOptions.map((option) => (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.timeRangeOption,
                                            selectedTimeRange === option.value && styles.timeRangeOptionSelected
                                        ]}
                                        onPress={() => handleTimeRangeChange(option.value)}
                                    >
                                        <Text style={[
                                            styles.timeRangeOptionText,
                                            selectedTimeRange === option.value && styles.timeRangeOptionTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                            <Button
                                variant="outline"
                                size="sm"
                                onPress={() => setShowTimeRangeModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <ButtonText>Tutup</ButtonText>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* BottomSheet Location Picker */}
            <Modal
                visible={showLocationModal}
                transparent
                animationType="none"
                onRequestClose={closeLocationSheet}
            >
                <Animated.View
                    style={[
                        styles.bottomSheetOverlay,
                        {
                            backgroundColor: bottomSheetAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'],
                            })
                        }
                    ]}
                    onTouchEnd={closeLocationSheet}
                >
                    <Animated.View
                        style={[
                            styles.bottomSheetContainer,
                            {
                                transform: [
                                    {
                                        translateY: panY.interpolate({
                                            inputRange: [0, bottomSheetHeight],
                                            outputRange: [0, bottomSheetHeight],
                                            extrapolate: 'clamp',
                                        })
                                    }
                                ]
                            }
                        ]}
                        onTouchEnd={(e) => e.stopPropagation()}
                    >
                        {/* Drag handle for BottomSheet */}
                        <View {...panResponder.panHandlers} style={styles.dragHandle}>
                            <View style={styles.dragIndicator} />
                        </View>

                        <Text style={styles.modalTitle}>Pilih Lokasi</Text>

                        {/* Search Input */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Cari lokasi..."
                                value={locationSearchQuery}
                                onChangeText={setLocationSearchQuery}
                                clearButtonMode="while-editing"
                            />
                            {locationSearchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setLocationSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color="#666" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView style={styles.locationScrollView} contentContainerStyle={styles.locationOptionsContainer}>
                            {/* Semua Lokasi */}
                            <Pressable
                                style={[
                                    styles.locationOption,
                                    selectedLocation === '' && styles.locationOptionSelected
                                ]}
                                onPress={() => handleLocationChange('')}
                            >
                                <Text
                                    style={[
                                        styles.locationOptionText,
                                        selectedLocation === '' && styles.locationOptionTextSelected
                                    ]}
                                >
                                    Semua Lokasi
                                </Text>
                            </Pressable>
                            {/* List lokasi */}
                            {filteredLocations.map((loc) => (
                                <Pressable
                                    key={loc.id_lokasi}
                                    style={[
                                        styles.locationOption,
                                        selectedLocation === loc.id_lokasi && styles.locationOptionSelected
                                    ]}
                                    onPress={() => handleLocationChange(loc.id_lokasi)}
                                >
                                    <Text
                                        style={[
                                            styles.locationOptionText,
                                            selectedLocation === loc.id_lokasi && styles.locationOptionTextSelected
                                        ]}
                                    >
                                        {loc.nama_sungai}
                                    </Text>
                                    <Text style={styles.locationAddress}>
                                        {loc.alamat}
                                    </Text>
                                </Pressable>
                            ))}

                            {filteredLocations.length === 0 && (
                                <View style={styles.noResultContainer}>
                                    <Ionicons name="search-outline" size={40} color="#ccc" />
                                    <Text style={styles.noResultText}>Lokasi tidak ditemukan</Text>
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
        padding: 5,
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 5,
        marginBottom: 20,
        elevation: 2,
        overflow: 'hidden',  // Add this for better rendering performance
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        alignSelf: 'center',
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 5,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingHorizontal: 5,
    },
    globalPagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    loadingContainer: {
        height: 200,  // Fixed height for loading state
        justifyContent: 'center',
    },
    italicLabel: {
        fontStyle: 'italic',
        fontSize: 9,
        color: 'gray',
        marginTop: 10,
        transform: [{ rotate: '-60deg' }],
        textAlign: 'center',
        fontFamily: 'Poppins-Regular',
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
        position: 'absolute',
        width: 70,  // Give enough width for the label
        paddingHorizontal: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent background to improve readability
    },
    timeRangeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#fff',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        width: '80%',
        maxWidth: 350,
        alignSelf: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    timeRangeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    timeRangeOption: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        minWidth: 100,
        alignItems: 'center',
    },
    timeRangeOptionSelected: {
        backgroundColor: '#007AFF',
    },
    timeRangeOptionText: {
        color: '#333',
        fontSize: 14,
    },
    timeRangeOptionTextSelected: {
        color: '#fff',
    },
    modalCloseButton: {
        marginTop: 20,
        alignSelf: 'center',
    },
    emptyStateContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 15,
    },
    emptyStateText: {
        marginTop: 10,
        color: '#666',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
    },
    errorInfo: {
        marginLeft: 8,
        padding: 2,
    },
    downloadAnimationContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 120,
    },
    downloadAnimationContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadAnimationText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    downloadAnimationTextCompleted: {
        color: '#fff',
    },
    locationFilterContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationFilterButton: {
        alignSelf: 'center',
    },
    locationModalOverlay: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    locationModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        width: '100%',
        height: '75%',
        alignSelf: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -3,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 15,
        height: 45,
    },
    searchIcon: {
        marginRight: 5,
    },
    searchInput: {
        flex: 1,
        height: 40,
        paddingHorizontal: 8,
    },
    locationScrollView: {
        flex: 1,
        marginBottom: 15,
    },
    locationOptionsContainer: {
        paddingBottom: 20,
    },
    locationOption: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        marginBottom: 8,
        width: '100%',
    },
    locationOptionSelected: {
        backgroundColor: '#007AFF',
    },
    locationOptionText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '500',
    },
    locationOptionTextSelected: {
        color: '#fff',
    },
    locationAddress: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
    noResultContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    noResultText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    },
    bottomSheetOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheetContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingTop: 12,
        height: '75%',
        width: '100%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -3,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    dragHandle: {
        width: '100%',
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    dragIndicator: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#DDD',
    },
    showDetailsButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        marginTop: 10,
    },
    showDetailsText: {
        color: '#2196f3',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    technicalErrorContainer: {
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 5,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        width: '100%',
        maxWidth: 300,
    },
    technicalErrorText: {
        color: '#666',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    retryButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: '#e3f2fd',
        borderRadius: 20,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#bbdefb',
    },
    retryButtonText: {
        color: '#2196f3',
        fontSize: 14,
        fontWeight: '500',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    headerContentWrapper: {
        width: '100%',
    },
    scrollViewContent: {
        paddingTop: 110, // Sesuaikan dengan tinggi total header
        paddingBottom: 20,
    },
});

export default FeedsScreen;