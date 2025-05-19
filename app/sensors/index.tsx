import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    RefreshControl, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Dimensions, TouchableWithoutFeedback, FlatList
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useToast } from '@/components/ui/toast';
import { port } from '../../constants/https';

// Define interfaces for the data structures
interface Location {
    id_lokasi: number;
    nama_lokasi?: string;
    nama_sungai?: string; // Tambahkan ini karena API menggunakan nama_sungai, bukan nama_lokasi
    alamat?: string;
    tanggal?: string;
    lat?: string;
    lon?: string;
    [key: string]: any; // Allow any additional properties
}

interface SensorLocation {
    nama_lokasi?: string;
    nama_sungai?: string; // Tambahkan ini karena API menggunakan nama_sungai, bukan nama_lokasi
    alamat?: string;
    id_lokasi: number;
    [key: string]: any;
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
    location?: SensorLocation;
    [key: string]: any; // Allow any additional properties for other sensor specific IDs
}

// Define anomaly thresholds - fokus pada 3 parameter vital
const ANOMALY_THRESHOLDS = {
    nilai_turbidity: { min: -1.0, max: 200.0, label: "Turbidity", icon: "opacity" },
    nilai_ph: { min: 6.0, max: 9.0, label: "pH", icon: "science" },
    nilai_temperature: { min: 10.0, max: 35.0, label: "Temperature", icon: "thermostat" }
};

// Determine if a data point has any anomalies
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
const LocationBadge = ({ location }: { location: SensorLocation | undefined }) => {
    if (!location) return null;

    // Try to get location name from both possible fields
    const locationName = location.nama_sungai || location.nama_lokasi || 'Lokasi tidak diketahui';

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
const getSensorTypeFromId = (id: string): string | null => {
    if (id.startsWith('id_ph') || id.includes('_ph_')) {
        return 'ph';
    } else if (id.startsWith('id_turbidity') || id.includes('_turbidity_')) {
        return 'turbidity';
    } else if (id.startsWith('id_temperature') || id.includes('_temperature_')) {
        return 'temperature';
    } else if (id.startsWith('id_accel_x') || id.includes('_accel_x_')) {
        return 'accel_x';
    } else if (id.startsWith('id_accel_y') || id.includes('_accel_y_')) {
        return 'accel_y';
    } else if (id.startsWith('id_accel_z') || id.includes('_accel_z_')) {
        return 'accel_z';
    } else if (id.startsWith('id_speed') || id.includes('_speed_')) {
        return 'speed';
    }
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
    const [allSensors, setAllSensors] = useState<SensorData[]>([]);
    const [allAnomalies, setAllAnomalies] = useState<SensorData[]>([]);
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
        return sensorData.map(item => {
            const standardItem: SensorData = {
                id: item[`id_${sensorType}`] || item.id,
                id_lokasi: location.id_lokasi,
                tanggal: item.tanggal,
                lat: item.lat,
                lon: item.lon,
                location: {
                    nama_sungai: location.nama_sungai,
                    alamat: location.alamat,
                    id_lokasi: location.id_lokasi
                }
            };

            // Add the specific sensor value
            standardItem[`nilai_${sensorType}`] = item[`nilai_${sensorType}`];

            return standardItem;
        });
    };

    const fetchAllAnomalies = async () => {
        setLoading(true);
        setLoadingProgress('Memulai pengambilan data...');
        try {
            // First, fetch all locations
            const apiLocationsUrl = port.endsWith('/') ? `${port}data_lokasi` : `${port}/data_lokasi`;
            setLoadingProgress('Mengambil data lokasi...');
            console.log('Fetching locations from:', apiLocationsUrl);

            const locationsResponse = await fetch(apiLocationsUrl);
            if (!locationsResponse.ok) {
                throw new Error(`HTTP error! Status: ${locationsResponse.status}`);
            }

            const locationsData = await locationsResponse.json();
            console.log('Locations fetched:', locationsData.length);

            setLocations(locationsData);

            // Then fetch all sensor types for all locations
            let allSensorData: SensorData[] = [];

            // List of vital sensor types to fetch
            const sensorTypes = [
                { type: 'ph', idPrefix: 'id_ph', valuePrefix: 'nilai_ph' },
                { type: 'turbidity', idPrefix: 'id_turbidity', valuePrefix: 'nilai_turbidity' },
                { type: 'temperature', idPrefix: 'id_temperature', valuePrefix: 'nilai_temperature' }
            ];

            // Fetch each sensor type independently with pagination
            for (const sensorType of sensorTypes) {
                try {
                    setLoadingProgress(`Mengambil data ${sensorType.type}...`);
                    console.log(`Fetching all ${sensorType.type} data with pagination`);
                    let currentPage = 1;
                    let totalPages = 1;
                    let allItems: any[] = [];

                    // Loop through all pages
                    do {
                        const apiUrl = port.endsWith('/')
                            ? `${port}data_${sensorType.type}?page=${currentPage}`
                            : `${port}/data_${sensorType.type}?page=${currentPage}`;

                        setLoadingProgress(`Mengambil data ${sensorType.type} halaman ${currentPage}/${totalPages}...`);
                        console.log(`Fetching ${sensorType.type} data page ${currentPage} from: ${apiUrl}`);

                        const response = await fetch(apiUrl);
                        if (!response.ok) {
                            console.error(`Error fetching ${sensorType.type} data for page ${currentPage}: Status ${response.status}`);
                            break;
                        }

                        const result = await response.json();

                        // Check if the response has the expected pagination structure
                        if (result.success && Array.isArray(result.data)) {
                            allItems = [...allItems, ...result.data];
                            totalPages = result.totalPage || 1;
                            console.log(`Fetched ${result.data.length} items from ${sensorType.type} page ${currentPage}/${totalPages}`);
                        } else if (Array.isArray(result)) {
                            allItems = [...allItems, ...result];
                            console.log(`Fetched ${result.length} items from ${sensorType.type} page ${currentPage} (no pagination info)`);
                            break; // No pagination info, assuming all data is in one response
                        } else {
                            console.error(`Unexpected API response structure for ${sensorType.type}`, result);
                            break;
                        }

                        currentPage++;

                        // Safety check to avoid infinite loops, max 50 pages (5000 items)
                        if (currentPage > 50) {
                            console.warn(`Reached safety limit of 50 pages for ${sensorType.type}`);
                            break;
                        }

                    } while (currentPage <= totalPages);

                    console.log(`Total ${sensorType.type} items fetched across all pages: ${allItems.length}`);

                    // Map to standard format including location info from our locations data
                    setLoadingProgress(`Memproses ${allItems.length} data ${sensorType.type}...`);
                    const standardItems = allItems.map(item => {
                        const matchingLocation = locationsData.find(loc =>
                            Number(loc.id_lokasi) === Number(item.id_lokasi)
                        );

                        const locationInfo = matchingLocation ? {
                            id_lokasi: matchingLocation.id_lokasi,
                            nama_sungai: matchingLocation.nama_sungai,
                            alamat: matchingLocation.alamat
                        } : {
                            id_lokasi: item.id_lokasi
                        };

                        // Create standardized item
                        const standardItem: SensorData = {
                            id: item[sensorType.idPrefix],
                            id_lokasi: Number(item.id_lokasi),
                            tanggal: item.tanggal,
                            lat: item.lat,
                            lon: item.lon,
                            location: locationInfo
                        };

                        // Add the specific sensor value
                        standardItem[sensorType.valuePrefix as keyof SensorData] = item[sensorType.valuePrefix];

                        return standardItem;
                    });

                    allSensorData = [...allSensorData, ...standardItems];
                } catch (error) {
                    console.error(`Error processing ${sensorType.type} data:`, error);
                }
            }

            console.log(`Total sensor data collected across all types: ${allSensorData.length}`);

            // Filter for anomalies
            setLoadingProgress(`Mendeteksi anomali dari ${allSensorData.length} data...`);
            const allAnomalyData = allSensorData.filter(data => {
                const anomalyCheck = hasAnomaly(data);
                return anomalyCheck.isAnomaly;
            });

            console.log(`Found ${allAnomalyData.length} anomalies out of ${allSensorData.length} data points`);
            console.log('Anomaly breakdown:');
            const anomalyTypes = {};
            allAnomalyData.forEach(data => {
                const check = hasAnomaly(data);
                check.anomalyTypes.forEach(type => {
                    if (!anomalyTypes[type]) anomalyTypes[type] = 0;
                    anomalyTypes[type]++;
                });
            });
            console.log(anomalyTypes);

            setAllSensors(allSensorData);
            setAllAnomalies(allAnomalyData);
            setLoadingProgress('');
        } catch (error) {
            console.error('Error fetching anomaly data:', error);
            toast.show({
                render: () => (
                    <View style={styles.errorToast}>
                        <Text style={styles.toastText}>Error saat mengambil data anomali</Text>
                    </View>
                ),
            });
            setLoadingProgress('');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAllAnomalies();
    };

    const handleLocationChange = (locationId: number | null) => {
        setSelectedLocation(locationId);
        setAnomalyFilter(null);
        setShowLocationModal(false);
    };

    // Filter locations based on search query
    const filteredLocations = locations.filter(location => {
        const locationName = location.nama_sungai || location.nama_lokasi || `Lokasi ${location.id_lokasi}`;
        const locationAddress = location.alamat || '';
        const query = locationSearchQuery.toLowerCase();

        return locationName.toLowerCase().includes(query) ||
            locationAddress.toLowerCase().includes(query) ||
            location.id_lokasi.toString().includes(query);
    });

    const toggleAnomalyFilter = (type: string | null) => {
        setAnomalyFilter(anomalyFilter === type ? null : type);
    };

    const handleDeleteSensor = async (sensorId: number, originalId: string) => {
        const sensorType = getSensorTypeFromId(originalId) || 'combined';

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
                            const apiUrl = port.endsWith('/')
                                ? `${port}data_${sensorType}/${originalId}`
                                : `${port}/data_${sensorType}/${originalId}`;

                            console.log(`Deleting sensor via: ${apiUrl}`);

                            const response = await fetch(apiUrl, {
                                method: 'DELETE',
                            });

                            if (!response.ok) {
                                throw new Error('Failed to delete sensor data');
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
                                        <Text style={styles.toastText}>Error saat menghapus data anomali</Text>
                                    </View>
                                ),
                            });
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    const navigateToSensorDetail = (sensor: SensorData) => {
        // Determine which sensor type this is
        let type = null;
        for (const entry of [
            { key: 'nilai_ph', type: 'ph' },
            { key: 'nilai_turbidity', type: 'turbidity' },
            { key: 'nilai_temperature', type: 'temperature' },
            { key: 'nilai_accel_x', type: 'accel_x' },
            { key: 'nilai_accel_y', type: 'accel_y' },
            { key: 'nilai_accel_z', type: 'accel_z' },
            { key: 'nilai_speed', type: 'speed' }
        ]) {
            if (sensor[entry.key as keyof typeof sensor] !== undefined) {
                type = entry.type;
                break;
            }
        }

        router.push({
            pathname: "/sensors/[id]",
            params: {
                id: sensor.id.toString(),
                sensorType: type
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
            const value = data[anomalyFilter as keyof SensorData] as number;

            return (threshold.min !== null && value < threshold.min) ||
                (threshold.max !== null && value > threshold.max);
        });

    // Count anomalies by type to display in filter buttons
    const countAnomaliesByType = (anomalies: SensorData[], type: keyof typeof ANOMALY_THRESHOLDS) => {
        return anomalies.filter(data => {
            if (data[type as keyof SensorData] === undefined) return false;

            const threshold = ANOMALY_THRESHOLDS[type];
            const value = Number(data[type as keyof SensorData]);
            if (isNaN(value)) return false;

            return (threshold.min !== null && value < threshold.min) ||
                (threshold.max !== null && value > threshold.max);
        }).length;
    };

    // Get location name helper
    const getLocationName = (id_lokasi: number, locations: Location[]): string => {
        const location = locations.find(loc => loc.id_lokasi === id_lokasi);
        return location ? (location.nama_sungai || location.nama_lokasi || `Lokasi ${id_lokasi}`) : `Lokasi ${id_lokasi}`;
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
                                                { id_lokasi: -1, nama_lokasi: 'Semua Lokasi', isAllOption: true },
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
                                                                    item.nama_sungai || item.nama_lokasi || `Lokasi ${item.id_lokasi}`}
                                                            </Text>
                                                            {!item.isAllOption && item.alamat && (
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
                                            if (sensor[key as keyof SensorData] === undefined) return null;

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
                                            onPress={() => handleDeleteSensor(sensor.id, sensor.id.toString())}
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
}); 