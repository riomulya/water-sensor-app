import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';

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
const CHART_WIDTH = width - 40;

const SensorTrendsChart: React.FC<SensorTrendsChartProps> = ({ sensorData }) => {
    const [selectedSensor, setSelectedSensor] = useState<SensorType>('turbidity');

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

    if (!sensorData || sensorData.length === 0) {
        return (
            <View style={styles.containerEmpty}>
                <View style={styles.headerRow}>
                    <Feather name="trending-up" size={24} color="#64748b" />
                    <Text size="lg" bold style={styles.headerText}>
                        Tren Data Sensor
                    </Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada data tersedia untuk ditampilkan
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <View style={styles.headerRow}>
                        <Feather name="trending-up" size={24} color="#64748b" />
                        <Text size="lg" bold style={styles.headerText}>
                            Tren Data Sensor
                        </Text>
                    </View>

                    <Select
                        selectedValue={selectedSensor}
                        onValueChange={(value) => setSelectedSensor(value as SensorType)}
                        className="w-[150px]"
                    >
                        <SelectTrigger variant="outline" size="sm">
                            <SelectInput placeholder="Pilih sensor" />
                        </SelectTrigger>
                        <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent>
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

                <View style={styles.titleContainer}>
                    <Text size="md" bold style={styles.title}>
                        {SENSOR_LABELS[selectedSensor]}
                        {sensorStats.unit ? ` (${sensorStats.unit})` : ''}
                    </Text>
                </View>

                <View style={styles.chartContainer}>
                    {chartData.length > 0 && (
                        <LineChart
                            data={chartData}
                            height={180}
                            width={CHART_WIDTH}
                            noOfSections={5}
                            areaChart
                            yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 8 }}
                            color={getChartColor()}
                            startFillColor={getChartColor()}
                            endFillColor={'transparent'}
                            startOpacity={0.6}
                            endOpacity={0.1}
                            spacing={CHART_WIDTH / (chartData.length > 1 ? chartData.length - 1 : 2)}
                            thickness={2}
                            hideRules
                            hideYAxisText={false}
                            yAxisColor="#e2e8f0"
                            xAxisColor="#e2e8f0"
                            dataPointsHeight={6}
                            dataPointsWidth={6}
                            dataPointsColor={getChartColor()}
                            curved
                        />
                    )}
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text size="xs" style={styles.statLabel}>Terkini</Text>
                        <Text size="sm" bold style={styles.statValue}>
                            {typeof sensorStats.current === 'number' ? sensorStats.current.toFixed(2) : '0.00'} {sensorStats.unit}
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text size="xs" style={styles.statLabel}>Minimum</Text>
                        <Text size="sm" bold style={styles.statValue}>
                            {typeof sensorStats.min === 'number' ? sensorStats.min.toFixed(2) : '0.00'} {sensorStats.unit}
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text size="xs" style={styles.statLabel}>Rata-rata</Text>
                        <Text size="sm" bold style={styles.statValue}>
                            {typeof sensorStats.avg === 'number' ? sensorStats.avg.toFixed(2) : '0.00'} {sensorStats.unit}
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text size="xs" style={styles.statLabel}>Maksimum</Text>
                        <Text size="sm" bold style={styles.statValue}>
                            {typeof sensorStats.max === 'number' ? sensorStats.max.toFixed(2) : '0.00'} {sensorStats.unit}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 24,
    },
    containerEmpty: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    content: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerText: {
        marginLeft: 8,
        color: '#334155',
    },
    titleContainer: {
        marginBottom: 12,
    },
    title: {
        color: '#334155',
    },
    emptyContainer: {
        backgroundColor: '#f1f5f9',
        padding: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    emptyText: {
        color: '#64748b',
    },
    chartContainer: {
        height: 200,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 6,
        marginTop: 8,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        color: '#64748b',
    },
    statValue: {
        color: '#1e293b',
    },
});

export default SensorTrendsChart; 