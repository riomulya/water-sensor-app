import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';
import { MotiView } from 'moti';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Local components
import { Text } from '@/components/ui/text';

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

interface StatsSummaryCardsProps {
    sensorData: SensorData[] | null;
}

const { width } = Dimensions.get('window');
// Increase card width to 46% of screen width
const CARD_WIDTH = width * 0.46;

// Group sensors by type for better organization
const SENSOR_GROUPS = {
    water: ['turbidity', 'ph', 'temperature'],
    motion: ['speed', 'accel_x', 'accel_y', 'accel_z']
};

const StatsSummaryCards: React.FC<StatsSummaryCardsProps> = ({ sensorData }) => {
    const sensorStats = useMemo(() => {
        if (!sensorData || sensorData.length === 0) {
            return [];
        }

        try {
            // Calculate statistics for each sensor type
            const stats = [
                {
                    name: 'turbidity',
                    label: SENSOR_LABELS.turbidity,
                    unit: SENSOR_UNITS.turbidity,
                    icon: "water-outline",
                    color: '#3b82f6',
                    bgColor: 'rgba(59, 130, 246, 0.1)',
                    group: 'water'
                },
                {
                    name: 'ph',
                    label: SENSOR_LABELS.ph,
                    unit: SENSOR_UNITS.ph,
                    icon: "flask-outline",
                    color: '#8b5cf6',
                    bgColor: 'rgba(139, 92, 246, 0.1)',
                    group: 'water'
                },
                {
                    name: 'temperature',
                    label: SENSOR_LABELS.temperature,
                    unit: SENSOR_UNITS.temperature,
                    icon: "thermometer-outline",
                    color: '#ef4444',
                    bgColor: 'rgba(239, 68, 68, 0.1)',
                    group: 'water'
                },
                {
                    name: 'speed',
                    label: SENSOR_LABELS.speed,
                    unit: SENSOR_UNITS.speed,
                    icon: "speedometer-outline",
                    color: '#10b981',
                    bgColor: 'rgba(16, 185, 129, 0.1)',
                    group: 'water'
                },
                {
                    name: 'accel_x',
                    label: SENSOR_LABELS.accel_x,
                    unit: SENSOR_UNITS.accel_x,
                    icon: "move-outline",
                    color: '#f59e0b',
                    bgColor: 'rgba(245, 158, 11, 0.1)',
                    group: 'motion'
                },
                {
                    name: 'accel_y',
                    label: SENSOR_LABELS.accel_y,
                    unit: SENSOR_UNITS.accel_y,
                    icon: "move-outline",
                    color: '#d97706',
                    bgColor: 'rgba(217, 119, 6, 0.1)',
                    group: 'motion'
                },
                {
                    name: 'accel_z',
                    label: SENSOR_LABELS.accel_z,
                    unit: SENSOR_UNITS.accel_z,
                    icon: "move-outline",
                    color: '#b45309',
                    bgColor: 'rgba(180, 83, 9, 0.1)',
                    group: 'motion'
                },
            ].map(sensor => {
                try {
                    // Get the values for this sensor type
                    const values = sensorData
                        .map(d => d[sensor.name as keyof SensorData] as number)
                        .filter(value => typeof value === 'number' && !isNaN(value));

                    if (values.length === 0) {
                        return {
                            ...sensor,
                            current: 0,
                            min: 0,
                            max: 0,
                            avg: 0
                        };
                    }

                    const current = values[0] || 0;
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const sum = values.reduce((a, b) => a + b, 0);
                    const avg = sum / values.length;

                    return {
                        ...sensor,
                        current,
                        min,
                        max,
                        avg
                    };
                } catch (error) {
                    console.error(`Error calculating stats for ${sensor.name}:`, error);
                    return {
                        ...sensor,
                        current: 0,
                        min: 0,
                        max: 0,
                        avg: 0
                    };
                }
            });

            return stats;
        } catch (error) {
            console.error('Error calculating sensor statistics:', error);
            return [];
        }
    }, [sensorData]);

    if (!sensorData || sensorData.length === 0) {
        return (
            <MotiView
                style={styles.containerEmpty}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 200 }}
            >
                <Text size="md" bold style={styles.title}>
                    Ringkasan Statistik
                </Text>
                <View style={styles.emptyBox}>
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada data tersedia
                    </Text>
                </View>
            </MotiView>
        );
    }

    // Group water sensors and motion sensors
    const waterSensors = sensorStats.filter(sensor => SENSOR_GROUPS.water.includes(sensor.name));
    const motionSensors = sensorStats.filter(sensor => SENSOR_GROUPS.motion.includes(sensor.name));

    return (
        <MotiView
            style={styles.container}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 400 }}
        >
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Feather name="bar-chart-2" size={24} color="#3b82f6" />
                    <Text size="lg" bold style={styles.headerText}>
                        Ringkasan Statistik
                    </Text>
                </View>

                {/* Water parameters section */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="water" size={18} color="#3b82f6" />
                    <Text size="sm" style={styles.sectionTitle}>Parameter Air</Text>
                </View>

                <View style={styles.gridContainer}>
                    {waterSensors.map((item, index) => renderSensorCard(item, index))}
                </View>

                {/* Motion parameters section */}
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                    <Ionicons name="analytics-outline" size={18} color="#f59e0b" />
                    <Text size="sm" style={[styles.sectionTitle, { color: '#f59e0b' }]}>Parameter Gerak</Text>
                </View>

                <View style={styles.gridContainer}>
                    <View style={styles.motionContainer}>
                        {motionSensors.map((item, index) => renderSensorCard(item, index + waterSensors.length))}
                    </View>
                </View>
            </View>
        </MotiView>
    );

    function renderSensorCard(item: any, index: number) {
        return (
            <Animated.View
                key={item.name}
                style={[
                    styles.statCard,
                ]}
                entering={FadeInDown.delay(300 + (index * 80)).duration(500)}
            >
                <View style={[styles.cardHeader, { backgroundColor: item.bgColor }]}>
                    <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                        <Ionicons name={item.icon as any} size={22} color="white" />
                    </View>
                    <Text size="sm" bold style={styles.cardTitle}>
                        {item.label}
                    </Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.currentValueContainer}>
                        <Text size="xl" bold style={[styles.currentValue, { color: item.color }]}>
                            {typeof item.current === 'number' ? item.current.toFixed(2) : 'N/A'}
                        </Text>
                        <Text size="xs" style={styles.unitText}>
                            {item.unit}
                        </Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statsItem}>
                            <Text size="xs" style={styles.statLabel}>AVG</Text>
                            <Text size="sm" bold style={styles.statValue}>
                                {typeof item.avg === 'number' ? item.avg.toFixed(1) : 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.statsItem}>
                            <Text size="xs" style={styles.statLabel}>Min</Text>
                            <Text size="sm" bold style={styles.statValue}>
                                {typeof item.min === 'number' ? item.min.toFixed(1) : 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.statsItem}>
                            <Text size="xs" style={styles.statLabel}>Max</Text>
                            <Text size="sm" bold style={styles.statValue}>
                                {typeof item.max === 'number' ? item.max.toFixed(1) : 'N/A'}
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    }
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
        width: '100%',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    containerEmpty: {
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 16,
        marginVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    headerText: {
        marginLeft: 10,
        color: '#334155',
        fontSize: 18,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    sectionTitle: {
        marginLeft: 8,
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
    title: {
        marginBottom: 16,
        color: '#334155',
        fontWeight: '600',
    },
    emptyBox: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyText: {
        color: '#64748b',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
    },
    motionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        gap: 16,
    },
    statCard: {
        width: CARD_WIDTH,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        backgroundColor: 'white',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        color: '#334155',
        fontSize: 14,
        fontWeight: '600',
        flexShrink: 1,
    },
    cardBody: {
        padding: 16,
    },
    currentValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 14,
        justifyContent: 'center',
    },
    currentValue: {
        fontSize: 28,
        marginRight: 6,
        lineHeight: 34,
        textAlign: 'center',
    },
    unitText: {
        color: '#64748b',
        fontSize: 12,
        marginBottom: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        gap: 8,
    },
    statsItem: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 4,
    },
    statLabel: {
        color: '#64748b',
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        color: '#334155',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default StatsSummaryCards; 