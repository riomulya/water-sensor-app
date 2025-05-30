import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';
import { MotiView } from 'moti';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

// Local components
import { Text } from '@/components/ui/text';
import {
    Select, SelectBackdrop, SelectContent, SelectDragIndicator,
    SelectDragIndicatorWrapper, SelectItem, SelectPortal,
    SelectTrigger, SelectInput
} from '@/components/ui/select';

// Types
type SensorType = 'accel_x' | 'accel_y' | 'accel_z' | 'turbidity' | 'ph' | 'temperature' | 'speed';

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

interface SensorTrendsChartProps {
    sensorData: SensorData[] | null;
}

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64; // Adjusted to prevent overflow

const SensorTrendsChart: React.FC<SensorTrendsChartProps> = ({ sensorData }) => {
    const [selectedSensor, setSelectedSensor] = useState<SensorType>('turbidity');
    const chartOpacity = useSharedValue(0);
    const chartTranslateY = useSharedValue(20);

    const animatedChartStyle = useAnimatedStyle(() => {
        return {
            opacity: chartOpacity.value,
            transform: [{ translateY: chartTranslateY.value }]
        };
    });

    // Animate chart when sensor type changes
    const handleSensorChange = (value: string) => {
        const updateSelectedSensor = (val: string) => {
            setSelectedSensor(val as SensorType);
        };

        chartOpacity.value = withTiming(0, { duration: 300 });
        chartTranslateY.value = withTiming(20, { duration: 300 }, () => {
            // Use runOnJS to call setState from the UI thread
            runOnJS(updateSelectedSensor)(value);

            setTimeout(() => {
                chartOpacity.value = withTiming(1, { duration: 500 });
                chartTranslateY.value = withTiming(0, { duration: 500 });
            }, 100);
        });
    };

    const chartData = useMemo(() => {
        if (!sensorData || !Array.isArray(sensorData) || sensorData.length === 0) {
            return [];
        }

        try {
            // Reverse data so it's in chronological order
            const chronologicalData = [...sensorData].reverse();

            // Create chart data points
            return chronologicalData
                .filter(data => data && typeof data === 'object')
                .map((data, index) => {
                    const value = data[selectedSensor];
                    if (typeof value !== 'number' || isNaN(value)) {
                        return null;
                    }
                    return {
                        value,
                        dataPointText: value.toFixed(1),
                        label: index % 3 === 0 ?
                            (data.timestamp ? moment(data.timestamp).format('DD/MM HH:mm') : '') : '',
                        labelComponent: () => null,
                        labelTextStyle: { fontSize: 8, color: '#64748b', marginTop: 4 }
                    };
                })
                .filter(item => item !== null);
        } catch (error) {
            console.error('Error creating chart data:', error);
            return [];
        }
    }, [sensorData, selectedSensor]);

    // Calculate statistics for the selected sensor
    const sensorStats = useMemo(() => {
        if (!sensorData || !Array.isArray(sensorData) || sensorData.length === 0) {
            return { min: 0, max: 0, avg: 0, current: 0, unit: '' };
        }

        try {
            // Filter out invalid values first
            const values = sensorData
                .filter(d => d && typeof d === 'object')
                .map(d => {
                    const value = d[selectedSensor];
                    return typeof value === 'number' && !isNaN(value) ? value : null;
                })
                .filter(v => v !== null) as number[];

            if (values.length === 0) {
                return { min: 0, max: 0, avg: 0, current: 0, unit: SENSOR_UNITS[selectedSensor] || '' };
            }

            const min = Math.min(...values);
            const max = Math.max(...values);
            const sum = values.reduce((acc, val) => acc + val, 0);
            const avg = sum / values.length;
            const current = values[0];
            const unit = SENSOR_UNITS[selectedSensor];

            return { min, max, avg, current, unit };
        } catch (error) {
            console.error('Error calculating sensor stats:', error);
            return { min: 0, max: 0, avg: 0, current: 0, unit: SENSOR_UNITS[selectedSensor] || '' };
        }
    }, [sensorData, selectedSensor]);

    // Get chart color based on sensor type
    const getChartColor = () => {
        switch (selectedSensor) {
            case 'turbidity':
                return '#3b82f6'; // blue
            case 'ph':
                return '#8b5cf6'; // purple
            case 'temperature':
                return '#ef4444'; // red
            case 'speed':
                return '#10b981'; // green
            case 'accel_x':
            case 'accel_y':
            case 'accel_z':
                return '#f59e0b'; // amber
            default:
                return '#3b82f6'; // blue
        }
    };

    // List of available sensors to display
    const sensorOptions = [
        { label: SENSOR_LABELS.turbidity, value: 'turbidity' },
        { label: SENSOR_LABELS.ph, value: 'ph' },
        { label: SENSOR_LABELS.temperature, value: 'temperature' },
        { label: SENSOR_LABELS.speed, value: 'speed' },
        { label: SENSOR_LABELS.accel_x, value: 'accel_x' },
        { label: SENSOR_LABELS.accel_y, value: 'accel_y' },
        { label: SENSOR_LABELS.accel_z, value: 'accel_z' }
    ];

    // Initialize animations when component mounts
    React.useEffect(() => {
        chartOpacity.value = withTiming(1, { duration: 800 });
        chartTranslateY.value = withTiming(0, { duration: 800 });
    }, []);

    if (!sensorData || sensorData.length === 0) {
        return (
            <MotiView
                style={styles.containerEmpty}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500 }}
            >
                <View style={styles.headerRow}>
                    <Feather name="trending-up" size={24} color="#3b82f6" />
                    <Text size="lg" bold style={styles.headerText}>
                        Tren Data Sensor
                    </Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada data tersedia untuk ditampilkan
                    </Text>
                </View>
            </MotiView>
        );
    }

    return (
        <MotiView
            style={styles.container}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 300 }}
        >
            <View style={styles.card}>
                <View style={styles.content}>
                    <View style={styles.headerContainer}>
                        <View style={styles.headerRow}>
                            <Feather name="trending-up" size={24} color="#3b82f6" />
                            <Text size="lg" bold style={styles.headerText}>
                                Tren Data Sensor
                            </Text>
                        </View>

                        <View style={styles.selectorContainer}>
                            <Select
                                selectedValue={selectedSensor}
                                onValueChange={handleSensorChange}
                            >
                                <SelectTrigger variant="outline" size="sm" style={styles.selectTrigger}>
                                    <SelectInput placeholder="Pilih sensor" style={styles.selectInput} />
                                </SelectTrigger>
                                <SelectPortal>
                                    <SelectBackdrop />
                                    <SelectContent style={styles.selectContent}>
                                        <SelectDragIndicatorWrapper>
                                            <SelectDragIndicator />
                                        </SelectDragIndicatorWrapper>
                                        {sensorOptions.map(option => (
                                            <SelectItem
                                                key={option.value}
                                                label={option.label}
                                                value={option.value}
                                            />
                                        ))}
                                    </SelectContent>
                                </SelectPortal>
                            </Select>
                        </View>
                    </View>

                    <View style={styles.titleContainer}>
                        <Text size="md" bold style={styles.title}>
                            {SENSOR_LABELS[selectedSensor]}
                            {sensorStats.unit ? ` (${sensorStats.unit})` : ''}
                        </Text>
                    </View>

                    <Animated.View style={[styles.chartContainer, animatedChartStyle]}>
                        {chartData.length > 0 ? (
                            <LineChart
                                data={chartData}
                                height={180}
                                width={CHART_WIDTH}
                                noOfSections={5}
                                areaChart
                                yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                                color={getChartColor()}
                                startFillColor={getChartColor()}
                                endFillColor={`${getChartColor()}00`}
                                startOpacity={0.8}
                                endOpacity={0.1}
                                spacing={chartData.length > 20 ? 8 : 16}
                                thickness={2}
                                hideDataPoints={chartData.length > 15}
                                hideRules
                                adjustToWidth
                                curved
                            />
                        ) : (
                            <View style={styles.noDataContainer}>
                                <Text size="sm" style={styles.noDataText}>
                                    Tidak cukup data untuk membuat grafik
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text size="xs" style={styles.statLabel}>Saat ini:</Text>
                            <Text size="sm" bold style={styles.statValue}>
                                {typeof sensorStats.current === 'number' ? sensorStats.current.toFixed(2) : 'N/A'}
                                {sensorStats.unit ? ` ${sensorStats.unit}` : ''}
                            </Text>
                        </View>

                        <View style={styles.statItem}>
                            <Text size="xs" style={styles.statLabel}>Rata-rata:</Text>
                            <Text size="sm" bold style={styles.statValue}>
                                {typeof sensorStats.avg === 'number' ? sensorStats.avg.toFixed(2) : 'N/A'}
                                {sensorStats.unit ? ` ${sensorStats.unit}` : ''}
                            </Text>
                        </View>

                        <View style={styles.statItem}>
                            <Text size="xs" style={styles.statLabel}>Min:</Text>
                            <Text size="sm" bold style={styles.statValue}>
                                {typeof sensorStats.min === 'number' ? sensorStats.min.toFixed(2) : 'N/A'}
                                {sensorStats.unit ? ` ${sensorStats.unit}` : ''}
                            </Text>
                        </View>

                        <View style={styles.statItem}>
                            <Text size="xs" style={styles.statLabel}>Max:</Text>
                            <Text size="sm" bold style={styles.statValue}>
                                {typeof sensorStats.max === 'number' ? sensorStats.max.toFixed(2) : 'N/A'}
                                {sensorStats.unit ? ` ${sensorStats.unit}` : ''}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
        width: '100%',
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
    selectorContainer: {
        zIndex: 50,
        minWidth: 120,
    },
    selectTrigger: {
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    selectInput: {
        fontSize: 13,
    },
    selectContent: {
        zIndex: 1000,
    },
    titleContainer: {
        marginBottom: 16,
    },
    title: {
        color: '#334155',
    },
    chartContainer: {
        alignItems: 'center',
        marginBottom: 16,
        paddingRight: 8,
    },
    noDataContainer: {
        height: 180,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
    },
    noDataText: {
        color: '#64748b',
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
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        width: '48%',
        marginBottom: 8,
    },
    statLabel: {
        color: '#64748b',
        marginBottom: 2,
    },
    statValue: {
        color: '#334155',
    },
});

export default SensorTrendsChart; 