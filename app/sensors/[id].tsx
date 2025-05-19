import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TextInput, TouchableOpacity, ActivityIndicator,
    Alert, KeyboardAvoidingView, Platform
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
    nilai_turbidity: { min: -1.0, max: 1000, label: "Turbidity", icon: "opacity" },
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

    useEffect(() => {
        fetchSensorData();
    }, [id, sensorType]);

    // Get corresponding location data
    useEffect(() => {
        if (sensorData?.id_lokasi) {
            fetchLocationData(sensorData.id_lokasi);
        }
    }, [sensorData]);

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
                if (id.startsWith('id_ph_')) {
                    type = 'ph';
                } else if (id.startsWith('id_turbidity_')) {
                    type = 'turbidity';
                } else if (id.startsWith('id_temperature_')) {
                    type = 'temperature';
                } else if (id.startsWith('id_accel_x_')) {
                    type = 'accel_x';
                } else if (id.startsWith('id_accel_y_')) {
                    type = 'accel_y';
                } else if (id.startsWith('id_accel_z_')) {
                    type = 'accel_z';
                } else if (id.startsWith('id_speed_')) {
                    type = 'speed';
                }
            }

            setDetectedType(type);

            // If we have a specific type, use that endpoint
            let endpoint = 'combined';
            if (type) {
                endpoint = type;
            }

            const apiUrl = port.endsWith('/')
                ? `${port}data_${endpoint}/${id}`
                : `${port}/data_${endpoint}/${id}`;

            console.log('Fetching sensor detail from:', apiUrl);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();

            let sensorDetail: SensorData | null = null;

            if (result.success && result.data) {
                // Handle API response with success property
                sensorDetail = Array.isArray(result.data) && result.data.length > 0
                    ? result.data[0]
                    : result.data;
            } else if (Array.isArray(result) && result.length > 0) {
                // Handle direct array response
                sensorDetail = result[0];
            } else if (typeof result === 'object' && result !== null) {
                // Handle single object response
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
        } catch (error) {
            console.error('Error fetching sensor data:', error);
            setError('Gagal mengambil data sensor. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        if (!sensorData) return;

        Alert.alert(
            'Konfirmasi Hapus',
            'Apakah Anda yakin ingin menghapus data anomali ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Use the specific sensor type for deletion if available
                            const endpoint = detectedType || 'combined';

                            const apiUrl = port.endsWith('/')
                                ? `${port}data_${endpoint}/${id}`
                                : `${port}/data_${endpoint}/${id}`;

                            console.log('Deleting sensor via:', apiUrl);

                            const response = await fetch(apiUrl, {
                                method: 'DELETE',
                            });

                            if (!response.ok) {
                                throw new Error('Failed to delete sensor data');
                            }

                            // Navigate back after successful deletion
                            router.back();

                        } catch (error) {
                            console.error('Error deleting sensor data:', error);
                            Alert.alert(
                                'Error',
                                'Gagal menghapus data anomali. Silakan coba lagi.'
                            );
                        }
                    },
                },
            ]
        );
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
}); 