import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Pressable, Platform } from 'react-native';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';
import moment from 'moment';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

// Local components
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Modal } from 'react-native';
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter
} from '@/components/ui/alert-dialog';

// Types
interface SensorData {
    id: string;
    id_lokasi: string;
    accel_x: number;
    accel_y: number;
    accel_z: number;
    turbidity: number;
    ph: number;
    temperature: number;
    speed: number;
    timestamp: string;
}

interface SensorDataTableProps {
    sensorData: SensorData[] | null;
    onRequestPage?: (page: number) => void;
    totalRecords?: number;
    currentPage?: number;
    totalPages?: number;
}

// Custom Export Alert Dialog Component
interface ExportAlertDialogProps {
    visible: boolean;
    onClose: () => void;
    onExportCurrentPage: () => void;
    onExportAllData: () => void;
    title: string;
    message: string;
}

const ExportAlertDialog: React.FC<ExportAlertDialogProps> = ({
    visible,
    onClose,
    onExportCurrentPage,
    onExportAllData,
    title,
    message
}) => {
    return (
        <AlertDialog isOpen={visible} onClose={onClose}>
            <AlertDialogBackdrop />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <View style={styles.dialogHeader}>
                        <Ionicons name="download-outline" size={28} color="#3b82f6" style={styles.dialogIcon} />
                        <Text size="xl" bold style={styles.dialogTitle}>
                            {title}
                        </Text>
                    </View>
                </AlertDialogHeader>
                <AlertDialogBody>
                    <Text size="sm" style={styles.dialogMessage}>
                        {message}
                    </Text>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <View style={styles.dialogButtonContainerVertical}>
                        <TouchableOpacity
                            style={styles.dialogPrimaryButtonFull}
                            onPress={onExportCurrentPage}
                        >
                            <LinearGradient
                                colors={['#60a5fa', '#3b82f6']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Text size="sm" style={styles.dialogPrimaryButtonText}>
                                Halaman Ini
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dialogPrimaryButtonFull}
                            onPress={onExportAllData}
                        >
                            <LinearGradient
                                colors={['#3b82f6', '#2563eb']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Text size="sm" style={styles.dialogPrimaryButtonText}>
                                Semua Data
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dialogSecondaryButtonFull}
                            onPress={onClose}
                        >
                            <Text size="sm" style={styles.dialogSecondaryButtonText}>
                                Batal
                            </Text>
                        </TouchableOpacity>
                    </View>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// Success Alert Dialog
interface SuccessAlertDialogProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

const SuccessAlertDialog: React.FC<SuccessAlertDialogProps> = ({
    visible,
    onClose,
    title,
    message
}) => {
    return (
        <AlertDialog isOpen={visible} onClose={onClose}>
            <AlertDialogBackdrop />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <View style={styles.dialogHeader}>
                        <Ionicons name="checkmark-circle" size={32} color="#10b981" style={styles.dialogIcon} />
                        <Text size="xl" bold style={styles.dialogTitle}>
                            {title}
                        </Text>
                    </View>
                </AlertDialogHeader>
                <AlertDialogBody>
                    <Text size="sm" style={styles.dialogMessage}>
                        {message}
                    </Text>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <View style={styles.dialogButtonContainerVertical}>
                        <TouchableOpacity
                            style={styles.dialogSuccessButtonFull}
                            onPress={onClose}
                        >
                            <LinearGradient
                                colors={['#34d399', '#10b981']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Text size="sm" style={styles.dialogPrimaryButtonText}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// Error Alert Dialog
interface ErrorAlertDialogProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

const ErrorAlertDialog: React.FC<ErrorAlertDialogProps> = ({
    visible,
    onClose,
    title,
    message
}) => {
    return (
        <AlertDialog isOpen={visible} onClose={onClose}>
            <AlertDialogBackdrop />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <View style={styles.dialogHeader}>
                        <Ionicons name="alert-circle" size={32} color="#ef4444" style={styles.dialogIcon} />
                        <Text size="xl" bold style={styles.dialogTitle}>
                            {title}
                        </Text>
                    </View>
                </AlertDialogHeader>
                <AlertDialogBody>
                    <Text size="sm" style={styles.dialogMessage}>
                        {message}
                    </Text>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <View style={styles.dialogButtonContainerVertical}>
                        <TouchableOpacity
                            style={styles.dialogErrorButtonFull}
                            onPress={onClose}
                        >
                            <LinearGradient
                                colors={['#f87171', '#ef4444']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Text size="sm" style={styles.dialogPrimaryButtonText}>
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// Custom Export Options Dialog Component
interface ExportOptionsDialogProps {
    visible: boolean;
    onClose: () => void;
    onSaveToDevice: () => void;
    onShare: () => void;
    title: string;
    message: string;
}

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({
    visible,
    onClose,
    onSaveToDevice,
    onShare,
    title,
    message
}) => {
    return (
        <AlertDialog isOpen={visible} onClose={onClose}>
            <AlertDialogBackdrop />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <View style={styles.dialogHeader}>
                        <Ionicons name="options-outline" size={28} color="#3b82f6" style={styles.dialogIcon} />
                        <Text size="xl" bold style={styles.dialogTitle}>
                            {title}
                        </Text>
                    </View>
                </AlertDialogHeader>
                <AlertDialogBody>
                    <Text size="sm" style={styles.dialogMessage}>
                        {message}
                    </Text>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <View style={styles.dialogButtonContainerVertical}>
                        <TouchableOpacity
                            style={styles.dialogPrimaryButtonFull}
                            onPress={onSaveToDevice}
                        >
                            <LinearGradient
                                colors={['#60a5fa', '#3b82f6']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <View style={styles.buttonContentRow}>
                                <Ionicons name="save-outline" size={18} color="white" style={{ marginRight: 8 }} />
                                <Text size="sm" style={styles.dialogPrimaryButtonText}>
                                    Simpan ke Perangkat
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dialogPrimaryButtonFull}
                            onPress={onShare}
                        >
                            <LinearGradient
                                colors={['#3b82f6', '#2563eb']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <View style={styles.buttonContentRow}>
                                <Ionicons name="share-social-outline" size={18} color="white" style={{ marginRight: 8 }} />
                                <Text size="sm" style={styles.dialogPrimaryButtonText}>
                                    Bagikan
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dialogSecondaryButtonFull}
                            onPress={onClose}
                        >
                            <Text size="sm" style={styles.dialogSecondaryButtonText}>
                                Batal
                            </Text>
                        </TouchableOpacity>
                    </View>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const { width } = Dimensions.get('window');

const SensorDataTable: React.FC<SensorDataTableProps> = ({
    sensorData,
    onRequestPage,
    totalRecords = 0,
    currentPage = 1,
    totalPages = 1
}) => {
    const [localPage, setLocalPage] = useState(1);
    const pageSize = 25;
    const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Alert dialog states
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showExportOptionsDialog, setShowExportOptionsDialog] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [successTitle, setSuccessTitle] = useState('');
    const [errorTitle, setErrorTitle] = useState('');
    const [tempFilePath, setTempFilePath] = useState('');
    const [fileName, setFileName] = useState('');

    // Update internal page when currentPage from props changes
    useEffect(() => {
        setIsLoadingNextPage(false);
    }, [currentPage]);

    // Calculate the number of local pages based on the data we have
    const totalLocalPages = sensorData && Array.isArray(sensorData)
        ? Math.ceil(sensorData.length / pageSize)
        : 1;

    // Calculate total server pages (using the data from props)
    const totalServerPages = totalPages;

    // Decide which pagination system to use
    const useServerPagination = totalServerPages > 1;

    // Calculate the max page for the current view
    const maxPage = useServerPagination
        ? totalLocalPages + (totalServerPages - Math.ceil(sensorData?.length || 0 / 100))
        : totalLocalPages;

    // Animation values
    const tableOpacity = useSharedValue(1);
    const tableTranslateY = useSharedValue(0);

    const animatedTableStyle = useAnimatedStyle(() => {
        return {
            opacity: tableOpacity.value,
            transform: [{ translateY: tableTranslateY.value }]
        };
    });

    const handlePageChange = (newPage: number) => {
        const updatePage = (p: number) => {
            setLocalPage(p);

            // Jika data yang diminta tidak ada dalam memory, minta dari server
            const localDataAvailable = sensorData && (p * pageSize <= sensorData.length);

            if (onRequestPage && !localDataAvailable) {
                // Hitung halaman server yang sesuai
                const serverPage = Math.floor((p * pageSize) / 100) + 1;
                console.log(`Requesting server page ${serverPage} for local page ${p}`);

                setIsLoadingNextPage(true);
                onRequestPage(serverPage);
            }

            setTimeout(() => {
                tableOpacity.value = withTiming(1, { duration: 300 });
                tableTranslateY.value = withTiming(0, { duration: 300 });
            }, 50);
        };

        // Animate table transition
        tableOpacity.value = withTiming(0.3, { duration: 200 });
        tableTranslateY.value = withTiming(10, { duration: 200 }, () => {
            // Use runOnJS to call setState from the UI thread
            runOnJS(updatePage)(newPage);
        });
    };

    const handleExport = async (currentPageOnly: boolean = false) => {
        if (!sensorData || !Array.isArray(sensorData) || sensorData.length === 0) return;

        try {
            setIsExporting(true);

            // Create CSV content
            let csvContent = 'Timestamp,Turbidity,pH,Temperature,Speed,Accel X,Accel Y,Accel Z\n';

            // Pilih data yang akan diekspor: hanya halaman saat ini atau semua data
            let dataToExport;
            if (currentPageOnly) {
                dataToExport = paginatedData.filter(data => data && typeof data === 'object');
                console.log(`Exporting current page only: ${dataToExport.length} records`);
            } else {
                dataToExport = sensorData.filter(data => data && typeof data === 'object');
                console.log(`Exporting all data: ${dataToExport.length} records`);
            }

            // Gunakan data yang valid saja
            dataToExport.forEach(data => {
                // Format timestamp agar kompatibel dengan Excel (quote untuk menghindari konversi otomatis Excel)
                const timestamp = data.timestamp ? `"${moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss')}"` : '';

                // Format nilai dengan presisi 2 desimal, gunakan titik sebagai pemisah desimal
                const turbidity = typeof data.turbidity === 'number' ? data.turbidity.toFixed(2) : '';
                const ph = typeof data.ph === 'number' ? data.ph.toFixed(2) : '';
                const temperature = typeof data.temperature === 'number' ? data.temperature.toFixed(2) : '';
                const speed = typeof data.speed === 'number' ? data.speed.toFixed(2) : '';
                const accel_x = typeof data.accel_x === 'number' ? data.accel_x.toFixed(2) : '';
                const accel_y = typeof data.accel_y === 'number' ? data.accel_y.toFixed(2) : '';
                const accel_z = typeof data.accel_z === 'number' ? data.accel_z.toFixed(2) : '';

                csvContent += `${timestamp},${turbidity},${ph},${temperature},${speed},${accel_x},${accel_y},${accel_z}\n`;
            });

            // Create filename with timestamp
            const fileDate = moment().format('YYYY-MM-DD_HH-mm-ss');
            const newFileName = `water_sensor_data_${fileDate}.csv`;
            setFileName(newFileName);

            // Temporarily save file to app's cache directory
            const newTempFilePath = `${FileSystem.cacheDirectory}${newFileName}`;
            setTempFilePath(newTempFilePath);
            await FileSystem.writeAsStringAsync(newTempFilePath, csvContent);

            // Show export options to user
            setShowExportOptionsDialog(true);

            console.log(`Successfully prepared ${dataToExport.length} records for export`);

        } catch (error) {
            console.error('Error exporting data:', error);
            setErrorTitle('Ekspor Gagal');
            setAlertMessage(`Terjadi kesalahan saat mengekspor data: ${error.message}`);
            setShowErrorDialog(true);
        } finally {
            setIsExporting(false);
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
                        fileName,
                        'text/csv'
                    );

                    // Read the cached file
                    const fileContent = await FileSystem.readAsStringAsync(tempFilePath);

                    // Write to the selected directory
                    await FileSystem.writeAsStringAsync(fileUri, fileContent, {
                        encoding: FileSystem.EncodingType.UTF8
                    });

                    setSuccessTitle('✅ Berhasil Disimpan');
                    setAlertMessage(`File ${fileName} telah disimpan ke folder yang Anda pilih.`);
                    setShowSuccessDialog(true);
                }
            } else {
                // For iOS, use sharing API
                await Sharing.shareAsync(tempFilePath, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Simpan file CSV',
                    UTI: 'public.comma-separated-values-text'
                });
            }
        } catch (error) {
            console.error('Error saving to selected folder:', error);
            setErrorTitle('Ekspor Gagal');
            setAlertMessage(`Terjadi kesalahan saat menyimpan file: ${error.message}`);
            setShowErrorDialog(true);
        }
    };

    const handleShare = async () => {
        try {
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(tempFilePath, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Bagikan Data Sensor',
                    UTI: 'public.comma-separated-values-text'
                });
            }
        } catch (error) {
            console.error('Error sharing file:', error);
            setErrorTitle('Bagikan Gagal');
            setAlertMessage(`Terjadi kesalahan saat membagikan file: ${error.message}`);
            setShowErrorDialog(true);
        }
    };

    if (!sensorData || sensorData.length === 0) {
        return (
            <MotiView
                style={styles.containerEmpty}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 500 }}
            >
                <View style={styles.headerRow}>
                    <MaterialIcons name="table-chart" size={24} color="#3b82f6" />
                    <Text size="lg" bold style={styles.headerText}>
                        Data Sensor
                    </Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Feather name="database" size={32} color="#cbd5e1" style={styles.emptyIcon} />
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada data tersedia
                    </Text>
                </View>
            </MotiView>
        );
    }

    // Get paginated data - show 25 items per page from the local data
    const startIndex = (localPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Sort the data by timestamp in descending order (newest first)
    const sortedData = Array.isArray(sensorData)
        ? [...sensorData].sort((a, b) => {
            if (!a?.timestamp || !b?.timestamp) return 0;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        : [];

    const paginatedData = sortedData.slice(startIndex, endIndex);

    // Calculate what to display in pagination
    const startRecord = startIndex + 1;
    const endRecord = Math.min(startIndex + paginatedData.length, sensorData?.length || 0);

    return (
        <MotiView
            style={styles.container}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 600 }}
        >
            {/* Export Dialog */}
            <ExportAlertDialog
                visible={showExportDialog}
                onClose={() => setShowExportDialog(false)}
                onExportCurrentPage={() => {
                    setShowExportDialog(false);
                    handleExport(true);
                }}
                onExportAllData={() => {
                    setShowExportDialog(false);
                    handleExport(false);
                }}
                title="Ekspor Data"
                message="Pilih data yang ingin diekspor"
            />

            {/* Export Options Dialog */}
            <ExportOptionsDialog
                visible={showExportOptionsDialog}
                onClose={() => setShowExportOptionsDialog(false)}
                onSaveToDevice={() => {
                    setShowExportOptionsDialog(false);
                    handleSaveToDevice();
                }}
                onShare={() => {
                    setShowExportOptionsDialog(false);
                    handleShare();
                }}
                title="Ekspor Data"
                message="Pilih metode ekspor data"
            />

            {/* Success Dialog */}
            <SuccessAlertDialog
                visible={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                title={successTitle}
                message={alertMessage}
            />

            {/* Error Dialog */}
            <ErrorAlertDialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={errorTitle}
                message={alertMessage}
            />

            <View style={styles.card}>
                <View style={styles.content}>
                    <View style={styles.headerContainer}>
                        <View style={styles.headerRow}>
                            <MaterialIcons name="table-chart" size={24} color="#3b82f6" />
                            <Text size="lg" bold style={styles.headerText}>
                                Data Sensor
                            </Text>
                        </View>

                        <View style={styles.headerActions}>
                            <View style={styles.pageInfo}>
                                <Text size="xs" style={styles.pageInfoText}>
                                    {totalRecords > 0 ? `${totalRecords} total data` : ''}
                                </Text>
                            </View>

                            <MotiView
                                from={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring' }}
                            >
                                <Pressable
                                    onPress={() => setShowExportDialog(true)}
                                    style={({ pressed }) => [
                                        styles.exportButtonContainer,
                                        pressed && styles.exportButtonPressed
                                    ]}
                                    android_ripple={{ color: '#dbeafe', borderless: false, radius: 24 }}
                                >
                                    <LinearGradient
                                        colors={isExporting ? ['#bfdbfe', '#93c5fd'] : ['#eff6ff', '#dbeafe']}
                                        style={styles.exportButtonGradient}
                                    >
                                        {isExporting ? (
                                            <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />
                                        ) : (
                                            <Ionicons name="download-outline" size={18} color="#3b82f6" style={{ marginRight: 8 }} />
                                        )}
                                        <Text size="sm" style={styles.exportButtonText}>
                                            {isExporting ? 'Mengekspor...' : 'Export'}
                                        </Text>
                                    </LinearGradient>
                                </Pressable>
                            </MotiView>
                        </View>
                    </View>

                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <View style={styles.headerCell30}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                Waktu
                            </Text>
                        </View>
                        <View style={styles.headerCell23}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                {SENSOR_LABELS.turbidity}
                            </Text>
                        </View>
                        <View style={styles.headerCell23}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                {SENSOR_LABELS.ph}
                            </Text>
                        </View>
                        <View style={styles.headerCell24}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                {SENSOR_LABELS.temperature}
                            </Text>
                        </View>
                    </View>

                    {/* Table Rows */}
                    <Animated.View style={[styles.tableContainer, animatedTableStyle]}>
                        {paginatedData.map((item, index) => {
                            if (!item || typeof item !== 'object') {
                                return null;
                            }

                            const timestamp = item.timestamp
                                ? moment.utc(item.timestamp).format('DD/MM HH:mm:ss')
                                : 'N/A';
                            const turbidity = typeof item.turbidity === 'number'
                                ? `${item.turbidity.toFixed(1)} ${SENSOR_UNITS.turbidity}`
                                : 'N/A';
                            const ph = typeof item.ph === 'number'
                                ? item.ph.toFixed(1)
                                : 'N/A';
                            const temperature = typeof item.temperature === 'number'
                                ? `${item.temperature.toFixed(1)} ${SENSOR_UNITS.temperature}`
                                : 'N/A';

                            return (
                                <Animated.View
                                    key={item?.id?.toString() || `row-${index}`}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 0 ? styles.tableRowEven : null
                                    ]}
                                    entering={FadeInDown.delay(100 + index * 30).duration(200)}
                                >
                                    <View style={styles.cell30}>
                                        <Text size="xs" style={styles.cellText}>
                                            {timestamp}
                                        </Text>
                                    </View>
                                    <View style={styles.cell23}>
                                        <Text size="xs" style={styles.cellValue}>
                                            {turbidity}
                                        </Text>
                                    </View>
                                    <View style={styles.cell23}>
                                        <Text size="xs" style={styles.cellValue}>
                                            {ph}
                                        </Text>
                                    </View>
                                    <View style={styles.cell24}>
                                        <Text size="xs" style={styles.cellValue}>
                                            {temperature}
                                        </Text>
                                    </View>
                                </Animated.View>
                            );
                        })}
                    </Animated.View>

                    {/* Pagination */}
                    <MotiView
                        style={styles.paginationContainer}
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 500, delay: 800 }}
                    >
                        <Text size="xs" style={styles.paginationInfo}>
                            {localPage === Math.ceil(totalRecords / pageSize) ? `Menampilkan ${startRecord} - ${totalRecords} data` : `Menampilkan ${startRecord} - ${endRecord} data`}
                        </Text>

                        <View style={styles.paginationText}>
                            <Text size="md" style={styles.pageNumberText}>
                                Halaman {localPage} dari {Math.ceil(totalRecords / pageSize)}
                            </Text>
                        </View>

                        <View style={styles.paginationControlsVertical}>
                            <TouchableOpacity
                                onPress={() => handlePageChange(1)}
                                disabled={localPage <= 1}
                                style={[
                                    styles.paginationButtonLarge,
                                    localPage <= 1 ? styles.paginationButtonDisabled : null
                                ]}
                            >
                                <MaterialIcons
                                    name="first-page"
                                    size={24}
                                    color={localPage <= 1 ? "#cbd5e1" : "#3b82f6"}
                                    style={styles.buttonIcon}
                                />
                                <Text size="xs" style={localPage <= 1 ? styles.buttonTextDisabled : styles.buttonText}>
                                    Halaman Pertama
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handlePageChange(Math.max(1, localPage - 1))}
                                disabled={localPage <= 1}
                                style={[
                                    styles.paginationButtonLarge,
                                    localPage <= 1 ? styles.paginationButtonDisabled : null
                                ]}
                            >
                                <MaterialIcons
                                    name="chevron-left"
                                    size={24}
                                    color={localPage <= 1 ? "#cbd5e1" : "#3b82f6"}
                                    style={styles.buttonIcon}
                                />
                                <Text size="xs" style={localPage <= 1 ? styles.buttonTextDisabled : styles.buttonText}>
                                    Halaman Sebelumnya
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handlePageChange(localPage + 1)}
                                disabled={localPage >= Math.ceil(totalRecords / pageSize) || isLoadingNextPage}
                                style={[
                                    styles.paginationButtonLarge,
                                    (localPage >= Math.ceil(totalRecords / pageSize) || isLoadingNextPage) ? styles.paginationButtonDisabled : null
                                ]}
                            >
                                {isLoadingNextPage ? (
                                    <ActivityIndicator size="small" color="#3b82f6" style={styles.buttonIcon} />
                                ) : (
                                    <MaterialIcons
                                        name="chevron-right"
                                        size={24}
                                        color={localPage >= Math.ceil(totalRecords / pageSize) ? "#cbd5e1" : "#3b82f6"}
                                        style={styles.buttonIcon}
                                    />
                                )}
                                <Text size="xs" style={localPage >= Math.ceil(totalRecords / pageSize) ? styles.buttonTextDisabled : styles.buttonText}>
                                    {isLoadingNextPage ? 'Memuat...' : 'Halaman Berikutnya'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handlePageChange(Math.ceil(totalRecords / pageSize))}
                                disabled={localPage >= Math.ceil(totalRecords / pageSize) || isLoadingNextPage}
                                style={[
                                    styles.paginationButtonLarge,
                                    (localPage >= Math.ceil(totalRecords / pageSize) || isLoadingNextPage) ? styles.paginationButtonDisabled : null
                                ]}
                            >
                                <MaterialIcons
                                    name="last-page"
                                    size={24}
                                    color={localPage >= Math.ceil(totalRecords / pageSize) ? "#cbd5e1" : "#3b82f6"}
                                    style={styles.buttonIcon}
                                />
                                <Text size="xs" style={localPage >= Math.ceil(totalRecords / pageSize) ? styles.buttonTextDisabled : styles.buttonText}>
                                    Halaman Terakhir
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </View>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    // Dialog styles
    dialogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    dialogIcon: {
        marginRight: 12,
    },
    dialogTitle: {
        color: '#1e293b',
    },
    dialogMessage: {
        color: '#64748b',
        textAlign: 'center',
        marginVertical: 16,
    },
    dialogButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
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
    dialogPrimaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
    dialogSecondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
    },
    dialogSuccessButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dialogSuccessButtonFull: {
        paddingVertical: 14,
        paddingHorizontal: 24,
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
    dialogErrorButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dialogErrorButtonFull: {
        paddingVertical: 14,
        paddingHorizontal: 24,
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
    dialogPrimaryButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    dialogSecondaryButtonText: {
        color: '#64748b',
        fontWeight: '600',
    },
    dialogButtonIcon: {
        marginRight: 8,
    },

    container: {
        marginVertical: 16,
        width: '100%',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    containerEmpty: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        marginVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    content: {
        padding: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerText: {
        marginLeft: 8,
        color: '#334155',
    },
    exportButtonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    exportButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    exportButtonText: {
        color: '#3b82f6',
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: -0.2,
    },
    exportButtonPressed: {
        opacity: 0.9,
    },
    emptyContainer: {
        backgroundColor: '#f8fafc',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    emptyText: {
        color: '#64748b',
        marginTop: 8,
    },
    emptyIcon: {
        marginBottom: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    headerCell30: {
        flex: 0.3,
    },
    headerCell23: {
        flex: 0.23,
        alignItems: 'center',
    },
    headerCell24: {
        flex: 0.24,
        alignItems: 'center',
    },
    headerCellText: {
        color: '#475569',
        fontSize: 12,
    },
    tableContainer: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableRowEven: {
        backgroundColor: '#f8fafc',
    },
    cell30: {
        flex: 0.3,
    },
    cell23: {
        flex: 0.23,
        alignItems: 'center',
    },
    cell24: {
        flex: 0.24,
        alignItems: 'center',
    },
    cellText: {
        color: '#64748b',
    },
    cellValue: {
        color: '#334155',
        fontWeight: '500',
    },
    paginationContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
    },
    paginationInfo: {
        color: '#64748b',
        marginBottom: 12,
        textAlign: 'center',
    },
    paginationText: {
        marginBottom: 16,
    },
    pageNumberText: {
        color: '#334155',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    paginationControlsVertical: {
        width: '100%',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    paginationButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: 'white',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    paginationButtonDisabled: {
        opacity: 0.5,
        backgroundColor: '#f1f5f9',
    },
    buttonText: {
        color: '#3b82f6',
        fontWeight: '500',
    },
    buttonTextDisabled: {
        color: '#94a3b8',
        fontWeight: '500',
    },
    buttonIcon: {
        marginRight: 10,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pageInfo: {
        marginRight: 8,
    },
    pageInfoText: {
        marginLeft: 10,
        color: '#64748b',
    },
});

export default SensorDataTable; 