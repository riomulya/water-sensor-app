import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

// Components
import { Text } from '@/components/ui/text';
import StatisticsHeader from '@/components/statistics/StatisticsHeader';
import LocationSelector from '@/components/statistics/LocationSelector';
import StatsSummaryCards from '@/components/statistics/StatsSummaryCards';
import SensorTrendsChart from '@/components/statistics/SensorTrendsChart';
import SensorDataTable from '@/components/statistics/SensorDataTable';

// Config
import { port as API_URL } from '@/constants/https';

// Types - define inline to avoid import issues
interface Location {
    id_lokasi: string;
    nama_sungai: string; // API returns nama_sungai instead of nama_lokasi
    latitude?: number;
    longitude?: number;
    lat?: string;
    lon?: string;
    created_at?: string;
    tanggal?: string;
    alamat?: string;
}

// API response format
interface ApiSensorData {
    id_lokasi?: string;
    nilai_accel_x?: number;
    nilai_accel_y?: number;
    nilai_accel_z?: number;
    nilai_ph?: number;
    nilai_temperature?: number;
    nilai_turbidity?: number;
    nilai_speed?: number;
    tanggal?: string;
    lat?: string;
    lon?: string;
}

// Component expected format
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

const { width } = Dimensions.get('window');

// Add an "All" option for locations
const ALL_OPTION = {
    id_lokasi: 'all',
    nama_sungai: 'Semua Lokasi'
};

export default function StatisticsScreen() {
    const [loading, setLoading] = useState<boolean>(true);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [sensorData, setSensorData] = useState<SensorData[] | null>(null);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);

    // Fetch locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await fetch(`${API_URL}data_lokasi`);
                const data = await response.json();
                console.log("Locations data:", data ? `${data.length} locations` : 'No locations');

                // Map the API response to match the expected Location interface
                const mappedLocations = data.map((location: any) => ({
                    id_lokasi: location.id_lokasi,
                    nama_sungai: location.nama_sungai || 'Lokasi tidak bernama',
                    latitude: location.lat ? parseFloat(location.lat) : 0,
                    longitude: location.lon ? parseFloat(location.lon) : 0,
                    lat: location.lat,
                    lon: location.lon,
                    tanggal: location.tanggal,
                    alamat: location.alamat
                }));

                // Add "All Locations" option
                const allLocations = [
                    { ...ALL_OPTION },
                    ...mappedLocations
                ];

                setLocations(allLocations);
                // Set default to "All Locations"
                setSelectedLocation('all');
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };

        fetchLocations();
    }, []);

    // Fetch sensor data when selected location changes
    useEffect(() => {
        if (!selectedLocation) return;

        fetchSensorData();
    }, [selectedLocation, currentPage]);

    // Fetch sensor data with pagination
    const fetchSensorData = async () => {
        setLoading(true);
        try {
            let apiUrl;
            const pageSize = 100; // Server default page size is 100

            // Use different endpoint based on whether all locations are selected or specific location
            if (selectedLocation === 'all') {
                // For all locations, use the endpoint without location ID
                apiUrl = `${API_URL}data_combined`;
                console.log(`Fetching all sensor data from: ${apiUrl}`);
            } else {
                // For specific location
                apiUrl = `${API_URL}data_combined/paginated/${selectedLocation}?page=${currentPage}&limit=${pageSize}`;
                console.log(`Fetching sensor data for location ${selectedLocation} from: ${apiUrl}`);
            }

            const response = await fetch(apiUrl);
            const responseData = await response.json();

            // Handle different response formats
            let apiData: ApiSensorData[] = [];

            if (responseData.success && Array.isArray(responseData.data)) {
                apiData = responseData.data;
                setTotalRecords(responseData.total || apiData.length);
                setTotalPages(responseData.totalPage || 1);
            } else if (Array.isArray(responseData)) {
                apiData = responseData;
                setTotalRecords(apiData.length);
                setTotalPages(1);
            } else if (responseData.data && Array.isArray(responseData.data)) {
                apiData = responseData.data;
                setTotalRecords(responseData.total || apiData.length);
                setTotalPages(responseData.totalPage || 1);
            }

            console.log("Sensor data received:", apiData ?
                `${apiData.length} items of ${responseData.total || 'unknown'} total (Page ${currentPage}/${responseData.totalPage || 1})` :
                'No data');

            // Map API response fields to component expected fields
            const mappedData: SensorData[] = apiData.map(item => ({
                id: String(Math.random()),
                id_lokasi: item.id_lokasi || selectedLocation,
                accel_x: item.nilai_accel_x || 0,
                accel_y: item.nilai_accel_y || 0,
                accel_z: item.nilai_accel_z || 0,
                turbidity: item.nilai_turbidity || 0,
                ph: item.nilai_ph || 0,
                temperature: item.nilai_temperature || 0,
                speed: item.nilai_speed || 0,
                timestamp: item.tanggal || new Date().toISOString(),
            }));

            // If first page, replace data. Otherwise append to existing data
            if (currentPage === 1) {
                setSensorData(mappedData);
            } else if (sensorData) {
                setSensorData([...sensorData, ...mappedData]);
            } else {
                setSensorData(mappedData);
            }
        } catch (error) {
            console.error('Error fetching sensor data:', error);
            setSensorData([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    };

    const handleLocationChange = (locationId: string) => {
        setSelectedLocation(locationId);
        setCurrentPage(1); // Reset to page 1 when location changes
    };

    // Function to load more data
    const loadMoreData = () => {
        if (currentPage < totalPages && !loading) {
            setCurrentPage(currentPage + 1);
        }
    };

    // Function to handle manual pagination
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            setCurrentPage(page);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />
            <StatisticsHeader />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0)']}
                    style={styles.gradientBackground}
                >
                    <MotiView
                        style={styles.titleContainer}
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 500 }}
                    >
                        <Text size="2xl" bold style={styles.title}>
                            Statistik Sensor Air
                        </Text>
                        {totalRecords > 0 && (
                            <Text size="sm" style={styles.dataCount}>
                                Total {totalRecords.toLocaleString()} data
                            </Text>
                        )}
                    </MotiView>
                </LinearGradient>

                <View style={styles.mainContent}>
                    <LocationSelector
                        locations={locations}
                        selectedLocation={selectedLocation}
                        onLocationChange={handleLocationChange}
                    />

                    {loading && currentPage === 1 ? (
                        <MotiView
                            style={styles.loaderContainer}
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 500 }}
                        >
                            <ActivityIndicator size="large" color="#3b82f6" />
                            <Text size="md" style={styles.loadingText}>
                                Memuat data...
                            </Text>
                        </MotiView>
                    ) : !sensorData || sensorData.length === 0 ? (
                        <MotiView
                            style={styles.loaderContainer}
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 500 }}
                        >
                            <Text size="md" style={styles.loadingText}>
                                Tidak ada data sensor tersedia
                            </Text>
                        </MotiView>
                    ) : (
                        <View style={styles.contentContainer}>
                            <StatsSummaryCards sensorData={sensorData} />
                            <SensorTrendsChart sensorData={sensorData} />
                            <SensorDataTable sensorData={sensorData} />

                            <View style={styles.footer}>
                                <Text size="xs" style={styles.footerText}>
                                    Data terakhir diperbarui: {sensorData && sensorData[0]?.timestamp ?
                                        new Date(sensorData[0].timestamp).toLocaleString('id-ID') : '-'}
                                </Text>
                                <Text size="xs" style={styles.footerText}>
                                    Menampilkan {sensorData.length} dari {totalRecords.toLocaleString()} data
                                </Text>
                                {currentPage < totalPages && !loading && (
                                    <TouchableOpacity
                                        style={styles.loadMoreButton}
                                        onPress={loadMoreData}
                                    >
                                        <Text size="xs" style={styles.loadMoreButtonText}>
                                            Muat lebih banyak data ({currentPage}/{totalPages})
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {loading && currentPage > 1 && (
                                    <ActivityIndicator size="small" color="#3b82f6" style={styles.loadMoreIndicator} />
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 32,
    },
    gradientBackground: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        marginBottom: 8,
        zIndex: 1,
    },
    mainContent: {
        paddingHorizontal: 16,
        zIndex: 5,
    },
    loaderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 300,
        backgroundColor: 'white',
        borderRadius: 16,
        marginVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    titleContainer: {
        marginBottom: 8,
        alignItems: 'center',
    },
    title: {
        color: '#334155',
        fontSize: 26,
        textAlign: 'center',
    },
    dataCount: {
        color: '#64748b',
        marginTop: 4,
        textAlign: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
    },
    contentContainer: {
        paddingBottom: 16,
    },
    footer: {
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 16,
        alignItems: 'center',
    },
    footerText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 4,
    },
    loadMoreButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#e2e8f0',
        borderRadius: 20,
    },
    loadMoreButtonText: {
        color: '#3b82f6',
        fontWeight: '500',
    },
    loadMoreIndicator: {
        marginTop: 12,
    }
}); 