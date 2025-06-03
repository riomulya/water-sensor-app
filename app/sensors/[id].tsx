import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TextInput, TouchableOpacity, ActivityIndicator,
    Alert, KeyboardAvoidingView, Platform, Modal,
    Pressable
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useToast } from '@/components/ui/toast';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { port } from '../../constants/https';

interface Location {
    id_lokasi: number;
    nama_lokasi?: string;
    nama_sungai?: string; // API menggunakan nama_sungai, bukan nama_lokasi
    alamat?: string;
    tanggal?: string;
    lat?: string;
    lon?: string;
    [key: string]: any; // Allow any additional properties
}

interface SensorData {
    id: number;
    id_lokasi: number;
    nilai_accel_x?: number;
    nilai_accel_y?: number;
    nilai_accel_z?: number;
    nilai_ph?: number;
    nilai_temperature?: number;
    nilai_turbidity?: number;
    nilai_speed?: number;
    tanggal: string;
    lat: string;
    lon: string;
    location?: Location;
    [key: string]: any; // Allow any additional properties
}

// Define thresholds for the three vital parameters
const ANOMALY_THRESHOLDS = {
    nilai_turbidity: { min: -1.0, max: 25, label: "Turbidity", icon: "opacity" },
    nilai_ph: { min: 6.0, max: 9.0, label: "pH", icon: "science" },
    nilai_temperature: { min: 10, max: 35, label: "Temperature", icon: "thermostat" }
};

// Determine if data point has any anomalies
const hasAnomaly = (data: SensorData): { isAnomaly: boolean, anomalyTypes: string[] } => {
    const anomalyTypes: string[] = [];

    for (const [key, threshold] of Object.entries(ANOMALY_THRESHOLDS)) {
        // Skip if sensor doesn't have this value
        if (data[key as keyof SensorData] === undefined) continue;

        const value = Number(data[key as keyof SensorData]);
        if (isNaN(value)) continue; // Skip if not a number

        if ((threshold.min !== null && value < threshold.min) ||
            (threshold.max !== null && value > threshold.max)) {
            anomalyTypes.push(threshold.label);
        }
    }

    return {
        isAnomaly: anomalyTypes.length > 0,
        anomalyTypes
    };
};

// Get the anomaly details for a specific type
const getAnomalyDetail = (data: SensorData, type: keyof typeof ANOMALY_THRESHOLDS) => {
    // Skip if sensor doesn't have this value
    if (data[type as keyof SensorData] === undefined) {
        return { value: null, isAnomaly: false, message: "Data tidak tersedia" };
    }

    const value = Number(data[type as keyof SensorData]);
    if (isNaN(value)) {
        return { value: null, isAnomaly: false, message: "Data tidak valid" };
    }

    const threshold = ANOMALY_THRESHOLDS[type];

    if ((threshold.min !== null && value < threshold.min) ||
        (threshold.max !== null && value > threshold.max)) {
        return {
            value,
            isAnomaly: true,
            message: threshold.min !== null && value < threshold.min
                ? `Terlalu rendah (< ${threshold.min})`
                : `Terlalu tinggi (> ${threshold.max})`
        };
    }

    return { value, isAnomaly: false, message: "Normal" };
};

// Helper for safe string conversion
const getSafe = (obj: any, key: string, defaultValue: string = ''): string => {
    if (!obj) return defaultValue;
    try {
        const value = obj[key];
        return value !== undefined && value !== null ? String(value) : defaultValue;
    } catch {
        return defaultValue;
    }
};

// Helper component to display location info
const LocationDisplay = ({ locationData }: { locationData: Location | undefined }) => {
    if (!locationData) return null;

    // Try to get location name from both possible fields
    const locationName = locationData.nama_sungai || locationData.nama_lokasi || 'Tidak tersedia';

    return (
        <View style={styles.locationNameContainer}>
            <Text style={styles.locationNameLabel}>Nama Lokasi:</Text>
            <Text style={styles.locationName}>{locationName}</Text>
        </View>
    );
};

export default function SensorDetailScreen() {
    const { id, sensorType } = useLocalSearchParams();
    const [sensorData, setSensorData] = useState<SensorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [anomalyInfo, setAnomalyInfo] = useState<{
        isAnomaly: boolean;
        anomalyTypes: string[];
    }>({ isAnomaly: false, anomalyTypes: [] });
    const toast = useToast();
    const [locationData, setLocationData] = useState<Location | null>(null);
    const [detectedType, setDetectedType] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedValues, setEditedValues] = useState<Record<string, number>>({});
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    // New state for prediction update
    const [isPredictionEditing, setIsPredictionEditing] = useState(false);
    const [predictionValues, setPredictionValues] = useState({
        ph: 0,
        temperature: 0,
        turbidity: 0
    });
    const [showPredictionUpdateModal, setShowPredictionUpdateModal] = useState(false);

    useEffect(() => {
        fetchSensorData();
    }, [id, sensorType]);

    const fetchLocationData = async (id_lokasi: number) => {
        try {
            const apiUrl = port.endsWith('/')
                ? `${port}data_lokasi/${id_lokasi}`
                : `${port}/data_lokasi/${id_lokasi}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.error(`Failed to fetch location data for id ${id_lokasi}`);
                return;
            }

            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                setLocationData(data[0]);
            } else if (data && typeof data === 'object') {
                setLocationData(data);
            }
        } catch (error) {
            console.error('Error fetching location data:', error);
        }
    };

    const fetchSensorData = async () => {
        if (!id) return;

        setLoading(true);

        try {
            // If sensorType is provided, use it. Otherwise, try to detect from the ID format
            let type = sensorType as string | null;

            // Examine ID format if no type provided
            if (!type && typeof id === 'string') {
                // Try to detect sensor type from id format
                if (id.includes('id_ph_')) {
                    type = 'ph';
                } else if (id.includes('id_turbidity_')) {
                    type = 'turbidity';
                } else if (id.includes('id_temperature_')) {
                    type = 'temperature';
                } else if (id.includes('id_accel_x_')) {
                    type = 'accel_x';
                } else if (id.includes('id_accel_y_')) {
                    type = 'accel_y';
                } else if (id.includes('id_accel_z_')) {
                    type = 'accel_z';
                } else if (id.includes('id_speed_')) {
                    type = 'speed';
                }
            }

            setDetectedType(type);

            // Extract the numeric ID part if it contains a sensor type prefix
            let klasifikasiId = id;
            if (typeof id === 'string' && id.includes('_')) {
                // Extract the number after the last underscore
                const parts = id.split('_');
                klasifikasiId = parts[parts.length - 1];
            }

            // Use the klasifikasi endpoint to get all sensor data
            const apiUrl = port.endsWith('/')
                ? `${port}klasifikasi/${klasifikasiId}`
                : `${port}/klasifikasi/${klasifikasiId}`;

            console.log('Fetching sensor detail from:', apiUrl);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();

            let sensorDetail: SensorData | null = null;

            if (result.success && result.data) {
                // Transform the klasifikasi API response to match our SensorData interface
                sensorDetail = {
                    id: result.data.id_klasifikasi,
                    id_lokasi: result.data.id_lokasi,
                    tanggal: result.data.tanggal,
                    lat: result.data.data_lokasi?.lat || "",
                    lon: result.data.data_lokasi?.lon || "",
                    location: result.data.data_lokasi,
                };

                // Add all sensor values to the sensorDetail object
                if (result.data.data_ph) {
                    sensorDetail.nilai_ph = result.data.data_ph.nilai_ph;
                }
                if (result.data.data_temperature) {
                    sensorDetail.nilai_temperature = result.data.data_temperature.nilai_temperature;
                }
                if (result.data.data_turbidity) {
                    sensorDetail.nilai_turbidity = result.data.data_turbidity.nilai_turbidity;
                }
                if (result.data.data_accel_x) {
                    sensorDetail.nilai_accel_x = result.data.data_accel_x.nilai_accel_x;
                }
                if (result.data.data_accel_y) {
                    sensorDetail.nilai_accel_y = result.data.data_accel_y.nilai_accel_y;
                }
                if (result.data.data_accel_z) {
                    sensorDetail.nilai_accel_z = result.data.data_accel_z.nilai_accel_z;
                }
                if (result.data.data_speed) {
                    sensorDetail.nilai_speed = result.data.data_speed.nilai_speed;
                }
            } else if (Array.isArray(result) && result.length > 0) {
                // Handle direct array response (fallback)
                sensorDetail = result[0];
            } else if (typeof result === 'object' && result !== null) {
                // Handle single object response (fallback)
                sensorDetail = result;
            } else {
                throw new Error('Unexpected API response format');
            }

            setSensorData(sensorDetail);

            if (sensorDetail) {
                // Check for anomalies
                const anomalyCheck = hasAnomaly(sensorDetail);
                setAnomalyInfo(anomalyCheck);
            }

            // Initialize edited values with current values
            const initialValues: Record<string, number> = {};
            if (type && sensorDetail[`nilai_${type}` as keyof SensorData]) {
                initialValues[`nilai_${type}`] = sensorDetail[`nilai_${type}` as keyof SensorData] as number;
            }
            setEditedValues(initialValues);

            // No need to fetch location data separately as it's included in the response
            if (result.data?.data_lokasi) {
                setLocationData(result.data.data_lokasi);
            }

        } catch (error) {
            console.error('Error fetching sensor data:', error);
            setError('Gagal mengambil data sensor. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            if (!sensorType || !sensorData) {
                toast.show({
                    render: () => (
                        <View style={styles.errorToast}>
                            <Text style={styles.toastText}>Tidak dapat mengidentifikasi jenis sensor</Text>
                        </View>
                    ),
                });
                return;
            }

            setLoading(true);

            // Get the specific sensor ID from the klasifikasi data
            const sensorId = sensorData[`id_${sensorType}`];
            if (!sensorId) {
                throw new Error(`Could not find ID for ${sensorType} sensor`);
            }

            const endpoint = `data_${sensorType}/${sensorId}`;
            const response = await fetch(`${port}/${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [`nilai_${sensorType}`]: editedValues[`nilai_${sensorType}`],
                    tanggal: sensorData.tanggal,
                    id_lokasi: sensorData.id_lokasi,
                }),
            });

            if (!response.ok) throw new Error('Failed to update sensor data');

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to update sensor data');

            toast.show({
                render: () => (
                    <View style={styles.successToast}>
                        <Text style={styles.toastText}>Data sensor berhasil diperbarui</Text>
                    </View>
                ),
            });
            setIsEditing(false);
            fetchSensorData(); // Refresh data
        } catch (error) {
            console.error('Error updating sensor data:', error);
            toast.show({
                render: () => (
                    <View style={styles.errorToast}>
                        <Text style={styles.toastText}>Error saat memperbarui data sensor</Text>
                    </View>
                ),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        try {
            setLoading(true);
            setDeleteModalVisible(false);

            // Extract the klasifikasi ID
            let klasifikasiId = id;
            if (typeof id === 'string' && id.includes('_')) {
                // Extract the number after the last underscore
                const parts = id.split('_');
                klasifikasiId = parts[parts.length - 1];
            }

            console.log(`Attempting to delete klasifikasi with ID: ${klasifikasiId}`);

            // Use klasifikasi endpoint to delete all related sensor data
            const endpoint = `klasifikasi/${klasifikasiId}`;
            const apiUrl = port.endsWith('/')
                ? `${port}${endpoint}`
                : `${port}/${endpoint}`;

            console.log(`DELETE request to: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Delete response status: ${response.status}`);

            const responseText = await response.text();
            console.log(`Delete response body: ${responseText}`);

            // Parse the response if it's JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parsing response as JSON:', e);
                throw new Error(`Invalid response format: ${responseText}`);
            }

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}: ${result?.error || responseText}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete sensor data');
            }

            toast.show({
                render: () => (
                    <View style={styles.successToast}>
                        <Text style={styles.toastText}>Data sensor dan semua data terkait berhasil dihapus</Text>
                    </View>
                ),
            });
            router.back(); // Navigate back to the list
        } catch (error) {
            console.error('Error deleting sensor data:', error);
            toast.show({
                render: () => (
                    <View style={styles.errorToast}>
                        <Text style={styles.toastText}>
                            Error saat menghapus data sensor: {error instanceof Error ? error.message : 'Unknown error'}
                        </Text>
                    </View>
                ),
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Function to handle updating all three vital parameters at once
    const handlePredictionUpdate = async () => {
        try {
            setLoading(true);

            // Extract the klasifikasi ID
            let klasifikasiId = id;
            if (typeof id === 'string' && id.includes('_')) {
                // Extract the number after the last underscore
                const parts = id.split('_');
                klasifikasiId = parts[parts.length - 1];
            }

            // Use klasifikasi endpoint to update sensor values and get new prediction
            const endpoint = `klasifikasi/${klasifikasiId}/prediction`;
            const apiUrl = port.endsWith('/')
                ? `${port}${endpoint}`
                : `${port}/${endpoint}`;

            console.log(`PUT request to: ${apiUrl}`, predictionValues);

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ph: predictionValues.ph,
                    temperature: predictionValues.temperature,
                    turbidity: predictionValues.turbidity,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to update prediction: ${response.status}`, errorText);
                throw new Error(`Server responded with status ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to update prediction data');
            }

            toast.show({
                render: () => (
                    <View style={styles.successToast}>
                        <Text style={styles.toastText}>
                            Data sensor berhasil diperbarui. Prediksi baru: {result.prediction.klasifikasi}
                        </Text>
                    </View>
                ),
            });

            setShowPredictionUpdateModal(false);
            setPredictionValues({
                ph: 0,
                temperature: 0,
                turbidity: 0
            });
            fetchSensorData(); // Refresh data
        } catch (error) {
            console.error('Error updating prediction data:', error);
            toast.show({
                render: () => (
                    <View style={styles.errorToast}>
                        <Text style={styles.toastText}>
                            Error saat memperbarui prediksi: {error instanceof Error ? error.message : 'Unknown error'}
                        </Text>
                    </View>
                ),
            });
        } finally {
            setLoading(false);
        }
    };

    // Set initial prediction values when sensor data is loaded
    useEffect(() => {
        if (sensorData) {
            setPredictionValues({
                ph: sensorData.nilai_ph || 0,
                temperature: sensorData.nilai_temperature || 0,
                turbidity: sensorData.nilai_turbidity || 0
            });
        }
    }, [sensorData]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Memuat data...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={64} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchSensorData}
                >
                    <Text style={styles.retryButtonText}>Coba Lagi</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!sensorData) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="warning" size={64} color="#f59e0b" />
                <Text style={styles.errorText}>Data anomali tidak ditemukan</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.scrollView}>
                {/* Anomaly summary */}
                {anomalyInfo.isAnomaly && (
                    <View style={styles.anomalySummary}>
                        <View style={styles.anomalyHeader}>
                            <MaterialIcons name="warning" size={24} color="#fff" />
                            <Text style={styles.anomalyTitle}>
                                Terdeteksi {anomalyInfo.anomalyTypes.length} Parameter Vital Anomali
                            </Text>
                        </View>
                        <View style={styles.anomalyContent}>
                            <Text style={styles.anomalySubtitle}>
                                Parameter berikut melebihi ambang batas normal:
                            </Text>
                            <View style={styles.anomalyBadges}>
                                {anomalyInfo.anomalyTypes.map((type) => (
                                    <View key={type} style={styles.anomalyBadge}>
                                        <MaterialIcons
                                            name={
                                                type === "pH" ? "science" :
                                                    type === "Turbidity" ? "opacity" :
                                                        "thermostat"
                                            }
                                            size={16}
                                            color="#b91c1c"
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={styles.anomalyBadgeText}>{type}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.anomalyNote}>
                                Parameter vital sangat penting untuk menentukan kualitas air.
                                Nilai di luar batas normal memerlukan perhatian segera.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Location info */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="location-on" size={20} color="#3b82f6" />
                        <Text style={styles.cardTitle}>Informasi Lokasi</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <LocationDisplay locationData={locationData || sensorData.location} />

                        <View style={styles.locationDetailsGrid}>
                            <View style={styles.locationDetailItem}>
                                <Text style={styles.detailLabel}>ID Lokasi</Text>
                                <Text style={styles.detailValue}>{sensorData.id_lokasi}</Text>
                            </View>

                            <View style={styles.locationDetailItem}>
                                <Text style={styles.detailLabel}>Tanggal</Text>
                                <Text style={styles.detailValue}>{formatDate(sensorData.tanggal)}</Text>
                            </View>
                        </View>

                        <View style={styles.coordinateContainer}>
                            <Text style={styles.coordinateLabel}>Koordinat GPS:</Text>
                            <View style={styles.coordinate}>
                                <MaterialIcons name="my-location" size={18} color="#64748b" />
                                <Text style={styles.coordinateValue}>
                                    {sensorData.lat}, {sensorData.lon}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Sensor data */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Data Sensor</Text>
                    <View style={styles.cardContent}>
                        {Object.entries(ANOMALY_THRESHOLDS).map(([key, threshold]) => {
                            // Skip if this sensor type isn't available in the data
                            if (sensorData[key as keyof SensorData] === undefined) return null;

                            const detail = getAnomalyDetail(sensorData, key as keyof typeof ANOMALY_THRESHOLDS);

                            // Skip if data not available
                            if (detail.value === null) return null;

                            return (
                                <View key={key} style={[
                                    styles.sensorDataRow,
                                    detail.isAnomaly && styles.anomalyDataRow
                                ]}>
                                    <View style={styles.sensorDataHeader}>
                                        <View style={styles.sensorLabelContainer}>
                                            <MaterialIcons
                                                name={threshold.icon as any}
                                                size={20}
                                                color={detail.isAnomaly ? "#ef4444" : "#64748b"}
                                            />
                                            <Text style={[
                                                styles.sensorLabel,
                                                detail.isAnomaly && styles.anomalySensorLabel
                                            ]}>
                                                {threshold.label}
                                            </Text>
                                        </View>
                                        {detail.isAnomaly && (
                                            <View style={styles.statusBadge}>
                                                <Text style={styles.statusBadgeText}>Anomali</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text style={[
                                        styles.sensorValue,
                                        detail.isAnomaly && styles.anomalySensorValue
                                    ]}>
                                        {String(sensorData[key as keyof SensorData])}
                                        {key === 'nilai_temperature' && ' °C'}
                                    </Text>

                                    {detail.isAnomaly && (
                                        <View style={styles.anomalyDetail}>
                                            <Text style={styles.anomalyMessage}>
                                                {detail.message}
                                            </Text>
                                            <Text style={styles.normalRange}>
                                                Range normal: {threshold.min !== null ? `> ${threshold.min}` : ''}
                                                {threshold.min !== null && threshold.max !== null ? ' dan ' : ''}
                                                {threshold.max !== null ? `< ${threshold.max}` : ''}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Update Prediction Button */}
                <TouchableOpacity
                    style={styles.updatePredictionButton}
                    onPress={() => setShowPredictionUpdateModal(true)}
                >
                    <View style={styles.updatePredictionButtonContent}>
                        <MaterialIcons name="update" size={22} color="#3b82f6" style={styles.updatePredictionIcon} />
                        <View style={styles.updatePredictionTextContainer}>
                            <Text style={styles.updatePredictionTitle}>Update Parameter & Prediksi</Text>
                            <Text style={styles.updatePredictionDescription}>
                                Update nilai pH, Temperatur, dan Kekeruhan untuk mendapatkan prediksi kualitas air terbaru
                            </Text>
                        </View>
                        <MaterialIcons name="arrow-forward-ios" size={16} color="#64748b" />
                    </View>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <MaterialIcons name="arrow-back" size={18} color="#3b82f6" />
                        <Text style={styles.backButtonText}>Kembali</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDelete}
                    >
                        <MaterialIcons name="delete" size={18} color="#fff" />
                        <Text style={styles.deleteButtonText}>Hapus Data</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Custom Delete Confirmation Modal */}
            <Modal
                visible={deleteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.deleteModalOverlay}>
                    <View style={styles.deleteModalContainer}>
                        <View style={styles.deleteModalIconContainer}>
                            <MaterialIcons name="warning" size={24} color="#FFF" />
                        </View>

                        <Text style={styles.deleteModalTitle}>Konfirmasi Hapus</Text>

                        <Text style={styles.deleteModalText}>
                            Apakah Anda yakin ingin menghapus data sensor ini dan semua data sensor terkait? Tindakan ini tidak dapat dibatalkan.
                        </Text>

                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.deleteModalCancelButton}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.deleteModalCancelText}>Batal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteModalDeleteButton}
                                onPress={confirmDelete}
                            >
                                <MaterialIcons name="delete-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.deleteModalDeleteText}>Hapus Data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Prediction Update Modal */}
            <Modal
                visible={showPredictionUpdateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPredictionUpdateModal(false)}
            >
                <View style={styles.predictionModalOverlay}>
                    <View style={styles.predictionModalContainer}>
                        <View style={styles.predictionModalHeader}>
                            <Text style={styles.predictionModalTitle}>Update Parameter Vital</Text>
                            <TouchableOpacity
                                onPress={() => setShowPredictionUpdateModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.predictionModalContent}>
                            <Text style={styles.predictionModalDescription}>
                                Update nilai parameter vital untuk mendapatkan prediksi kualitas air terbaru
                            </Text>

                            {/* pH Input */}
                            <View style={styles.inputGroup}>
                                <View style={styles.inputLabel}>
                                    <MaterialIcons name="science" size={20} color="#3b82f6" />
                                    <Text style={styles.inputLabelText}>Nilai pH</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    value={predictionValues.ph.toString()}
                                    onChangeText={(text) => {
                                        // Only allow numbers and one decimal point
                                        if (/^\d*\.?\d*$/.test(text)) {
                                            setPredictionValues(prev => ({
                                                ...prev,
                                                ph: text === '' ? 0 : parseFloat(text)
                                            }));
                                        }
                                    }}
                                    placeholder="Masukkan nilai pH"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>

                            {/* Temperature Input */}
                            <View style={styles.inputGroup}>
                                <View style={styles.inputLabel}>
                                    <MaterialIcons name="thermostat" size={20} color="#3b82f6" />
                                    <Text style={styles.inputLabelText}>Temperatur (°C)</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    value={predictionValues.temperature.toString()}
                                    onChangeText={(text) => {
                                        // Only allow numbers and one decimal point
                                        if (/^\d*\.?\d*$/.test(text)) {
                                            setPredictionValues(prev => ({
                                                ...prev,
                                                temperature: text === '' ? 0 : parseFloat(text)
                                            }));
                                        }
                                    }}
                                    placeholder="Masukkan nilai temperatur"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>

                            {/* Turbidity Input */}
                            <View style={styles.inputGroup}>
                                <View style={styles.inputLabel}>
                                    <MaterialIcons name="opacity" size={20} color="#3b82f6" />
                                    <Text style={styles.inputLabelText}>Kekeruhan (NTU)</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    value={predictionValues.turbidity.toString()}
                                    onChangeText={(text) => {
                                        // Only allow numbers and one decimal point
                                        if (/^\d*\.?\d*$/.test(text)) {
                                            setPredictionValues(prev => ({
                                                ...prev,
                                                turbidity: text === '' ? 0 : parseFloat(text)
                                            }));
                                        }
                                    }}
                                    placeholder="Masukkan nilai kekeruhan"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={handlePredictionUpdate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="update" size={18} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.updateButtonText}>Update & Dapatkan Prediksi</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 24,
    },
    errorText: {
        marginTop: 16,
        marginBottom: 24,
        color: '#1e293b',
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    anomalySummary: {
        backgroundColor: '#fee2e2',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
    },
    anomalyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#ef4444',
    },
    anomalyTitle: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    anomalyContent: {
        padding: 16,
    },
    anomalySubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
    },
    anomalyBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    anomalyBadge: {
        backgroundColor: '#fecaca',
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 10,
        marginBottom: 10,
    },
    anomalyBadgeText: {
        color: '#b91c1c',
        fontWeight: '600',
    },
    anomalyNote: {
        fontSize: 12,
        color: '#64748b',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginLeft: 8,
    },
    cardContent: {
        padding: 16,
    },
    locationNameContainer: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 12,
    },
    locationNameLabel: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 4,
    },
    locationName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    locationDetailsGrid: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    locationDetailItem: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: '#f1f5f9',
        paddingRight: 8,
    },
    detailLabel: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    coordinateContainer: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
    },
    coordinateLabel: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 8,
    },
    coordinate: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    coordinateValue: {
        marginLeft: 8,
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '500',
    },
    sensorDataRow: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    anomalyDataRow: {
        backgroundColor: '#fef2f2',
        marginHorizontal: -16,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#fee2e2',
    },
    sensorDataHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sensorLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sensorLabel: {
        fontSize: 14,
        color: '#64748b',
        marginLeft: 6,
    },
    anomalySensorLabel: {
        color: '#ef4444',
        fontWeight: '500',
    },
    statusBadge: {
        backgroundColor: '#fecaca',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusBadgeText: {
        color: '#b91c1c',
        fontSize: 12,
        fontWeight: '600',
    },
    sensorValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
    },
    anomalySensorValue: {
        color: '#ef4444',
    },
    anomalyDetail: {
        marginTop: 8,
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    anomalyMessage: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ef4444',
        marginBottom: 4,
    },
    normalRange: {
        fontSize: 12,
        color: '#64748b',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 24,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#3b82f6',
        fontWeight: '600',
        marginLeft: 4,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 4,
    },
    successToast: {
        backgroundColor: '#dcfce7',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#22c55e',
    },
    errorToast: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    toastText: {
        color: '#1e293b',
        fontWeight: '500',
    },
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalContainer: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 20,
        width: '80%',
        alignItems: 'center',
    },
    deleteModalIconContainer: {
        backgroundColor: '#ef4444',
        borderRadius: 50,
        padding: 10,
        marginBottom: 16,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#1e293b',
    },
    deleteModalText: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
        color: '#64748b',
        lineHeight: 20,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 8,
    },
    deleteModalCancelButton: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    deleteModalCancelText: {
        color: '#64748b',
        fontWeight: '600',
    },
    deleteModalDeleteButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteModalDeleteText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
    predictionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    predictionModalContainer: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    predictionModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 16,
    },
    predictionModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    closeButton: {
        padding: 8,
    },
    predictionModalContent: {
        width: '100%',
    },
    predictionModalDescription: {
        fontSize: 14,
        marginBottom: 24,
        color: '#64748b',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputLabelText: {
        fontSize: 14,
        color: '#1e293b',
        fontWeight: '500',
        marginLeft: 8,
    },
    input: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        fontSize: 16,
        color: '#1e293b',
        backgroundColor: '#f8fafc',
    },
    updateButton: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    updateButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    updatePredictionButton: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    updatePredictionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    updatePredictionIcon: {
        marginRight: 12,
    },
    updatePredictionTextContainer: {
        flex: 1,
    },
    updatePredictionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    updatePredictionDescription: {
        fontSize: 13,
        color: '#64748b',
    },
}); 