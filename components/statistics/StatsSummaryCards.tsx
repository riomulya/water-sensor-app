import React, { useMemo } from 'react';
import { StyleSheet, View, FlatList, Dimensions } from 'react-native';
import { MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';

// Local components
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

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
const CARD_WIDTH = width * 0.43;

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
                    iconComponent: <FontAwesome5 name="water" size={18} color="#3b82f6" />,
                    color: '#3b82f6'
                },
                {
                    name: 'ph',
                    label: SENSOR_LABELS.ph,
                    unit: SENSOR_UNITS.ph,
                    iconComponent: <MaterialIcons name="science" size={18} color="#8b5cf6" />,
                    color: '#8b5cf6'
                },
                {
                    name: 'temperature',
                    label: SENSOR_LABELS.temperature,
                    unit: SENSOR_UNITS.temperature,
                    iconComponent: <FontAwesome5 name="temperature-high" size={18} color="#ef4444" />,
                    color: '#ef4444'
                },
                {
                    name: 'speed',
                    label: SENSOR_LABELS.speed,
                    unit: SENSOR_UNITS.speed,
                    iconComponent: <MaterialIcons name="speed" size={18} color="#10b981" />,
                    color: '#10b981'
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
            <View style={styles.containerEmpty}>
                <Text size="md" bold style={styles.title}>
                    Ringkasan Statistik
                </Text>
                <View style={styles.emptyBox}>
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada data tersedia
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Feather name="bar-chart-2" size={24} color="#64748b" />
                <Text size="lg" bold style={styles.headerText}>
                    Ringkasan Statistik
                </Text>
            </View>

            <View style={styles.cardsContainer}>
                {sensorStats.map((item) => (
                    <View key={item.name} style={styles.card}>
                        <View style={styles.cardHeader}>
                            {item.iconComponent}
                            <Text size="sm" bold style={styles.cardTitle}>
                                {item.label}
                            </Text>
                        </View>

                        <View style={styles.dividerLine} />

                        <View style={styles.statsContainer}>
                            <View style={styles.statRow}>
                                <Text size="xs" style={styles.statLabel}>Terkini:</Text>
                                <Text size="xs" bold style={styles.statValue}>
                                    {typeof item.current === 'number' ? item.current.toFixed(2) : 'N/A'} {item.unit}
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text size="xs" style={styles.statLabel}>Rata-rata:</Text>
                                <Text size="xs" bold style={styles.statValue}>
                                    {typeof item.avg === 'number' ? item.avg.toFixed(2) : 'N/A'} {item.unit}
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text size="xs" style={styles.statLabel}>Min:</Text>
                                <Text size="xs" bold style={styles.statValue}>
                                    {typeof item.min === 'number' ? item.min.toFixed(2) : 'N/A'} {item.unit}
                                </Text>
                            </View>

                            <View style={styles.statRow}>
                                <Text size="xs" style={styles.statLabel}>Max:</Text>
                                <Text size="xs" bold style={styles.statValue}>
                                    {typeof item.max === 'number' ? item.max.toFixed(2) : 'N/A'} {item.unit}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerText: {
        marginLeft: 8,
        color: '#334155',
    },
    title: {
        marginBottom: 8,
        color: '#334155',
    },
    emptyBox: {
        backgroundColor: '#f1f5f9',
        padding: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    emptyText: {
        color: '#64748b',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        width: CARD_WIDTH,
        marginBottom: 8,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        marginLeft: 8,
        color: '#334155',
    },
    statsContainer: {
        marginTop: 4,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 2,
    },
    statLabel: {
        color: '#64748b',
    },
    statValue: {
        color: '#1e293b',
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 8,
    },
    dividerLine: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 8,
    },
});

export default StatsSummaryCards; 