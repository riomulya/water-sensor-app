import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    RefreshControl, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Dimensions, TouchableWithoutFeedback, FlatList, Pressable
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useToast } from '@/components/ui/toast';
import { port } from '../../constants/https';

// Define interfaces for the data structures
interface Location {
    id_lokasi: number;
    nama_sungai: string;
    alamat: string;
    tanggal: string;
    lat: string;
    lon: string;
    isAllOption?: boolean; // Add this for the "All Locations" option
}

interface AllLocationOption {
    id_lokasi: number;
    nama_sungai: string;
    isAllOption: boolean;
    alamat?: string; // Add optional alamat property
}

type LocationWithOption = Location | AllLocationOption;

interface TransformedSensorData {
    id: number;
    id_lokasi: number;
    nilai_ph: number;
    nilai_temperature: number;
    nilai_turbidity: number;
    nilai_accel_x: number;
    nilai_accel_y: number;
    nilai_accel_z: number;
    nilai_speed: number;
    tanggal: string;
    lat: string;
    lon: string;
    location: Location;
}

interface SensorData {
    id_klasifikasi: number;
    id_lokasi: number;
    klasifikasi: string;
    tanggal: string;
    detail: string;
    id_accel_x: string;
    id_accel_y: string;
    id_accel_z: string;
    id_ph: string;
    id_speed: string;
    id_temperature: string;
    id_turbidity: string;
    data_lokasi: Location;
    data_ph: {
        id_ph: string;
        id_lokasi: number;
        tanggal: string;
        nilai_ph: number;
        lat: string;
        lon: string;
    };
    data_temperature: {
        id_temperature: string;
        id_lokasi: number;
        tanggal: string;
        nilai_temperature: number;
        lat: string;
        lon: string;
    };
    data_turbidity: {
        id_turbidity: string;
        id_lokasi: number;
        tanggal: string;
        nilai_turbidity: number;
        lat: string;
        lon: string;
    };
    data_accel_x: {
        id_accel_x: string;
        id_lokasi: number;
        tanggal: string;
        nilai_accel_x: number;
        lat: string;
        lon: string;
    };
    data_accel_y: {
        id_accel_y: string;
        id_lokasi: number;
        tanggal: string;
        nilai_accel_y: number;
        lat: string;
        lon: string;
    };
    data_accel_z: {
        id_accel_z: string;
        id_lokasi: number;
        tanggal: string;
        nilai_accel_z: number;
        lat: string;
        lon: string;
    };
    data_speed: {
        id_speed: string;
        id_lokasi: number;
        tanggal: string;
        nilai_speed: number;
        lat: string;
        lon: string;
    };
    id?: number;
    lat?: string;
    lon?: string;
}

interface ApiResponse {
    success: boolean;
    data: SensorData[];
    count: number;
}

// Define anomaly thresholds - fokus pada 3 parameter vital
const ANOMALY_THRESHOLDS = {
    nilai_turbidity: { min: -1.0, max: 200.0, label: "Turbidity", icon: "opacity" },
    nilai_ph: { min: 6.0, max: 9.0, label: "pH", icon: "science" },
    nilai_temperature: { min: 10.0, max: 35.0, label: "Temperature", icon: "thermostat" }
};

// Determine if a data point has any anomalies
const hasAnomaly = (data: TransformedSensorData): { isAnomaly: boolean, anomalyTypes: string[] } => {
    const anomalyTypes: string[] = [];

    for (const [key, threshold] of Object.entries(ANOMALY_THRESHOLDS)) {
        // Skip if sensor doesn't have this value
        if (data[key as keyof TransformedSensorData] === undefined) continue;

        const value = Number(data[key as keyof TransformedSensorData]);
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
const getAnomalyDetail = (data: TransformedSensorData, type: keyof typeof ANOMALY_THRESHOLDS) => {
    // Skip if sensor doesn't have this value
    if (data[type as keyof TransformedSensorData] === undefined) {
        return { value: null, isAnomaly: false, message: "Data tidak tersedia" };
    }

    const value = Number(data[type as keyof TransformedSensorData]);
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
                ? `Too low (< ${threshold.min})`
                : `Too high (> ${threshold.max})`
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

// Helper component for location display
const LocationBadge = ({ location }: { location: Location | undefined }) => {
    if (!location) return null;

    // Try to get location name from both possible fields
    const locationName = location.nama_sungai || 'Lokasi tidak diketahui';

    return (
        <View style={styles.locationBadge}>
            <MaterialIcons name="location-on" size={12} color="#3b82f6" />
            <Text style={styles.locationBadgeText}>
                {locationName}
            </Text>
        </View>
    );
};

// Helper to determine sensor type from ID string
const getSensorTypeFromId = (id: string | number): string | null => {
    // Ubah ke string untuk memastikan konsistensi
    const idStr = String(id).toLowerCase();

    // Cek tipe sensor berdasarkan pola ID
    if (idStr.includes('ph') || (idStr.startsWith('01') && idStr.length > 20)) {
        return 'ph';
    } else if (idStr.includes('turbid')) {
        return 'turbidity';
    } else if (idStr.includes('temp')) {
        return 'temperature';
    } else if (idStr.includes('accel_x') || (idStr.includes('accel') && idStr.includes('x'))) {
        return 'accel_x';
    } else if (idStr.includes('accel_y') || (idStr.includes('accel') && idStr.includes('y'))) {
        return 'accel_y';
    } else if (idStr.includes('accel_z') || (idStr.includes('accel') && idStr.includes('z'))) {
        return 'accel_z';
    } else if (idStr.includes('speed')) {
        return 'speed';
    }

    // Jika tidak bisa menentukan tipe dari ID, coba deteksi dari struktur ID
    // Untuk ID dari MongoDB/ObjectID format
    if (idStr.match(/^[0-9a-f]{24}$/i)) {
        return 'combined';
    }

    // ID generik dengan UUID / format lainnya
    return null;
};

// Helper untuk menampilkan status anomali dengan badge yang sesuai
const AnomalyStatusBadge = ({ detail, paramName }: { detail: any, paramName: string }) => {
    // Jika nilai tidak ada, return null
    if (!detail || detail.value === null) return null;

    if (detail.isAnomaly) {
        // Warna berbeda untuk tiap parameter
        let badgeColor = '#ef4444'; // Default merah
        if (paramName.includes('ph')) {
            badgeColor = '#7c3aed'; // Ungu untuk pH
        } else if (paramName.includes('temperature')) {
            badgeColor = '#f97316'; // Orange untuk temperature
        } else if (paramName.includes('turbidity')) {
            badgeColor = '#6366f1'; // Indigo untuk turbidity
        }

        return (
            <View style={[styles.statusBadge, { backgroundColor: `${badgeColor}20` }]}>
                <MaterialIcons name="warning" size={12} color={badgeColor} />
                <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                    {detail.message} ({detail.value})
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.normalBadge}>
            <MaterialIcons name="check-circle" size={12} color="#10b981" />
            <Text style={styles.normalBadgeText}>Normal ({detail.value})</Text>
        </View>
    );
};

export default function AnomalyScreen() {
    const [allSensors, setAllSensors] = useState<TransformedSensorData[]>([]);
    const [allAnomalies, setAllAnomalies] = useState<TransformedSensorData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState<string>('');
    const [refreshing, setRefreshing] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
    const [anomalyFilter, setAnomalyFilter] = useState<string | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const toast = useToast();
    const windowHeight = Dimensions.get('window').height;
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [sensorToDelete, setSensorToDelete] = useState<{ id: number | string, originalId: string } | null>(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        fetchAllAnomalies();
    }, []);

    const fetchLocations = async () => {
        try {
            // Ensure URL ends with slash if needed
            const apiUrl = port.endsWith('/') ? `${port}data_lokasi` : `${port}/data_lokasi`;
            console.log('Fetching locations from:', apiUrl);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const locationData = await response.json();
            console.log('Locations fetched:', locationData.length);

            setLocations(locationData);
        } catch (error) {
            console.error('Error fetching locations:', error);
            toast.show({
                render: () => (
                    <View style={styles.errorToast}>
                        <Text style={styles.toastText}>Error saat mengambil data lokasi</Text>
                    </View>
                ),
            });
        }
    };

    const fetchDataForSensorType = async (sensorType: string, location: Location) => {
        const apiUrl = port.endsWith('/')
            ? `${port}data_${sensorType}/${location.id_lokasi}`
            : `${port}/data_${sensorType}/${location.id_lokasi}`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error(`Error fetching ${sensorType} data for location ${location.id_lokasi}`);
            return [];
        }

        const result = await response.json();
        let sensorData: any[] = [];

        // Check if the response has the expected structure
        if (result.success && Array.isArray(result.data)) {
            sensorData = result.data;
        } else if (Array.isArray(result)) {
            sensorData = result;
        } else {
            console.error(`Unexpected API response structure for ${sensorType} at location:`, location.id_lokasi);
            return [];
        }

        // Map to standard format with location info
        return sensorData.map(item => ({
            id_klasifikasi: item[`id_${sensorType}`] || item.id,
            id_lokasi: location.id_lokasi,
            tanggal: item.tanggal,
            data_lokasi: {
                id_lokasi: location.id_lokasi,
                nama_sungai: location.nama_sungai,
                alamat: location.alamat,
                tanggal: location.tanggal,
                lat: location.lat,
                lon: location.lon
            },
            [`data_${sensorType}`]: {
                [`id_${sensorType}`]: item[`id_${sensorType}`] || item.id,
                id_lokasi: location.id_lokasi,
                tanggal: item.tanggal,
                [`nilai_${sensorType}`]: item[`nilai_${sensorType}`],
                lat: item.lat,
                lon: item.lon
            }
        }));
    };

    const fetchAllAnomalies = async () => {
        try {
            setLoading(true);
            setLoadingProgress('Fetching sensor data...');

            const response = await fetch('https://server-water-sensors.onrender.com/klasifikasi/all');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result: ApiResponse = await response.json();

            console.log('Result:', result.data.length);

            if (!result.success) {
                throw new Error('API returned unsuccessful response');
            }

            // Transform the data to match our existing structure
            const transformedData: TransformedSensorData[] = result.data.map(item => {
                const transformed: TransformedSensorData = {
                    id: item.id_klasifikasi,
                    id_lokasi: item.id_lokasi,
                    nilai_ph: item.data_ph.nilai_ph,
                    nilai_temperature: item.data_temperature.nilai_temperature,
                    nilai_turbidity: item.data_turbidity.nilai_turbidity,
                    nilai_accel_x: item.data_accel_x.nilai_accel_x,
                    nilai_accel_y: item.data_accel_y.nilai_accel_y,
                    nilai_accel_z: item.data_accel_z.nilai_accel_z,
                    nilai_speed: item.data_speed.nilai_speed,
                    tanggal: item.tanggal,
                    lat: item.data_lokasi.lat,
                    lon: item.data_lokasi.lon,
                    location: {
                        id_lokasi: item.data_lokasi.id_lokasi,
                        nama_sungai: item.data_lokasi.nama_sungai,
                        alamat: item.data_lokasi.alamat,
                        tanggal: item.data_lokasi.tanggal,
                        lat: item.data_lokasi.lat,
                        lon: item.data_lokasi.lon
                    }
                };
                return transformed;
            });

            setAllSensors(transformedData);
            setAllAnomalies(transformedData.filter(data => hasAnomaly(data).isAnomaly));
        } catch (error) {
            console.error('Error fetching anomalies:', error);
            toast.show({
                render: () => (
                    <View style={styles.errorToast}>
                        <Text style={styles.toastText}>Error saat mengambil data sensor</Text>
                    </View>
                ),
            });
        } finally {
            setLoading(false);
            setRefreshing(false); // Make sure to reset refreshing state
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAllAnomalies().catch(() => {
            // Ensure refreshing is reset even if fetchAllAnomalies fails
            setRefreshing(false);
        });
    };

    const handleLocationChange = (locationId: number | null) => {
        setSelectedLocation(locationId);
        setAnomalyFilter(null);
        setShowLocationModal(false);
    };

    // Update the location filtering logic
    const filteredLocations = locations.filter(location => {
        if ('isAllOption' in location) {
            return true; // Always include the "All Locations" option
        }
        const locationName = location.nama_sungai || 'Lokasi tidak diketahui';
        const locationAddress = 'alamat' in location ? location.alamat || '' : '';
        const query = locationSearchQuery.toLowerCase();
        return locationName.toLowerCase().includes(query) || locationAddress.toLowerCase().includes(query);
    });

    const toggleAnomalyFilter = (type: string | null) => {
        setAnomalyFilter(anomalyFilter === type ? null : type);
    };

    const handleDeleteSensor = async (sensorId: number | string, originalId: string) => {
        setLoading(true);
        try {
            console.log(`Attempting to delete sensor with ID: ${sensorId}`);

            // Extract the klasifikasi ID
            let klasifikasiId = sensorId;
            if (typeof originalId === 'string' && originalId.includes('_')) {
                // Extract the number after the last underscore
                const parts = originalId.split('_');
                klasifikasiId = parts[parts.length - 1];
            }

            console.log(`Using klasifikasiId: ${klasifikasiId} for deletion`);

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

            // Refresh all anomalies after deletion
            fetchAllAnomalies();

            toast.show({
                render: () => (
                    <View style={styles.successToast}>
                        <Text style={styles.toastText}>Data anomali berhasil dihapus</Text>
                    </View>
                ),
            });
        } catch (error) {
            console.error('Error deleting sensor data:', error);
            toast.show({
                render: () => (
                    <View style={styles.errorToast}>
                        <Text style={styles.toastText}>
                            Error saat menghapus data anomali: {error instanceof Error ? error.message : 'Unknown error'}
                        </Text>
                    </View>
                ),
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    const navigateToSensorDetail = (sensor: TransformedSensorData) => {
        // First try to get sensor type from the ID format
        let type = getSensorTypeFromId(sensor.id);

        // If type not found from ID, try to determine from available values
        if (!type) {
            for (const entry of [
                { key: 'nilai_ph', type: 'ph' },
                { key: 'nilai_turbidity', type: 'turbidity' },
                { key: 'nilai_temperature', type: 'temperature' },
                { key: 'nilai_accel_x', type: 'accel_x' },
                { key: 'nilai_accel_y', type: 'accel_y' },
                { key: 'nilai_accel_z', type: 'accel_z' },
                { key: 'nilai_speed', type: 'speed' }
            ]) {
                if (sensor[entry.key as keyof TransformedSensorData] !== undefined) {
                    type = entry.type;
                    break;
                }
            }
        }

        // If still no type found, use combined
        if (!type) {
            type = 'combined';
            console.warn('Could not determine sensor type for:', sensor);
        }

        // Get the original ID format based on type
        let originalId: string | number = sensor.id;
        if (typeof originalId === 'number') {
            originalId = `id_${type}_${originalId}`;
        }

        console.log(`Navigating to sensor detail with id ${originalId} and type ${type}`);

        router.push({
            pathname: "/sensors/[id]",
            params: {
                id: originalId.toString(),
                sensorType: type,
                timestamp: sensor.tanggal // Pass timestamp for classification
            }
        });
    };

    // Filter anomalies based on selected location and anomaly type
    const filteredAnomalies = allAnomalies
        // First filter by location if one is selected
        .filter(data => selectedLocation === null || data.id_lokasi === selectedLocation)
        // Then filter by anomaly type if one is selected
        .filter(data => {
            if (!anomalyFilter) return true;

            const threshold = ANOMALY_THRESHOLDS[anomalyFilter as keyof typeof ANOMALY_THRESHOLDS];
            const value = data[anomalyFilter as keyof TransformedSensorData] as number;

            return (threshold.min !== null && value < threshold.min) ||
                (threshold.max !== null && value > threshold.max);
        });

    // Count anomalies by type to display in filter buttons
    const countAnomaliesByType = (anomalies: TransformedSensorData[], type: keyof typeof ANOMALY_THRESHOLDS) => {
        return anomalies.filter(data => {
            if (data[type as keyof TransformedSensorData] === undefined) return false;

            const threshold = ANOMALY_THRESHOLDS[type];
            const value = Number(data[type as keyof TransformedSensorData]);
            if (isNaN(value)) return false;

            return (threshold.min !== null && value < threshold.min) ||
                (threshold.max !== null && value > threshold.max);
        }).length;
    };

    // Get location name helper
    const getLocationName = (id_lokasi: number, locations: Location[]): string => {
        const location = locations.find(loc => loc.id_lokasi === id_lokasi);
        return location ? (location.nama_sungai || 'Lokasi tidak diketahui') : `Lokasi ${id_lokasi}`;
    };

    return (
        <View style={styles.container}>
            {/* Location filter */}
            <View style={styles.locationSelectorContainer}>
                <View style={styles.locationHeader}>
                    <MaterialIcons name="location-on" size={20} color="#3b82f6" />
                    <Text style={styles.locationHeaderText}>Filter Lokasi</Text>
                </View>

                <View style={styles.locationDropdown}>
                    <TouchableOpacity
                        style={styles.selectedLocationCard}
                        onPress={() => setShowLocationModal(true)}
                    >
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationName}>
                                {selectedLocation === null
                                    ? 'Semua Lokasi'
                                    : getLocationName(selectedLocation, locations)}
                            </Text>
                            <Text style={styles.locationAddress}>
                                {selectedLocation === null
                                    ? `${locations.length} lokasi pemantauan`
                                    : locations.find(loc => loc.id_lokasi === selectedLocation)?.alamat || 'Alamat tidak tersedia'}
                            </Text>
                        </View>
                        <View style={styles.changeButton}>
                            <Text style={styles.changeButtonText}>Pilih</Text>
                            <MaterialIcons
                                name="arrow-drop-down"
                                size={24}
                                color="#3b82f6"
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Location Selection Modal */}
                    <Modal
                        visible={showLocationModal}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowLocationModal(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setShowLocationModal(false)}>
                            <View style={styles.modalOverlay}>
                                <TouchableWithoutFeedback>
                                    <View style={styles.modalContainer}>
                                        <View style={styles.modalHeader}>
                                            <Text style={styles.modalTitle}>Pilih Lokasi</Text>
                                            <TouchableOpacity
                                                onPress={() => setShowLocationModal(false)}
                                                style={styles.closeButton}
                                            >
                                                <Ionicons name="close" size={24} color="#64748b" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.searchContainer}>
                                            <Feather name="search" size={18} color="#64748b" style={styles.searchIcon} />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Cari lokasi..."
                                                placeholderTextColor="#94a3b8"
                                                value={locationSearchQuery}
                                                onChangeText={setLocationSearchQuery}
                                                autoCapitalize="none"
                                            />
                                            {locationSearchQuery ? (
                                                <TouchableOpacity
                                                    onPress={() => setLocationSearchQuery('')}
                                                    style={styles.clearButton}
                                                >
                                                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>

                                        <FlatList
                                            data={[
                                                { id_lokasi: -1, nama_sungai: 'Semua Lokasi', isAllOption: true },
                                                ...filteredLocations
                                            ]}
                                            keyExtractor={item => item.isAllOption ? 'all' : item.id_lokasi.toString()}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.locationItem,
                                                        (item.isAllOption && selectedLocation === null) ||
                                                            (!item.isAllOption && selectedLocation === item.id_lokasi)
                                                            ? styles.selectedLocationItem : {}
                                                    ]}
                                                    onPress={() => handleLocationChange(item.isAllOption ? null : item.id_lokasi)}
                                                >
                                                    <View style={styles.locationItemContent}>
                                                        {item.isAllOption ? (
                                                            <MaterialIcons name="location-searching" size={20} color={selectedLocation === null ? "#3b82f6" : "#64748b"} />
                                                        ) : (
                                                            <MaterialIcons name="place" size={20} color={selectedLocation === item.id_lokasi ? "#3b82f6" : "#64748b"} />
                                                        )}
                                                        <View style={styles.locationItemText}>
                                                            <Text style={[
                                                                styles.locationItemName,
                                                                (item.isAllOption && selectedLocation === null) ||
                                                                    (!item.isAllOption && selectedLocation === item.id_lokasi)
                                                                    ? styles.selectedLocationItemText : {}
                                                            ]}>
                                                                {item.isAllOption ? 'Semua Lokasi' :
                                                                    item.nama_sungai || `Lokasi ${item.id_lokasi}`}
                                                            </Text>
                                                            {!item.isAllOption && 'alamat' in item && item.alamat && (
                                                                <Text style={styles.locationItemAddress}>
                                                                    {item.alamat}
                                                                </Text>
                                                            )}
                                                            {item.isAllOption && (
                                                                <Text style={styles.locationItemAddress}>
                                                                    {`${locations.length} lokasi pemantauan`}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>

                                                    {((item.isAllOption && selectedLocation === null) ||
                                                        (!item.isAllOption && selectedLocation === item.id_lokasi)) && (
                                                            <MaterialIcons name="check-circle" size={20} color="#3b82f6" />
                                                        )}
                                                </TouchableOpacity>
                                            )}
                                            style={styles.locationList}
                                            contentContainerStyle={styles.locationListContent}
                                            showsVerticalScrollIndicator={true}
                                            initialNumToRender={15}
                                        />
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                </View>
            </View>

            {/* Anomaly Type Filters */}
            <View style={styles.anomalyFiltersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.anomalyFilters}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            anomalyFilter === null && styles.activeFilter
                        ]}
                        onPress={() => toggleAnomalyFilter(null)}
                    >
                        <MaterialIcons name="warning" size={16} color={anomalyFilter === null ? "#fff" : "#64748b"} />
                        <Text style={[
                            styles.filterText,
                            anomalyFilter === null && styles.activeFilterText
                        ]}>
                            Semua Anomali ({filteredAnomalies.length})
                        </Text>
                    </TouchableOpacity>

                    {Object.entries(ANOMALY_THRESHOLDS).map(([key, threshold]) => {
                        // Count anomalies by type, respecting the location filter
                        const anomalyCount = countAnomaliesByType(
                            selectedLocation === null
                                ? allAnomalies
                                : allAnomalies.filter(data => data.id_lokasi === selectedLocation),
                            key as keyof typeof ANOMALY_THRESHOLDS
                        );

                        if (anomalyCount === 0) return null;

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.filterButton,
                                    anomalyFilter === key && styles.activeFilter
                                ]}
                                onPress={() => toggleAnomalyFilter(key)}
                            >
                                <MaterialIcons
                                    name={threshold.icon as any}
                                    size={16}
                                    color={anomalyFilter === key ? "#fff" : "#64748b"}
                                />
                                <Text style={[
                                    styles.filterText,
                                    anomalyFilter === key && styles.activeFilterText
                                ]}>
                                    {threshold.label} ({anomalyCount})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Anomaly data list */}
            <ScrollView
                style={styles.dataContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
                        <Text style={styles.loadingText}>
                            {loadingProgress || 'Mengambil data anomali...'}
                        </Text>
                        <Text style={styles.loadingSubText}>
                            Mohon tunggu, pengambilan data membutuhkan waktu karena jumlah data yang besar
                        </Text>
                    </View>
                ) : filteredAnomalies.length > 0 ? (
                    <>
                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryText}>
                                Menampilkan {filteredAnomalies.length} anomali
                                {selectedLocation === null
                                    ? ' dari semua lokasi'
                                    : ` dari lokasi ${getLocationName(selectedLocation, locations)}`
                                }
                            </Text>
                        </View>

                        {filteredAnomalies.map((sensor) => {
                            const { anomalyTypes } = hasAnomaly(sensor);
                            const locationName = getLocationName(sensor.id_lokasi, locations);

                            return (
                                <TouchableOpacity
                                    key={`${sensor.id}`}
                                    style={styles.sensorCard}
                                    onPress={() => navigateToSensorDetail(sensor)}
                                >
                                    <View style={styles.sensorHeader}>
                                        <View style={styles.sensorHeaderLeft}>
                                            <Text style={styles.sensorId}>ID: {sensor.id}</Text>
                                            <Text style={styles.sensorTimestamp}>{formatDate(sensor.tanggal)}</Text>
                                        </View>
                                        {selectedLocation === null && (
                                            <View style={styles.locationBadge}>
                                                <MaterialIcons name="location-on" size={12} color="#3b82f6" />
                                                <Text style={styles.locationBadgeText}>
                                                    {locationName}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.anomalyBadges}>
                                        {anomalyTypes.map((type) => (
                                            <View key={type} style={styles.anomalyBadge}>
                                                <Text style={styles.anomalyBadgeText}>{type}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.sensorData}>
                                        {Object.entries(ANOMALY_THRESHOLDS).map(([key, threshold]) => {
                                            // Skip if sensor doesn't have this value
                                            if (sensor[key as keyof TransformedSensorData] === undefined) return null;

                                            const detail = getAnomalyDetail(sensor, key as keyof typeof ANOMALY_THRESHOLDS);

                                            // Skip if data not available
                                            if (detail.value === null) return null;

                                            // Skip if filtering by type and this isn't the filtered type
                                            if (anomalyFilter && anomalyFilter !== key) return null;

                                            return (
                                                <View key={key} style={[
                                                    styles.dataRow,
                                                    detail.isAnomaly && styles.anomalyDataRow
                                                ]}>
                                                    <View style={styles.dataLabelRow}>
                                                        <MaterialIcons name={threshold.icon as any} size={16} color={detail.isAnomaly ? "#ef4444" : "#64748b"} />
                                                        <Text style={[
                                                            styles.dataLabel,
                                                            detail.isAnomaly && styles.anomalyDataLabel
                                                        ]}>
                                                            {threshold.label}
                                                        </Text>
                                                    </View>
                                                    <AnomalyStatusBadge detail={detail} paramName={key} />
                                                </View>
                                            );
                                        })}
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => navigateToSensorDetail(sensor)}
                                        >
                                            <MaterialIcons name="edit" size={16} color="#3b82f6" />
                                            <Text style={styles.editButtonText}>Lihat Detail</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.deleteIcon}
                                            onPress={() => {
                                                setDeleteModalVisible(true);
                                                setSensorToDelete({ id: sensor.id, originalId: sensor.id.toString() });
                                            }}
                                        >
                                            <MaterialIcons name="delete" size={20} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="check-circle" size={64} color="#cbd5e1" />
                        <Text style={styles.emptyStateText}>
                            {anomalyFilter
                                ? `Tidak ada anomali ${ANOMALY_THRESHOLDS[anomalyFilter as keyof typeof ANOMALY_THRESHOLDS].label} ditemukan`
                                : `Tidak ada anomali sensor ditemukan${selectedLocation !== null ? ' di lokasi ini' : ''}`
                            }
                        </Text>
                    </View>
                )}
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
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    if (sensorToDelete) {
                                        handleDeleteSensor(sensorToDelete.id, sensorToDelete.originalId);
                                    }
                                }}
                            >
                                <MaterialIcons name="delete-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.deleteModalDeleteText}>Hapus Data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    locationSelectorContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        zIndex: 1000,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    locationHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3b82f6',
        marginLeft: 4,
    },
    locationDropdown: {
        width: '100%',
        position: 'relative',
        zIndex: 1000,
    },
    selectedLocationCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 2,
    },
    locationAddress: {
        fontSize: 13,
        color: '#64748b',
    },
    changeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    changeButtonText: {
        color: '#3b82f6',
        fontWeight: '500',
        fontSize: 14,
    },
    selectLocationButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    selectLocationText: {
        color: '#3b82f6',
        fontWeight: '600',
        fontSize: 15,
    },
    anomalyFiltersContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    anomalyFiltersHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    anomalyFiltersTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    anomalyFiltersSubtitle: {
        fontSize: 14,
        color: '#64748b',
    },
    anomalyFilters: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        marginRight: 8,
        marginBottom: 8,
    },
    activeFilter: {
        backgroundColor: '#3b82f6',
    },
    filterText: {
        marginLeft: 4,
        fontSize: 13,
        color: '#64748b',
    },
    activeFilterText: {
        color: '#fff',
        fontWeight: '600',
    },
    dataContainer: {
        flex: 1,
        padding: 16,
    },
    summaryContainer: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
    },
    summaryText: {
        color: '#64748b',
        fontSize: 14,
    },
    loaderContainer: {
        marginTop: 50,
        alignItems: 'center',
        padding: 20,
    },
    loader: {
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#3b82f6',
        marginBottom: 8,
        fontWeight: '600',
        textAlign: 'center',
    },
    loadingSubText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
    },
    sensorCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sensorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    sensorHeaderLeft: {
        flex: 1,
    },
    sensorId: {
        fontWeight: '700',
        color: '#1e293b',
    },
    sensorTimestamp: {
        color: '#64748b',
        fontSize: 12,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginLeft: 8,
    },
    locationBadgeText: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    anomalyBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    anomalyBadge: {
        backgroundColor: '#fee2e2',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 8,
        marginBottom: 8,
    },
    anomalyBadgeText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
    },
    sensorData: {
        marginBottom: 12,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    anomalyDataRow: {
        backgroundColor: '#fee2e220',
    },
    dataLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dataLabel: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    anomalyDataLabel: {
        color: '#ef4444',
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusBadgeText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    normalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    normalBadgeText: {
        color: '#10b981',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButtonText: {
        marginLeft: 4,
        color: '#3b82f6',
        fontWeight: '500',
    },
    deleteIcon: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 16,
        textAlign: 'center',
    },
    errorToast: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    successToast: {
        backgroundColor: '#dcfce7',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#22c55e',
    },
    toastText: {
        color: '#1e293b',
        fontWeight: '500',
    },
    noLocationContainer: {
        padding: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    noLocationText: {
        color: '#64748b',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '100%',
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        margin: 16,
        paddingHorizontal: 12,
        backgroundColor: '#f8fafc',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        color: '#1e293b',
        fontSize: 16,
    },
    clearButton: {
        padding: 4,
    },
    locationList: {
        maxHeight: 450,
    },
    locationListContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    selectedLocationItem: {
        backgroundColor: '#eff6ff',
        borderRadius: 8,
    },
    locationItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationItemText: {
        marginLeft: 12,
        flex: 1,
    },
    locationItemName: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500',
    },
    selectedLocationItemText: {
        fontWeight: '600',
        color: '#3b82f6',
    },
    locationItemAddress: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    deleteModalContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        width: '90%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        padding: 24,
    },
    deleteModalIconContainer: {
        backgroundColor: '#ef4444',
        borderRadius: 50,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        width: 56,
        height: 56,
    },
    deleteModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
        textAlign: 'center',
    },
    deleteModalText: {
        color: '#64748b',
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    deleteModalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    deleteModalCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        marginRight: 8,
        height: 44,
        justifyContent: 'center',
    },
    deleteModalCancelText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 14,
    },
    deleteModalDeleteButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#ef4444',
        marginLeft: 8,
        height: 44,
    },
    deleteModalDeleteText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
}); 