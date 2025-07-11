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
import {
    BottomSheet,
    BottomSheetDragIndicator,
    BottomSheetBackdrop,
    BottomSheetContent,
    BottomSheetScrollView
} from '@/components/ui/bottomsheet';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Box } from '@/components/ui/box';
import { BottomSheetPortal } from '@/components/ui/bottomsheet';
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter
} from '@/components/ui/alert-dialog';
import { LinearGradient } from 'expo-linear-gradient';

// Custom Alert Dialog Components
interface CustomAlertDialogProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    message: string;
    actions: {
        text: string;
        onPress: () => void;
        type?: 'primary' | 'secondary' | 'cancel' | 'success' | 'error';
        icon?: string;
    }[];
    icon?: {
        name: string;
        color: string;
    };
}

const CustomAlertDialog: React.FC<CustomAlertDialogProps> = ({
    visible,
    onClose,
    title,
    message,
    actions,
    icon
}) => {
    return (
        <AlertDialog isOpen={visible} onClose={onClose}>
            <AlertDialogBackdrop />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <View style={styles.dialogHeader}>
                        {icon && (
                            <Ionicons
                                name={icon.name as any}
                                size={32}
                                color={icon.color}
                                style={styles.dialogIcon}
                            />
                        )}
                        <Text style={styles.dialogTitle}>
                            {title}
                        </Text>
                    </View>
                </AlertDialogHeader>
                <AlertDialogBody>
                    <Text style={styles.dialogMessage}>
                        {message}
                    </Text>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <View style={styles.dialogButtonContainerVertical}>
                        {actions.map((action, index) => {
                            const isCancel = action.type === 'cancel';
                            const isSuccess = action.type === 'success';
                            const isError = action.type === 'error';
                            const isPrimary = action.type === 'primary' || (!action.type && !isCancel);

                            let buttonStyle = styles.dialogPrimaryButtonFull;
                            let textStyle = styles.dialogPrimaryButtonText;
                            let gradientColors: [string, string] = ['#60a5fa', '#3b82f6'];

                            if (isCancel) {
                                buttonStyle = styles.dialogSecondaryButtonFull;
                                textStyle = styles.dialogSecondaryButtonText;
                            } else if (isSuccess) {
                                gradientColors = ['#34d399', '#10b981'];
                            } else if (isError) {
                                gradientColors = ['#f87171', '#ef4444'];
                            }

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={buttonStyle}
                                    onPress={action.onPress}
                                >
                                    {!isCancel && (
                                        <LinearGradient
                                            colors={gradientColors}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        />
                                    )}
                                    <View style={styles.buttonContentRow}>
                                        {action.icon && (
                                            <Ionicons
                                                name={action.icon as any}
                                                size={18}
                                                color={isCancel ? '#64748b' : 'white'}
                                                style={{ marginRight: 8 }}
                                            />
                                        )}
                                        <Text style={textStyle}>
                                            {action.text}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// We're now importing chart types from the store
// import type { DataPoint, ChartData } from '@/app/stores/chartStore';

interface Location {
    id_lokasi: number;
    nama_sungai: string;
    alamat: string;
    lat: string;
    lon: string;
    tanggal: string;
}

// State type for location data fetching
type DataState = 'idle' | 'loading' | 'success' | 'error';

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
                    <Ionicons name="document-text-outline" size={16} color="#333" />
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
                        from={{ translateY: -2 }}
                        animate={{ translateY: 2 }}
                        transition={{
                            loop: true,
                            repeatReverse: true,
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
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
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
                        <Ionicons name="alert-circle" size={16} color="#d32f2f" />
                    </MotiView>
                )}
                <Text style={[
                    styles.downloadAnimationText,
                    downloadState === 'completed' && styles.downloadAnimationTextCompleted
                ]}>
                    {downloadState === 'idle' && 'Unduh Excel'}
                    {downloadState === 'preparing' && 'Menyiapkan...'}
                    {downloadState === 'downloading' && 'Mengunduh...'}
                    {downloadState === 'completed' && 'Berhasil!'}
                    {downloadState === 'error' && 'Gagal'}
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

    // Log jumlah data yang akan diekspor
    console.log('Jumlah sensor datasets:', sensorData.length);
    sensorData.forEach((sensor, idx) => {
        console.log(`Sensor ${idx} (${sensor.title}): ${sensor.data.length} records`);
    });

    // Inspeksi struktur data untuk memastikan format sudah benar
    if (sensorData.length > 0 && sensorData[0].data.length > 0) {
        console.log('Sample data structure for first sensor:');
        console.log(JSON.stringify(sensorData[0].data[0], null, 2));
    }

    // Add headers
    const headers = ['Timestamp', ...sensorData.map(sensor => sensor.title)];
    const ws: WorkSheet = XLSX.utils.aoa_to_sheet([headers]);

    // Collect all timestamps and sort them
    const allTimestamps = new Set<string>();

    console.log('Checking timestamp field in first record of each sensor:');
    sensorData.forEach(sensor => {
        if (sensor.data && Array.isArray(sensor.data) && sensor.data.length > 0) {
            // Cek properti apa saja yang ada di objek pertama untuk debugging
            console.log(`${sensor.title} first record keys:`, Object.keys(sensor.data[0]));

            // Coba beberapa kemungkinan nama field untuk timestamp
            const possibleTimestampFields = ['timestamp', 'time', 'date', 'waktu', 'tanggal', 'created_at'];
            let timestampField = '';

            // Cari field yang berisi timestamp
            for (const field of possibleTimestampFields) {
                if (field in sensor.data[0]) {
                    timestampField = field;
                    console.log(`Found timestamp field for ${sensor.title}: ${field}`);
                    break;
                }
            }

            if (!timestampField) {
                console.warn(`No timestamp field found for ${sensor.title}. Using first field:`, Object.keys(sensor.data[0])[0]);
                // Gunakan field pertama sebagai fallback jika tidak ada timestamp yang jelas
                timestampField = Object.keys(sensor.data[0])[0];
            }

            // Collect timestamps dari field yang ditemukan
            sensor.data.forEach(item => {
                if (item && item[timestampField]) {
                    const timestamp = typeof item[timestampField] === 'string'
                        ? item[timestampField]
                        : String(item[timestampField]);

                    if (timestamp) {
                        try {
                            // Pastikan ini adalah timestamp valid
                            const date = new Date(timestamp);
                            if (!isNaN(date.getTime())) {
                                allTimestamps.add(timestamp);
                            } else {
                                console.warn(`Invalid timestamp detected: ${timestamp}`);
                            }
                        } catch (e) {
                            console.warn(`Error processing timestamp: ${timestamp}`, e);
                        }
                    }
                }
            });
        }
    });

    console.log(`Total unique timestamps collected: ${allTimestamps.size}`);

    // Jika masih tidak ada timestamp, coba pendekatan lain
    if (allTimestamps.size === 0) {
        console.warn('No timestamps found. Creating synthetic timestamps from record index');

        // Ambil jumlah data terbanyak
        const maxDataLength = Math.max(...sensorData.map(sensor => sensor.data?.length || 0));

        // Buat timestamp sintetis
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < maxDataLength; i++) {
            const date = new Date(startDate);
            date.setMinutes(i); // Buat data dengan interval 1 menit
            allTimestamps.add(date.toISOString());
        }

        console.log(`Created ${allTimestamps.size} synthetic timestamps`);
    }

    // Sort timestamps chronologically
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
    });

    // Format timestamp untuk Excel (gunakan format yang terbaca Excel)
    const formatTimestamp = (timestamp: string): string => {
        try {
            // Format timestamp agar Excel bisa membacanya sebagai tanggal/waktu
            // Tambahkan tanda kutip di awal untuk mencegah Excel mengubah format
            const formattedDate = moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
            return `"${formattedDate}"`;  // Tambahkan tanda kutip sebagai literal string
        } catch (error) {
            console.error('Error formatting timestamp:', timestamp, error);
            return `"${timestamp}"`;  // Return original with quotes if formatting fails
        }
    };

    // Format nilai numerik untuk konsistensi
    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return value.toFixed(2);
        return String(value);
    };

    // Add data rows with proper formatting
    const rows = sortedTimestamps.map(timestamp => {
        const formattedTimestamp = formatTimestamp(timestamp);

        // Buat row baru dimulai dengan timestamp
        const row = [formattedTimestamp];

        // Tambahkan data dari setiap sensor pada timestamp yang sama
        sensorData.forEach(sensor => {
            if (!sensor.data || !Array.isArray(sensor.data) || !sensor.data.length) {
                row.push('');
                return;
            }

            // Deteksi field timestamp
            const firstRecord = sensor.data[0];
            const possibleTimestampFields = ['timestamp', 'time', 'date', 'waktu', 'tanggal', 'created_at'];
            let timestampField = '';

            for (const field of possibleTimestampFields) {
                if (field in firstRecord) {
                    timestampField = field;
                    break;
                }
            }

            if (!timestampField) {
                timestampField = Object.keys(firstRecord)[0];
            }

            // Cari data point yang timestamp-nya cocok
            const dataPoint = sensor.data.find(item => {
                if (!item || !item[timestampField]) return false;

                const itemTimestamp = String(item[timestampField]);
                return itemTimestamp === timestamp ||
                    moment(itemTimestamp).format('YYYY-MM-DD HH:mm:ss') === moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
            });

            // Jika data point ditemukan, ambil nilai sensor
            if (dataPoint && sensor.as && dataPoint[sensor.as] !== undefined) {
                row.push(formatValue(dataPoint[sensor.as]));
            } else {
                // Coba ambil item pertama yang ditemukan (fallback)
                const fieldName = sensor.as || Object.keys(firstRecord).find(key => key !== timestampField);
                if (dataPoint && fieldName && dataPoint[fieldName] !== undefined) {
                    row.push(formatValue(dataPoint[fieldName]));
                } else {
                    row.push(''); // Jika tidak ada data yang cocok
                }
            }
        });

        return row;
    });

    // Log untuk debugging
    console.log(`Generated ${rows.length} data rows for excel`);
    if (rows.length > 0) {
        console.log('First row sample:', rows[0]);
        console.log('Last row sample:', rows[rows.length - 1]);
    }

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

// Loading component for locations
const LocationsLoadingState = () => (
    <View style={styles.locationStateContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
        <Text style={styles.locationStateText}>Memuat daftar lokasi...</Text>
    </View>
);

// Error component for locations with technical details
const LocationsErrorState = ({ error, onRetry }: { error: string, onRetry: () => void }) => {
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

    return (
        <View style={styles.locationStateContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
            <Text style={styles.locationStateText}>
                Gagal memuat daftar lokasi
            </Text>

            <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                activeOpacity={0.7}
            >
                <HStack space="sm" style={{ alignItems: 'center' }}>
                    <Ionicons name="refresh-outline" size={16} color="#2196f3" />
                    <Text style={styles.retryButtonText}>Coba Lagi</Text>
                </HStack>
            </TouchableOpacity>

            {/* Technical error details for developers */}
            <TouchableOpacity
                style={styles.showDetailsButton}
                onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
            >
                <Text style={styles.showDetailsText}>
                    {showTechnicalDetails ? 'Sembunyikan Detail Teknis' : 'Lihat Detail Teknis'}
                </Text>
            </TouchableOpacity>

            {showTechnicalDetails && (
                <View style={styles.technicalErrorContainer}>
                    <Text style={styles.technicalErrorText}>{error}</Text>
                </View>
            )}
        </View>
    );
};

// Empty state for when no locations match the search
const LocationsEmptyState = ({ debugInfo = '' }: { debugInfo?: string }) => (
    <View style={styles.locationStateContainer}>
        <Ionicons name="location-outline" size={48} color="#9e9e9e" />
        <Text style={styles.locationStateText}>
            Tidak ada lokasi yang tersedia
        </Text>
        <Text style={styles.locationStateSubText}>
            Silakan coba lagi nanti atau hubungi administrator
        </Text>
        {debugInfo ? (
            <View style={{ marginTop: 20 }}>
                <TouchableOpacity
                    style={styles.showDetailsButton}
                    onPress={() => console.log('Debug Info:', debugInfo)}
                >
                    <Text style={styles.showDetailsText}>Debug Info</Text>
                </TouchableOpacity>
            </View>
        ) : null}
    </View>
);

// Empty search results component
const LocationsEmptySearch = ({ query, onClear }: { query: string, onClear: () => void }) => (
    <View style={styles.locationStateContainer}>
        <Ionicons name="search-outline" size={48} color="#9e9e9e" />
        <Text style={styles.locationStateText}>
            Tidak ada hasil untuk "{query}"
        </Text>
        <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={onClear}
            activeOpacity={0.7}
        >
            <Text style={styles.clearSearchButtonText}>
                Hapus Pencarian
            </Text>
        </TouchableOpacity>
    </View>
);

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
    const [locationsState, setLocationsState] = useState<DataState>('idle');
    const [locationError, setLocationError] = useState<string>('');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationSearchQuery, setLocationSearchQuery] = useState('');

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
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.paginationButton,
                disabled && styles.paginationButtonDisabled
            ]}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.paginationButtonText,
                disabled && styles.paginationButtonTextDisabled
            ]}>
                {text}
            </Text>
        </TouchableOpacity>
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

    // Memoize the chart item to prevent unnecessary re-renders
    const ChartItem = useMemo(() => memo(({ chart, index }: { chart: any, index: number }) => {
        return (
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
                ) : (
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
        );
    }), [chartData, selectedTimeRange]);

    // Fungsi untuk download langsung dari server
    const serverDownloadExcel = async (useCurrentLocation: boolean = false) => {
        try {
            setIsExporting(true);
            setDownloadState('preparing');

            // Buat notifikasi untuk tracking
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Mengunduh Data Sensor",
                    body: "Mempersiapkan proses unduh dari server...",
                },
                trigger: null,
            });

            // Buat URL berdasarkan pilihan lokasi
            let downloadUrl = '';
            if (useCurrentLocation && selectedLocation && selectedLocation !== 'all' && selectedLocation !== '') {
                // Download berdasarkan lokasi tertentu menggunakan endpoint yang benar
                downloadUrl = `${port}data_combined/export/${selectedLocation}`;
            } else {
                // Download semua data menggunakan endpoint yang benar
                downloadUrl = `${port}data_combined_export/all`;
            }

            console.log(`Mengunduh Excel dari: ${downloadUrl}`);
            setDownloadState('downloading');

            // Update notifikasi
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Mengunduh Data Sensor",
                    body: "Mengunduh file dari server...",
                },
                trigger: null,
                identifier: notificationId,
            });

            // Buat nama file dengan timestamp
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const filename = useCurrentLocation ?
                `sensor_data_lokasi_${selectedLocation}_${timestamp}.xlsx` :
                `all_sensor_data_${timestamp}.xlsx`;

            // Download file ke cache terlebih dahulu
            const fileUri = FileSystem.cacheDirectory + filename;
            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                fileUri,
                {
                    headers: {
                        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    }
                }
            );

            // Tambahkan timeout untuk menangani jika server tidak merespons
            const downloadPromise = downloadResumable.downloadAsync();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Download timeout - server tidak merespons')), 60000); // 60 detik timeout
            });

            const { uri } = await Promise.race([downloadPromise, timeoutPromise]) as any;

            if (!uri) {
                throw new Error('Download gagal - URI tidak valid');
            }

            setDownloadState('completed');
            setTempFileUri(uri);
            setTempFileName(filename);

            // Update notifikasi ke selesai
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Unduh Selesai",
                    body: `File ${filename} berhasil diunduh.`,
                    data: { filepath: uri }
                },
                trigger: null,
                identifier: notificationId,
            });

            // Show success dialog with options
            setAlertTitle('📊 Unduhan Berhasil');
            setAlertMessage('File Excel telah berhasil diunduh. Apa yang ingin Anda lakukan dengan file ini?');
            setShowSuccessDialog(true);

            // Reset state setelah beberapa detik
            setTimeout(() => setDownloadState('idle'), 2000);

        } catch (error) {
            console.error('Error downloading Excel from server:', error);
            setDownloadState('error');

            // Reset state setelah beberapa detik
            setTimeout(() => setDownloadState('idle'), 2000);

            setAlertTitle('❌ Unduhan Gagal');
            setAlertMessage(`Terjadi kesalahan saat mengunduh data dari server:\n\n${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}\n\nSilakan coba lagi nanti.`);
            setShowErrorDialog(true);
        } finally {
            setIsExporting(false);
        }
    };

    const handleShareFile = async () => {
        try {
            await Sharing.shareAsync(tempFileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Bagikan Data Sensor',
                UTI: 'org.openxmlformats.spreadsheetml.sheet'
            });
        } catch (error) {
            console.error('Error sharing file:', error);
            setAlertTitle('Error');
            setAlertMessage('Gagal membagikan file');
            setShowErrorDialog(true);
        }
    };

    const handleSaveToDevice = async () => {
        try {
            if (Platform.OS === 'android') {
                // Request directory permissions for Android
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

                if (permissions.granted) {
                    // Create file in the selected directory
                    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                        permissions.directoryUri,
                        tempFileName,
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    );

                    // Read the cached file
                    const fileContent = await FileSystem.readAsStringAsync(tempFileUri, {
                        encoding: FileSystem.EncodingType.Base64
                    });

                    // Write to the selected directory
                    await FileSystem.writeAsStringAsync(fileUri, fileContent, {
                        encoding: FileSystem.EncodingType.Base64
                    });

                    setAlertTitle('✅ Berhasil Disimpan');
                    setAlertMessage(`File ${tempFileName} telah disimpan ke folder yang Anda pilih.`);
                    setShowSuccessDialog(true);
                }
            } else if (Platform.OS === 'ios') {
                // For iOS, share and ask them to save
                await Sharing.shareAsync(tempFileUri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Simpan Data Sensor ke Perangkat',
                    UTI: 'org.openxmlformats.spreadsheetml.sheet'
                });
            }
        } catch (error) {
            console.error('Error saving file:', error);
            setAlertTitle('❌ Gagal Menyimpan');
            setAlertMessage('Terjadi kesalahan saat menyimpan file ke perangkat.');
            setShowErrorDialog(true);
        }
    };

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
                    let failedAttempts = 0;
                    const MAX_FAILED_ATTEMPTS = 3;

                    // Log progress
                    console.log(`Fetching data for ${chart.title}...`);

                    while (hasMoreData && failedAttempts < MAX_FAILED_ATTEMPTS) {
                        try {
                            let apiUrl = '';
                            const baseUrl = chart.url.split('?')[0];

                            if (selectedLocation && selectedLocation !== 'all' && selectedLocation !== '') {
                                // Untuk lokasi spesifik
                                apiUrl = `${baseUrl}/${selectedLocation}?page=${currentPage}&limit=500`;
                            } else {
                                // Untuk semua lokasi
                                apiUrl = `${baseUrl}?page=${currentPage}&limit=500`;
                            }

                            // Tambahkan time range filter
                            if (selectedTimeRange !== 'ALL') {
                                apiUrl += `&range=${selectedTimeRange}`;
                            }

                            console.log(`Fetching page ${currentPage} from ${apiUrl}`);

                            const response = await fetch(apiUrl);
                            if (!response.ok) {
                                throw new Error(`API responded with status ${response.status}`);
                            }

                            const json = await response.json();
                            console.log(`Received ${json.data?.length || 0} records, totalPage: ${json.totalPage || 0}`);

                            if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
                                // Validasi data
                                const validData = json.data.filter(item => item && typeof item === 'object');
                                console.log(`${validData.length} valid records found on page ${currentPage}`);

                                allData = [...allData, ...validData];
                                currentPage++;

                                // Check if we've reached the last page
                                hasMoreData = json.totalPage ? currentPage <= json.totalPage : false;
                            } else {
                                console.log(`No more data found for ${chart.title} at page ${currentPage}`);
                                hasMoreData = false;
                            }
                        } catch (error) {
                            failedAttempts++;
                            console.error(`Error fetching page ${currentPage} for ${chart.title}:`, error);

                            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                                console.error(`Max failed attempts reached for ${chart.title}, stopping pagination`);
                                hasMoreData = false;
                            } else {
                                // Wait before retrying
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                    }

                    console.log(`Total ${allData.length} records collected for ${chart.title}`);

                    return {
                        title: chart.title,
                        as: chart.as,
                        data: allData
                    };
                })
            );

            // Update notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Mengunduh Data Sensor",
                    body: "Sedang mengkonversi data ke Excel...",
                },
                trigger: null,
                identifier: notificationId.toString(),
            });

            // Convert data to Excel format
            console.log('Converting data to Excel format...');
            const base64Data: string = await convertToExcel(allSensorData);

            // Generate filename with timestamp
            const filename = `water_sensor_data_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
            setTempFileName(filename);

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

            // Simpan file ke cache terlebih dahulu
            const tempFileUri = FileSystem.cacheDirectory + filename;
            setTempFileUri(tempFileUri);
            await FileSystem.writeAsStringAsync(tempFileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64
            });

            // Set state ke completed
            setDownloadState('completed');

            // Update notifikasi ke selesai
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Unduh Selesai",
                    body: `File ${filename} berhasil diunduh.`,
                    data: { filepath: tempFileUri }
                },
                trigger: null,
                identifier: notificationId.toString(),
            });

            // Reset state after 2 seconds
            setTimeout(() => {
                setDownloadState('idle');
            }, 2000);

            // Show success dialog with options
            setAlertTitle('📊 Data Siap Digunakan');
            setAlertMessage(`${allSensorData.reduce((total, sensor) => total + sensor.data.length, 0)} data sensor telah berhasil diekspor. Apa yang ingin Anda lakukan dengan file Excel ini?`);
            setShowSuccessDialog(true);
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

            setAlertTitle('❌ Ekspor Gagal');
            setAlertMessage(`Gagal mengekspor data. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setShowErrorDialog(true);
        } finally {
            setIsExporting(false);
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
    }, [headerVisible]);

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
                setLocationsState('loading');
                console.log('Fetching locations from:', `${port}data_lokasi`);
                const response = await fetch(`${port}data_lokasi`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const json = await response.json();
                console.log('Raw locations response:', json);
                console.log('Number of locations:', json.length);
                console.log('First location:', json[0]);

                setLocations(json);
                setLocationsState('success');
                console.log('Locations state updated:', json.length, 'items');
            } catch (error) {
                console.error('Error fetching locations:', error);
                setLocationError(error instanceof Error ? error.message : 'Failed to fetch locations');
                setLocationsState('error');
            }
        };
        fetchLocations();
    }, []);

    // Function untuk membuka BottomSheet
    const openLocationSheet = () => {
        // Reset the search query
        setLocationSearchQuery('');

        // Show the modal
        setShowLocationModal(true);
    };

    // Function untuk menutup BottomSheet
    const closeLocationSheet = () => {
        // Hide the modal
        setShowLocationModal(false);
    };

    // Function to retry fetching locations
    const retryFetchLocations = useCallback(async () => {
        try {
            setLocationsState('loading');
            const response = await fetch(`${port}data_lokasi`);

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const json = await response.json();
            setLocations(json);
            setLocationsState('success');
        } catch (error) {
            console.error('Error fetching locations:', error);
            setLocationsState('error');
            setLocationError(error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga');
        }
    }, []);

    // Function for handling location changes with proper type handling
    const handleLocationChange = (locationId: number | string) => {
        if (locationId === '') {
            // "All locations" case
            setSelectedLocation('');
        } else {
            // Convert numeric ID to string for the store
            setSelectedLocation(String(locationId));
        }
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

    // Optimize keyExtractor for FlatList
    const keyExtractor = useCallback((item, index) => `chart-${index}-${item.title}`, []);

    // Memoize the renderItem function to prevent it from being recreated on each render
    const renderItem = useCallback(({ item, index }) => {
        return <ChartItem chart={item} index={index} />;
    }, [ChartItem]);

    // Memoize the ListFooterComponent for FlatList
    const ListFooterComponent = useCallback(() => (
        <View style={styles.globalPagination}>
            <HStack space="md" reversed={false}>
                <VStack space="md" reversed={false}>
                    <TouchableOpacity
                        style={[
                            styles.globalPaginationButton,
                            globalPage === 1 && styles.globalPaginationButtonDisabled
                        ]}
                        onPress={() => handleGlobalPageChange('prev')}
                        disabled={globalPage === 1}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.globalPaginationButtonText}>Prev All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.globalPaginationButton,
                            globalPage === 1 && styles.globalPaginationButtonDisabled
                        ]}
                        onPress={() => handleGlobalPageChange('first')}
                        disabled={globalPage === 1}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.globalPaginationButtonText}>First All</Text>
                    </TouchableOpacity>
                </VStack>

                <Text style={styles.globalPageIndicator}>{`Global Page: ${globalPage}`}</Text>

                <VStack space="md" reversed={false}>
                    <TouchableOpacity
                        style={[
                            styles.globalPaginationButton,
                            globalPage === chartData[0]?.totalPage && styles.globalPaginationButtonDisabled
                        ]}
                        onPress={() => handleGlobalPageChange('next')}
                        disabled={globalPage === chartData[0]?.totalPage}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.globalPaginationButtonText}>Next All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.globalPaginationButton,
                            globalPage === chartData[0]?.totalPage && styles.globalPaginationButtonDisabled
                        ]}
                        onPress={() => handleGlobalPageChange('last')}
                        disabled={globalPage === chartData[0]?.totalPage}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.globalPaginationButtonText}>Last All</Text>
                    </TouchableOpacity>
                </VStack>
            </HStack>
        </View>
    ), [globalPage, chartData, handleGlobalPageChange]);

    // Fixed height for each chart item for getItemLayout optimization
    const getItemLayout = useCallback((data, index) => {
        const itemHeight = 400; // Approximate height of each chart container
        return {
            length: itemHeight,
            offset: itemHeight * index,
            index,
        };
    }, []);

    // Handle untuk tombol download
    const handleDownloadPress = () => {
        if (isExporting) return;
        setShowDownloadOptionsDialog(true);
    };

    // Add state for custom alert dialogs
    const [showDownloadOptionsDialog, setShowDownloadOptionsDialog] = useState(false);
    const [showDownloadLocationDialog, setShowDownloadLocationDialog] = useState(false);
    const [showDownloadAllDialog, setShowDownloadAllDialog] = useState(false);
    const [showDownloadLocalDialog, setShowDownloadLocalDialog] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [tempFileUri, setTempFileUri] = useState('');
    const [tempFileName, setTempFileName] = useState('');

    return (<>
        <View style={styles.container}>
            {/* Custom Alert Dialogs */}
            <CustomAlertDialog
                visible={showDownloadOptionsDialog}
                onClose={() => setShowDownloadOptionsDialog(false)}
                title="📊 Unduh Data Sensor"
                message="Pilih metode unduh yang diinginkan:"
                icon={{ name: "cloud-download-outline" as any, color: "#3b82f6" }}
                actions={[
                    {
                        text: "Data Lokasi Ini Saja",
                        onPress: () => {
                            setShowDownloadOptionsDialog(false);
                            if (selectedLocation && selectedLocation !== 'all' && selectedLocation !== '') {
                                const locationName = locations.find(loc => String(loc.id_lokasi) === selectedLocation)?.nama_sungai || selectedLocation;
                                setAlertTitle('📥 Konfirmasi Unduh');
                                setAlertMessage(`Data sensor dari lokasi ${locationName} akan diunduh dari server dalam format Excel.\n\nProses ini akan menghasilkan dokumen yang lengkap dengan semua data dari lokasi ini.`);
                                setShowDownloadLocationDialog(true);
                            } else {
                                setAlertTitle('⚠️ Perhatian');
                                setAlertMessage('Silakan pilih lokasi spesifik terlebih dahulu untuk mengunduh data lokasi.');
                                setShowErrorDialog(true);
                            }
                        },
                        type: 'primary',
                        icon: "location" as any
                    },
                    {
                        text: "Semua Data Sensor",
                        onPress: () => {
                            setShowDownloadOptionsDialog(false);
                            setAlertTitle('📥 Konfirmasi Unduh');
                            setAlertMessage('Data dari SEMUA lokasi akan diunduh dari server dalam format Excel.\n\nFile yang dihasilkan mungkin berukuran besar. Pastikan koneksi internet stabil.');
                            setShowDownloadAllDialog(true);
                        },
                        type: 'primary',
                        icon: "globe-outline" as any
                    },
                    {
                        text: "Batal",
                        onPress: () => setShowDownloadOptionsDialog(false),
                        type: 'cancel'
                    }
                ]}
            />

            <CustomAlertDialog
                visible={showDownloadLocationDialog}
                onClose={() => setShowDownloadLocationDialog(false)}
                title={alertTitle}
                message={alertMessage}
                icon={{ name: "location" as any, color: "#3b82f6" }}
                actions={[
                    {
                        text: "Unduh",
                        onPress: () => {
                            setShowDownloadLocationDialog(false);
                            serverDownloadExcel(true);
                        },
                        type: 'success',
                        icon: "download-outline" as any
                    },
                    {
                        text: "Batal",
                        onPress: () => setShowDownloadLocationDialog(false),
                        type: 'cancel'
                    }
                ]}
            />

            <CustomAlertDialog
                visible={showDownloadAllDialog}
                onClose={() => setShowDownloadAllDialog(false)}
                title={alertTitle}
                message={alertMessage}
                icon={{ name: "globe-outline" as any, color: "#3b82f6" }}
                actions={[
                    {
                        text: "Unduh",
                        onPress: () => {
                            setShowDownloadAllDialog(false);
                            serverDownloadExcel(false);
                        },
                        type: 'success',
                        icon: "download-outline" as any
                    },
                    {
                        text: "Batal",
                        onPress: () => setShowDownloadAllDialog(false),
                        type: 'cancel'
                    }
                ]}
            />

            <CustomAlertDialog
                visible={showDownloadLocalDialog}
                onClose={() => setShowDownloadLocalDialog(false)}
                title={alertTitle}
                message={alertMessage}
                icon={{ name: "phone-portrait-outline" as any, color: "#3b82f6" }}
                actions={[
                    {
                        text: "Unduh Data Lokal",
                        onPress: () => {
                            setShowDownloadLocalDialog(false);
                            downloadExcel();
                        },
                        type: 'success',
                        icon: "download-outline" as any
                    },
                    {
                        text: "Batal",
                        onPress: () => setShowDownloadLocalDialog(false),
                        type: 'cancel'
                    }
                ]}
            />

            <CustomAlertDialog
                visible={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                title={alertTitle}
                message={alertMessage}
                icon={{ name: "checkmark-circle" as any, color: "#10b981" }}
                actions={[
                    {
                        text: "Bagikan",
                        onPress: () => {
                            setShowSuccessDialog(false);
                            handleShareFile();
                        },
                        type: 'primary',
                        icon: "share-social-outline" as any
                    },
                    {
                        text: "Simpan ke Perangkat",
                        onPress: () => {
                            setShowSuccessDialog(false);
                            handleSaveToDevice();
                        },
                        type: 'primary',
                        icon: "save-outline" as any
                    },
                    {
                        text: "Tutup",
                        onPress: () => setShowSuccessDialog(false),
                        type: 'cancel'
                    }
                ]}
            />

            <CustomAlertDialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={alertTitle}
                message={alertMessage}
                icon={{ name: "alert-circle" as any, color: "#ef4444" }}
                actions={[
                    {
                        text: "OK",
                        onPress: () => setShowErrorDialog(false),
                        type: 'error'
                    }
                ]}
            />

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
                        <TouchableOpacity
                            style={styles.timeFilterButton}
                            onPress={() => setShowTimeRangeModal(true)}
                            activeOpacity={0.8}
                        >
                            <HStack space="sm" style={styles.timeFilterButtonContent}>
                                <Ionicons name="time-outline" size={16} color="#fff" />
                                <Text style={styles.filterButtonText}>
                                    {timeRangeOptions.find(opt => opt.value === selectedTimeRange)?.label}
                                </Text>
                            </HStack>
                        </TouchableOpacity>

                        {/* Download - updated to use new function */}
                        <TouchableOpacity onPress={handleDownloadPress} disabled={isExporting}>
                            <DownloadAnimation downloadState={downloadState} />
                        </TouchableOpacity>
                    </View>

                    {/* Filter Lokasi Button - di tengah */}
                    <Divider className="my-0.5" />
                    <View style={styles.locationFilterContainer}>
                        <TouchableOpacity
                            style={styles.locationButton}
                            onPress={openLocationSheet}
                            activeOpacity={0.8}
                        >
                            <HStack space="sm" style={styles.locationButtonContent}>
                                <Ionicons name="location-outline" size={16} color="#fff" />
                                <Text style={styles.filterButtonText}>
                                    {selectedLocation
                                        ? locations.find(loc => String(loc.id_lokasi) === selectedLocation)?.nama_sungai || 'Lokasi tidak ditemukan'
                                        : 'Semua Lokasi'}
                                </Text>
                            </HStack>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <FlatList
                ref={scrollViewRef as any}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                data={chartData}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} />}
                onScroll={handleScrollHeader}
                scrollEventThrottle={16} // Increased for smoother header animation
                windowSize={3} // Controls how many items to render outside of the visible area
                maxToRenderPerBatch={2} // Limits the number of items rendered per batch
                initialNumToRender={2} // Only render 2 charts initially for faster startup
                updateCellsBatchingPeriod={50} // Batch updates to reduce rendering load
                removeClippedSubviews={true} // Help with memory usage
                ListFooterComponent={ListFooterComponent}
            />

            <View style={{ height: 100 }}></View>

            {/* Location Filter using proper BottomSheet component */}
            <BottomSheet>
                <BottomSheetPortal
                    snapPoints={["75%"]}
                    backdropComponent={(props) => (
                        <BottomSheetBackdrop {...props} onPress={closeLocationSheet} />
                    )}
                    handleComponent={BottomSheetDragIndicator}
                    enablePanDownToClose={true}
                    index={showLocationModal ? 0 : -1}
                    onChange={(index) => {
                        if (index === -1) {
                            setShowLocationModal(false);
                        }
                    }}
                >
                    <BottomSheetScrollView
                        style={[styles.locationScrollView, { flex: 1 }]}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        <BottomSheetContent style={{ flex: 1, backgroundColor: '#fff' }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 16,
                                paddingHorizontal: 20,
                                borderBottomWidth: 1,
                                borderBottomColor: '#f0f0f0',
                            }}>
                                <Text style={{
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                    color: '#333',
                                }}>Pilih Lokasi</Text>
                            </View>

                            {/* Search Input with improved styling */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#f5f5f5',
                                paddingHorizontal: 15,
                                borderRadius: 12,
                                marginHorizontal: 15,
                                marginVertical: 16,
                                height: 50,
                                borderWidth: 1,
                                borderColor: '#eaeaea',
                            }}>
                                <Ionicons name="search-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                <TextInput
                                    style={{
                                        flex: 1,
                                        height: 46,
                                        fontSize: 16,
                                        color: '#333',
                                    }}
                                    placeholder="Cari lokasi..."
                                    value={locationSearchQuery}
                                    onChangeText={setLocationSearchQuery}
                                    clearButtonMode="while-editing"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    placeholderTextColor="#999"
                                />
                                {locationSearchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => setLocationSearchQuery('')}
                                        style={{ padding: 5 }}
                                        activeOpacity={0.6}
                                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                                    >
                                        <Ionicons name="close-circle" size={20} color="#666" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Locations list with different states */}
                            {locationsState === 'loading' ? (
                                <View style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: 20,
                                }}>
                                    <ActivityIndicator size="large" color="#2196f3" />
                                    <Text style={{
                                        marginTop: 10,
                                        color: '#666',
                                        fontSize: 14,
                                        fontWeight: '500',
                                    }}>Memuat daftar lokasi...</Text>
                                </View>
                            ) : locationsState === 'error' ? (
                                <View style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: 20,
                                }}>
                                    <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
                                    <Text style={{
                                        marginTop: 10,
                                        color: '#666',
                                        fontSize: 14,
                                        fontWeight: '500',
                                    }}>
                                        Gagal memuat daftar lokasi
                                    </Text>

                                    <TouchableOpacity
                                        style={{
                                            paddingHorizontal: 15,
                                            paddingVertical: 8,
                                            backgroundColor: '#e3f2fd',
                                            borderRadius: 20,
                                            marginTop: 15,
                                            borderWidth: 1,
                                            borderColor: '#bbdefb',
                                        }}
                                        onPress={retryFetchLocations}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="refresh-outline" size={16} color="#2196f3" />
                                            <Text style={{
                                                color: '#2196f3',
                                                fontSize: 14,
                                                fontWeight: '500',
                                                marginLeft: 5
                                            }}>Coba Lagi</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ) : locations.length === 0 ? (
                                <View style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: 20,
                                }}>
                                    <Ionicons name="location-outline" size={48} color="#9e9e9e" />
                                    <Text style={{
                                        marginTop: 10,
                                        color: '#666',
                                        fontSize: 14,
                                        fontWeight: '500',
                                    }}>
                                        Tidak ada lokasi yang tersedia
                                    </Text>
                                    <Text style={{
                                        marginTop: 5,
                                        color: '#999',
                                        fontSize: 12,
                                        textAlign: 'center',
                                    }}>
                                        Silakan coba lagi nanti atau hubungi administrator
                                    </Text>
                                </View>
                            ) : filteredLocations.length === 0 ? (
                                <View style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: 20,
                                }}>
                                    <Ionicons name="search-outline" size={48} color="#9e9e9e" />
                                    <Text style={{
                                        marginTop: 10,
                                        color: '#666',
                                        fontSize: 14,
                                        fontWeight: '500',
                                    }}>
                                        Tidak ada hasil untuk "{locationSearchQuery}"
                                    </Text>
                                    <TouchableOpacity
                                        style={{
                                            padding: 10,
                                            backgroundColor: '#f0f0f0',
                                            borderRadius: 20,
                                            marginTop: 10,
                                        }}
                                        onPress={() => setLocationSearchQuery('')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{
                                            color: '#2196f3',
                                            fontSize: 14,
                                            fontWeight: '500',
                                        }}>
                                            Hapus Pencarian
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ flex: 1, paddingHorizontal: 15, paddingBottom: 20 }}>
                                    {/* Semua Lokasi with enhanced styling */}
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 14,
                                            paddingHorizontal: 16,
                                            backgroundColor: selectedLocation === '' ? '#1e88e5' : '#e3f2fd',
                                            borderRadius: 12,
                                            marginVertical: 5,
                                            width: '100%',
                                            elevation: selectedLocation === '' ? 3 : 2,
                                            shadowColor: selectedLocation === '' ? '#0d47a1' : '#000',
                                            shadowOffset: { width: 0, height: selectedLocation === '' ? 2 : 1 },
                                            shadowOpacity: selectedLocation === '' ? 0.2 : 0.1,
                                            shadowRadius: selectedLocation === '' ? 3 : 2,
                                            justifyContent: 'space-between',
                                        }}
                                        onPress={() => handleLocationChange('')}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                        }}>
                                            <View style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                backgroundColor: selectedLocation === '' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(30, 136, 229, 0.15)',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginRight: 12,
                                            }}>
                                                <Ionicons
                                                    name="globe-outline"
                                                    size={24}
                                                    color={selectedLocation === '' ? "#fff" : "#1e88e5"}
                                                />
                                            </View>
                                            <Text
                                                style={{
                                                    color: selectedLocation === '' ? '#fff' : '#1e88e5',
                                                    fontSize: 16,
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Semua Lokasi
                                            </Text>
                                        </View>

                                        {selectedLocation === '' && (
                                            <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
                                        )}
                                    </TouchableOpacity>

                                    <View style={{ marginTop: 20, marginBottom: 8 }}>
                                        <Text style={{
                                            fontSize: 14,
                                            fontWeight: '600',
                                            color: '#666',
                                            paddingHorizontal: 5,
                                        }}>Lokasi Tersedia</Text>
                                        <Divider style={{ height: 1, backgroundColor: '#f0f0f0', marginTop: 8, marginBottom: 15 }} />
                                    </View>

                                    {/* Grouped locations list */}
                                    {filteredLocations.map((loc) => (
                                        <MotiView
                                            key={loc.id_lokasi}
                                            from={{ opacity: 0, translateY: 5 }}
                                            animate={{ opacity: 1, translateY: 0 }}
                                            transition={{ type: 'timing', duration: 300, delay: filteredLocations.indexOf(loc) * 50 }}
                                        >
                                            <TouchableOpacity
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    paddingVertical: 14,
                                                    paddingHorizontal: 16,
                                                    backgroundColor: selectedLocation === String(loc.id_lokasi) ? '#1e88e5' : '#f8f9fa',
                                                    borderRadius: 12,
                                                    marginBottom: 10,
                                                    width: '100%',
                                                    elevation: selectedLocation === String(loc.id_lokasi) ? 3 : 1,
                                                    shadowColor: selectedLocation === String(loc.id_lokasi) ? '#0d47a1' : '#000',
                                                    shadowOffset: { width: 0, height: selectedLocation === String(loc.id_lokasi) ? 2 : 1 },
                                                    shadowOpacity: selectedLocation === String(loc.id_lokasi) ? 0.2 : 0.1,
                                                    shadowRadius: selectedLocation === String(loc.id_lokasi) ? 3 : 1,
                                                    justifyContent: 'space-between',
                                                }}
                                                onPress={() => handleLocationChange(loc.id_lokasi)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    flex: 1,
                                                }}>
                                                    <View style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        backgroundColor: selectedLocation === String(loc.id_lokasi) ? 'rgba(255, 255, 255, 0.2)' : 'rgba(30, 136, 229, 0.1)',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        marginRight: 12,
                                                    }}>
                                                        <Ionicons
                                                            name="location"
                                                            size={22}
                                                            color={selectedLocation === String(loc.id_lokasi) ? "#fff" : "#1e88e5"}
                                                        />
                                                    </View>
                                                    <View style={{
                                                        flexDirection: 'column',
                                                        flex: 1,
                                                    }}>
                                                        <Text
                                                            style={{
                                                                color: selectedLocation === String(loc.id_lokasi) ? '#fff' : '#333',
                                                                fontSize: 16,
                                                                fontWeight: '500',
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {loc.nama_sungai}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                color: selectedLocation === String(loc.id_lokasi) ? 'rgba(255, 255, 255, 0.8)' : '#666',
                                                                fontSize: 12,
                                                                marginTop: 4,
                                                            }}
                                                            numberOfLines={2}
                                                        >
                                                            {loc.alamat}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {selectedLocation === String(loc.id_lokasi) && (
                                                    <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
                                                )}
                                            </TouchableOpacity>
                                        </MotiView>
                                    ))}
                                </View>
                            )}
                            <View style={{ height: 100 }} />
                        </BottomSheetContent>
                    </BottomSheetScrollView>
                </BottomSheetPortal>
            </BottomSheet>

        </View >
        <HStack>
            <VStack>
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
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setShowTimeRangeModal(false)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.modalCloseButtonText}>Tutup</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </VStack>
        </HStack>
    </>
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
    timeFilterButton: {
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    timeFilterButtonContent: {
        alignItems: 'center',
    },
    locationButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        alignSelf: 'center',
    },
    locationButtonContent: {
        alignItems: 'center',
    },
    filterButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    locationFilterContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingHorizontal: 15,
        borderRadius: 12,
        marginHorizontal: 15,
        marginVertical: 16,
        height: 50,
        borderWidth: 1,
        borderColor: '#eaeaea',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 46,
        fontSize: 16,
        color: '#333',
    },
    locationScrollView: {
        flex: 1,
        marginBottom: 15,
        paddingHorizontal: 15,
    },
    locationOptionsContainer: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    locationSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 5,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 15,
    },
    locationOptionSpecial: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#e3f2fd',
        borderRadius: 12,
        marginVertical: 5,
        width: '100%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        justifyContent: 'space-between',
    },
    locationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 10,
        width: '100%',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        justifyContent: 'space-between',
    },
    locationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationOptionSelected: {
        backgroundColor: '#1e88e5',
        elevation: 3,
        shadowColor: '#0d47a1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    locationIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(30, 136, 229, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    locationIconContainerSpecial: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(30, 136, 229, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    locationOptionText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '500',
    },
    locationOptionTextSpecial: {
        color: '#1e88e5',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    locationOptionTextSelected: {
        color: '#fff',
    },
    locationTextContainer: {
        flexDirection: 'column',
        flex: 1,
    },
    locationAddress: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
    locationAddressSelected: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    selectedIcon: {
        marginLeft: 8,
    },
    clearButton: {
        padding: 5,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
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
    modalCloseButton: {
        marginTop: 20,
        alignSelf: 'center',
        backgroundColor: '#f44336',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    modalCloseButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    timeRangeOptionSelected: {
        backgroundColor: '#1e88e5',
        shadowColor: '#0d47a1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    timeRangeOptionText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
    },
    timeRangeOptionTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    paginationButton: {
        backgroundColor: '#f0f8ff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#c5e1ff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    paginationButtonDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#e0e0e0',
        elevation: 0,
    },
    paginationButtonText: {
        color: '#0066cc',
        fontWeight: '500',
        fontSize: 12,
    },
    paginationButtonTextDisabled: {
        color: '#aaa',
    },
    globalPaginationButton: {
        backgroundColor: '#e3f2fd',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bbdefb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center',
        minWidth: 100,
    },
    globalPaginationButtonDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#e0e0e0',
        elevation: 0,
    },
    globalPaginationButtonText: {
        color: '#1976d2',
        fontWeight: '600',
        fontSize: 14,
    },
    globalPageIndicator: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        alignSelf: 'center',
        paddingHorizontal: 15,
        textAlign: 'center',
    },
    downloadAnimationContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
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
    closeButton: {
        padding: 5,
    },
    locationStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    locationStateText: {
        marginTop: 10,
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    locationStateSubText: {
        marginTop: 5,
        color: '#999',
        fontSize: 12,
        textAlign: 'center',
    },
    clearSearchButton: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        marginTop: 10,
    },
    clearSearchButtonText: {
        color: '#2196f3',
        fontSize: 14,
        fontWeight: '500',
    },

    // Custom dialog styles
    dialogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    dialogIcon: {
        marginRight: 12,
    },
    dialogTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    dialogMessage: {
        color: '#64748b',
        textAlign: 'center',
        marginVertical: 16,
        lineHeight: 22,
    },
    dialogButtonContainerVertical: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
        width: '100%',
        gap: 12,
    },
    buttonContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialogPrimaryButtonFull: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dialogSecondaryButtonFull: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    dialogPrimaryButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    dialogSecondaryButtonText: {
        color: '#64748b',
        fontWeight: '600',
    },
});

export default FeedsScreen;  