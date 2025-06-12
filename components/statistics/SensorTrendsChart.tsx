import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';
import { MotiView } from 'moti';

// Local components
import { Text } from '@/components/ui/text';

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

interface DataPoint {
    value: number;
    dataPointText?: string;
    label?: string;
    labelComponent?: () => React.ReactNode;
    labelTextStyle?: object;
    timestamp?: string;
    onPress?: () => void;
    showTooltip?: boolean;
}

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64; // Adjusted to prevent overflow

const SensorTrendsChart: React.FC<SensorTrendsChartProps> = ({ sensorData }) => {
    const [selectedSensor, setSelectedSensor] = useState<SensorType>('turbidity');
    const [modalVisible, setModalVisible] = useState(false);
    const [isChartVisible, setIsChartVisible] = useState(true);

    // Handle sensor type change with simpler animation approach
    const handleSensorChange = (value: SensorType) => {
        try {
            // Hide chart first
            setIsChartVisible(false);

            // Change sensor type after a short delay
            setTimeout(() => {
                setSelectedSensor(value);

                // Show chart again after another short delay
                setTimeout(() => {
                    setIsChartVisible(true);
                }, 100);
            }, 300);

            // Close modal
            setModalVisible(false);
        } catch (error) {
            console.error('Error changing sensor type:', error);
            // Fallback to direct state update without animation
            setSelectedSensor(value);
            setModalVisible(false);
        }
    };

    const chartData = useMemo(() => {
        if (!sensorData || !Array.isArray(sensorData) || sensorData.length === 0) {
            return [];
        }

        try {
            // Make a copy of the data to avoid mutation
            const dataToSort = [...sensorData];

            // Sort data by timestamp (oldest to newest)
            const sortedData = dataToSort.sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });

            // Calculate how often to show labels based on data length
            const labelModulo = sortedData.length > 15 ? 5 : 3;

            // Create chart data points
            return sortedData
                .filter(data => data && typeof data === 'object')
                .map((data, index) => {
                    // Check if the selected sensor property exists and is a valid number
                    if (!data || typeof data !== 'object' || !(selectedSensor in data)) {
                        return null;
                    }

                    const value = data[selectedSensor];

                    // Strict validation for numeric values
                    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
                        return null;
                    }

                    // Format timestamp for display
                    const timestamp = data.timestamp ? moment(data.timestamp).format('DD/MM/YYYY HH:mm:ss') : '';
                    const shortTimestamp = data.timestamp ? moment(data.timestamp).format('HH:mm:ss') : '';

                    // Only show label for every labelModulo data point
                    const showLabel = index % labelModulo === 0;

                    // Create the data point object
                    return {
                        value,
                        dataPointText: value.toFixed(1),
                        label: showLabel ? shortTimestamp : '',
                        labelTextStyle: {
                            fontSize: 9,
                            color: '#64748b',
                            marginTop: 4,
                            width: 50,
                            textAlign: 'center'
                        },
                        timestamp,
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
            // Ensure selected sensor is valid
            if (!selectedSensor || typeof selectedSensor !== 'string') {
                console.warn('Invalid sensor type for stats calculation');
                return { min: 0, max: 0, avg: 0, current: 0, unit: '' };
            }

            // Filter out invalid values first
            const values = sensorData
                .filter(d => d && typeof d === 'object' && selectedSensor in d)
                .map(d => {
                    const value = d[selectedSensor];
                    return value !== null && value !== undefined && typeof value === 'number' && !isNaN(value) ? value : null;
                })
                .filter((v): v is number => v !== null);

            if (values.length === 0) {
                return { min: 0, max: 0, avg: 0, current: 0, unit: SENSOR_UNITS[selectedSensor] || '' };
            }

            const min = Math.min(...values);
            const max = Math.max(...values);
            const sum = values.reduce((acc, val) => acc + val, 0);
            const avg = sum / values.length;
            const current = values[0];
            const unit = SENSOR_UNITS[selectedSensor] || '';

            return {
                min: isFinite(min) ? min : 0,
                max: isFinite(max) ? max : 0,
                avg: isFinite(avg) ? avg : 0,
                current: isFinite(current) ? current : 0,
                unit
            };
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

    // Custom pointer label component for the chart
    const renderPointerLabel = (item: any) => {
        if (!item || !item.timestamp) return null;

        return (
            <View style={styles.pointerLabel}>
                <Text size="xs" bold style={styles.pointerTitle}>
                    {SENSOR_LABELS[selectedSensor]}
                </Text>
                <Text size="sm" bold style={styles.pointerValue}>
                    {item.value.toFixed(2)} {sensorStats.unit}
                </Text>
                <Text size="xs" style={styles.pointerTimestamp}>
                    {item.timestamp}
                </Text>
            </View>
        );
    };

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
                            <TouchableOpacity
                                style={styles.selectorButton}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text size="sm">{SENSOR_LABELS[selectedSensor]}</Text>
                                <Feather name="chevron-down" size={16} color="#64748b" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>

                            <Modal
                                visible={modalVisible}
                                transparent={true}
                                animationType="fade"
                                onRequestClose={() => setModalVisible(false)}
                            >
                                <TouchableOpacity
                                    style={styles.modalOverlay}
                                    activeOpacity={1}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <View style={styles.modalContent}>
                                        {sensorOptions.map((option) => (
                                            <TouchableOpacity
                                                key={option.value}
                                                style={[
                                                    styles.optionItem,
                                                    selectedSensor === option.value && styles.selectedOption
                                                ]}
                                                onPress={() => handleSensorChange(option.value as SensorType)}
                                            >
                                                <Text
                                                    size="sm"
                                                    style={[
                                                        styles.optionText,
                                                        selectedSensor === option.value && styles.selectedOptionText
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                                {selectedSensor === option.value && (
                                                    <Feather name="check" size={16} color="#3b82f6" />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        </View>
                    </View>

                    <View style={styles.titleContainer}>
                        <Text size="md" bold style={styles.title}>
                            {SENSOR_LABELS[selectedSensor]}
                            {sensorStats.unit ? ` (${sensorStats.unit})` : ''}
                        </Text>
                        <Text size="xs" style={styles.subtitle}>
                            Geser horizontal untuk melihat data lainnya. Ketuk titik data untuk detail.
                        </Text>
                    </View>

                    <MotiView
                        style={styles.chartContainer}
                        animate={{
                            opacity: isChartVisible ? 1 : 0,
                            translateY: isChartVisible ? 0 : 20
                        }}
                        transition={{ type: 'timing', duration: 300 }}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={styles.chartTouchable}
                        >
                            {chartData.length > 0 ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{
                                        paddingHorizontal: 10
                                    }}
                                    scrollEventThrottle={16}
                                    decelerationRate="fast"
                                >
                                    <LineChart
                                        data={chartData}
                                        height={180}
                                        width={Math.max(CHART_WIDTH, chartData.length * 20)}
                                        noOfSections={5}
                                        areaChart
                                        yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                                        color={getChartColor()}
                                        startFillColor={getChartColor()}
                                        endFillColor={`${getChartColor()}00`}
                                        startOpacity={0.8}
                                        endOpacity={0.1}
                                        spacing={chartData.length > 15 ? 20 : 30}
                                        thickness={2}
                                        hideDataPoints={false}
                                        dataPointsColor={getChartColor()}
                                        dataPointsRadius={3}
                                        focusEnabled
                                        showDataPointOnFocus
                                        showTextOnFocus
                                        textFontSize={10}
                                        textShiftY={-15}
                                        textShiftX={-10}
                                        textColor="#334155"
                                        hideRules
                                        adjustToWidth={false}
                                        curved
                                        xAxisLabelTextStyle={{ width: 50, textAlign: 'center' }}
                                        xAxisLabelsHeight={25}
                                        pointerConfig={{
                                            pointerStripHeight: 160,
                                            pointerStripColor: 'lightgray',
                                            pointerStripWidth: 2,
                                            pointerColor: getChartColor(),
                                            radius: 6,
                                            pointerLabelWidth: 180,
                                            pointerLabelHeight: 90,
                                            activatePointersOnLongPress: false,
                                            autoAdjustPointerLabelPosition: true,
                                            pointerLabelComponent: renderPointerLabel,
                                            stripOverPointer: true,
                                            shiftPointerLabelX: 0,
                                            shiftPointerLabelY: 0,
                                            hidePointers: false,
                                        }}
                                    />
                                </ScrollView>
                            ) : (
                                <View style={styles.noDataContainer}>
                                    <Text size="sm" style={styles.noDataText}>
                                        Tidak cukup data untuk membuat grafik
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </MotiView>

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
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        backgroundColor: '#f8fafc',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    selectedOption: {
        backgroundColor: '#ebf5ff',
    },
    optionText: {
        color: '#334155',
    },
    selectedOptionText: {
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    titleContainer: {
        marginBottom: 16,
    },
    title: {
        color: '#334155',
    },
    subtitle: {
        color: '#64748b',
        marginTop: 4,
    },
    chartContainer: {
        alignItems: 'center',
        marginBottom: 16,
        paddingRight: 8,
        width: '100%',
        overflow: 'hidden',
    },
    chartTouchable: {
        position: 'relative',
        width: '100%',
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
    pointerLabel: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        width: 170,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    pointerTitle: {
        color: '#334155',
        marginBottom: 4,
    },
    pointerValue: {
        color: '#0f172a',
        fontWeight: 'bold',
        marginBottom: 4,
        fontSize: 16,
    },
    pointerTimestamp: {
        color: '#64748b',
        marginTop: 4,
    },
});

export default SensorTrendsChart; 