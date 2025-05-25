import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Components
import { Text } from '@/components/ui/text';
import StatisticsHeader from '@/components/statistics/StatisticsHeader';
import LocationSelector from '@/components/statistics/LocationSelector';
import StatsSummaryCards from '@/components/statistics/StatsSummaryCards';
import WaterQualityGauge from '@/components/statistics/WaterQualityGauge';
import SensorTrendsChart from '@/components/statistics/SensorTrendsChart';
import SensorDataTable from '@/components/statistics/SensorDataTable';

// Config
import { port as API_URL } from '@/constants/https';

// Types - define inline to avoid import issues
interface Location {
    id_lokasi: string;
    nama_lokasi: string;
    latitude: number;
    longitude: number;
    created_at: string;
}

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

export default function StatisticsScreen() {
    const [loading, setLoading] = useState<boolean>(true);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [sensorData, setSensorData] = useState<SensorData[] | null>(null);
    const [timeRange, setTimeRange] = useState<string>('30d'); // Default to 30 days

    // Fetch locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await fetch(`${API_URL}data_lokasi`);
                const data = await response.json();
                setLocations(data);
                if (data.length > 0) {
                    setSelectedLocation(data[0].id_lokasi);
                }
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };

        fetchLocations();
    }, []);

    // Fetch sensor data when selected location changes
    useEffect(() => {
        if (!selectedLocation) return;

        const fetchSensorData = async () => {
            setLoading(true);
            try {
                console.log(`Fetching sensor data from: ${API_URL}data_combined/paginated/${selectedLocation}?range=${timeRange}`);
                // Get combined data with pagination for the selected location
                const response = await fetch(
                    `${API_URL}data_combined/paginated/${selectedLocation}?range=${timeRange}`
                );
                const responseData = await response.json();

                // Handle different response formats
                // If the API returns an object with a data property, use that
                // Otherwise, if it's an array, use it directly
                const sensorDataArray = Array.isArray(responseData)
                    ? responseData
                    : responseData.data || [];

                console.log("Sensor data received:", sensorDataArray ? `${sensorDataArray.length} items` : 'No data');

                // Set sensor data
                setSensorData(sensorDataArray);
            } catch (error) {
                console.error('Error fetching sensor data:', error);
                setSensorData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSensorData();
    }, [selectedLocation, timeRange]);

    const handleLocationChange = (locationId: string) => {
        setSelectedLocation(locationId);
    };

    const handleTimeRangeChange = (range: string) => {
        setTimeRange(range);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />
            <StatisticsHeader
                timeRange={timeRange}
                onTimeRangeChange={handleTimeRangeChange}
            />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.titleContainer}>
                    <Text size="2xl" bold>
                        Statistik Sensor Air
                    </Text>
                </View>

                <LocationSelector
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationChange={handleLocationChange}
                />

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                        <Text size="md" style={styles.loadingText}>
                            Memuat data...
                        </Text>
                    </View>
                ) : !sensorData || sensorData.length === 0 ? (
                    <View style={styles.loaderContainer}>
                        <Text size="md" style={styles.loadingText}>
                            Tidak ada data sensor tersedia
                        </Text>
                    </View>
                ) : (
                    <>
                        <WaterQualityGauge sensorData={sensorData} />
                        <StatsSummaryCards sensorData={sensorData} />
                        <SensorTrendsChart sensorData={sensorData} />
                        <SensorDataTable sensorData={sensorData} />
                    </>
                )}
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
        padding: 16,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 300,
    },
    titleContainer: {
        marginBottom: 16,
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
    },
}); 