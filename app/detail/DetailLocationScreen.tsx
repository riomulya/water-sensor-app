import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Dimensions, Platform } from 'react-native';
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
import { AntDesign } from '@expo/vector-icons';
import { MotiView, MotiText, AnimatePresence, useAnimationState } from 'moti'
import { Easing } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

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

const DetailLocationScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<ApiLocation | null>(null);
    const [allCombinedData, setAllCombinedData] = useState<CombinedData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(0);
    const numberOfItemsPerPageList = [10, 20, 50, 100];
    const [downloadState, setDownloadState] = useState<DownloadState>('idle');

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

    const handleBack = () => {
        router.back();
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

    // Animasi untuk tabel
    const tableAnimation = useAnimationState({
        from: { opacity: 0, translateY: 20 },
        to: { opacity: 1, translateY: 0 },
    });

    return (
        <LinearGradient
            colors={['#f0f4ff', '#ffffff']}
            style={styles.gradientContainer}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
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

                                // whileHover={{ scale: 0.95 }}
                                transition={{ type: 'spring' }}
                            >
                                <Feather name="arrow-left" size={28} color="#2563eb" />
                            </MotiView>
                        </TouchableOpacity>

                        <MotiText
                            // style={styles.title}
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

                    {/* Enhanced Table */}
                    {loading && (
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
                    )}
                    {!loading && allCombinedData.length > 0 && (
                        <MotiView state={tableAnimation} style={styles.tableWrapper}>
                            <ScrollView
                                horizontal
                                style={styles.horizontalScroll}
                                contentContainerStyle={styles.tableContent}
                                persistentScrollbar={true}
                            >
                                <DataTable style={styles.dataTable}>
                                    <DataTable.Header>
                                        <DataTable.Title style={styles.numberCell}>No</DataTable.Title>
                                        <DataTable.Title style={[styles.headerCell, { width: 120 }]}>
                                            <MotiText
                                                from={{ scale: 0.9 }}
                                                animate={{ scale: 1 }}
                                                transition={{ loop: true, type: 'timing', duration: 2000 }}
                                            >
                                                Tanggal
                                            </MotiText>
                                        </DataTable.Title>
                                        <DataTable.Title numeric style={[styles.headerCell, { width: 80 }]}>pH</DataTable.Title>
                                        <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>Suhu</DataTable.Title>
                                        <DataTable.Title numeric style={[styles.headerCell, { width: 120 }]}>Turbidity</DataTable.Title>
                                        <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>Kecepatan</DataTable.Title>
                                        <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>Accel X</DataTable.Title>
                                        <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>Accel Y</DataTable.Title>
                                        <DataTable.Title numeric style={[styles.headerCell, { width: 100 }]}>Accel Z</DataTable.Title>
                                    </DataTable.Header>

                                    <AnimatePresence>
                                        {allCombinedData.map((item, index) => (
                                            <MotiView
                                                key={index}
                                                from={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{ delay: index * 30, type: 'spring', damping: 12 }}
                                            >
                                                <DataTable.Row style={[
                                                    styles.dataRow,
                                                    index % 2 === 0 && { backgroundColor: '#f8fafc' }
                                                ]}>
                                                    <DataTable.Cell style={styles.numberCell}>
                                                        {(page * itemsPerPage) + index + 1}
                                                    </DataTable.Cell>
                                                    <DataTable.Cell style={[styles.dataCell, { width: 120 }]}>
                                                        <Text className="text-slate-600 text-sm">
                                                            {new Date(item.tanggal).toLocaleDateString('id-ID')}
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
                                                        }}></Text>
                                                        {item.nilai_temperature.toFixed(2)}°C
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
                                        ))}
                                    </AnimatePresence>
                                </DataTable>
                            </ScrollView>

                            {/* Pagination di luar ScrollView */}
                            <DataTable.Pagination
                                page={page}
                                numberOfPages={Math.ceil(totalItems / itemsPerPage)}
                                onPageChange={setPage}
                                label={`${page * itemsPerPage + 1}-${Math.min(
                                    (page + 1) * itemsPerPage,
                                    totalItems
                                )} of ${totalItems}`}
                                numberOfItemsPerPageList={numberOfItemsPerPageList}
                                numberOfItemsPerPage={itemsPerPage}
                                onItemsPerPageChange={setItemsPerPage}
                                showFastPaginationControls
                                selectPageDropdownLabel={'Baris per halaman'}
                                style={styles.pagination}
                            />
                        </MotiView>
                    )}
                    {!loading && allCombinedData.length === 0 && (
                        <MotiView
                            style={styles.emptyContainer}
                        >
                            <Text>Tidak ada data sensor di lokasi {data?.nama_sungai}</Text>
                        </MotiView>
                    )}
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
        paddingBottom: 100, // Ruang untuk pagination
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
        paddingBottom: 16, // Jarak antara tabel dan pagination
    },
    dataTable: {
        flex: 1,
        minWidth: Dimensions.get('window').width * 1.5,
        minHeight: Dimensions.get('window').height * 0.6, // Ganti dengan nilai fixed
    },
    headerCell: {
        paddingVertical: 12,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        justifyContent: 'center',
    },
    dataCell: {
        paddingVertical: 10,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        justifyContent: 'center',
    },
    numberCell: {
        width: 60,
        justifyContent: 'center',
    },
    pagination: {
        backgroundColor: '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingVertical: 8,
    },
});

export default DetailLocationScreen; 