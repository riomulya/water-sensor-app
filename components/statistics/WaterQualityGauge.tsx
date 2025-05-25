import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WATER_QUALITY_THRESHOLDS } from '@/constants/api';

// Local components
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

// Direct import of icons instead of using Icon component
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import the existing Gauge component
import Gauge from '../Gauge';

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

interface WaterQualityGaugeProps {
    sensorData: SensorData[] | null;
}

const { width } = Dimensions.get('window');
const GAUGE_SIZE = width * 0.55;

const WaterQualityGauge: React.FC<WaterQualityGaugeProps> = ({ sensorData }) => {
    // Early return with placeholder if no data available
    if (!sensorData || !Array.isArray(sensorData) || sensorData.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <MaterialCommunityIcons name="waves" size={24} color="#64748b" />
                    <Text size="lg" bold style={styles.headerText}>
                        Kualitas Air
                    </Text>
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.gaugeContainer}>
                        <Gauge
                            value={0}
                            size={GAUGE_SIZE}
                            thickness={15}
                            color="#94a3b8"
                            endAngle={330}
                        />
                        <View style={styles.gaugeContent}>
                            <Text size="4xl" bold style={{ color: "#94a3b8" }}>
                                0
                            </Text>
                            <Text size="xs" style={styles.scoreLabel}>
                                dari 100
                            </Text>
                            <Text size="md" bold style={[styles.qualityLabel, { color: "#94a3b8", marginTop: 4 }]}>
                                Tidak Ada Data
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    const waterQuality = useMemo(() => {
        try {
            // Get the latest readings
            const latestData = sensorData[0];

            // Validate that required properties exist
            if (!latestData || typeof latestData.turbidity !== 'number' || typeof latestData.ph !== 'number') {
                return { score: 0, label: 'Data Tidak Valid', color: '#94a3b8' };
            }

            // Calculate quality scores for each parameter

            // Turbidity score (0-100)
            let turbidityScore = 100;
            const turbidity = latestData.turbidity;

            if (turbidity >= WATER_QUALITY_THRESHOLDS.turbidity.poor) {
                turbidityScore = 20; // Very poor
            } else if (turbidity >= WATER_QUALITY_THRESHOLDS.turbidity.fair) {
                turbidityScore = 40; // Poor
            } else if (turbidity >= WATER_QUALITY_THRESHOLDS.turbidity.good) {
                turbidityScore = 60; // Fair
            } else if (turbidity >= WATER_QUALITY_THRESHOLDS.turbidity.excellent) {
                turbidityScore = 80; // Good
            }

            // pH score (0-100)
            let phScore = 20; // Default to very poor
            const ph = latestData.ph;
            const phThresholds = WATER_QUALITY_THRESHOLDS.ph;

            if (ph >= phThresholds.excellent.min && ph <= phThresholds.excellent.max) {
                phScore = 100; // Excellent
            } else if (ph >= phThresholds.good.min && ph <= phThresholds.good.max) {
                phScore = 80; // Good
            } else if (ph >= phThresholds.fair.min && ph <= phThresholds.fair.max) {
                phScore = 60; // Fair
            } else if (ph >= phThresholds.poor.min && ph <= phThresholds.poor.max) {
                phScore = 40; // Poor
            }

            // Calculate overall water quality score
            const overallScore = Math.round((turbidityScore + phScore) / 2);

            // Determine quality label and color
            let label = 'Sangat Buruk';
            let color = '#ef4444'; // red

            if (overallScore >= 90) {
                label = 'Sangat Baik';
                color = '#10b981'; // green
            } else if (overallScore >= 70) {
                label = 'Baik';
                color = '#22c55e'; // green-500
            } else if (overallScore >= 50) {
                label = 'Cukup';
                color = '#eab308'; // yellow
            } else if (overallScore >= 30) {
                label = 'Buruk';
                color = '#f97316'; // orange
            }

            return {
                score: overallScore,
                label,
                color
            };
        } catch (error) {
            console.error('Error calculating water quality:', error);
            return { score: 0, label: 'Error', color: '#94a3b8' };
        }
    }, [sensorData]);

    // Safeguard against invalid data
    const latestData = sensorData[0] || {} as SensorData;
    const turbidity = typeof latestData?.turbidity === 'number' ? latestData.turbidity.toFixed(2) : 'N/A';
    const ph = typeof latestData?.ph === 'number' ? latestData.ph.toFixed(2) : 'N/A';
    const temperature = typeof latestData?.temperature === 'number' ? latestData.temperature.toFixed(2) : 'N/A';

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <MaterialCommunityIcons name="waves" size={24} color="#64748b" />
                <Text size="lg" bold style={styles.headerText}>
                    Kualitas Air
                </Text>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.gaugeContainer}>
                    <Gauge
                        value={waterQuality.score}
                        size={GAUGE_SIZE}
                        thickness={15}
                        color={waterQuality.color}
                        endAngle={330}
                    />
                    <View style={styles.gaugeContent}>
                        <Text size="4xl" bold style={{ color: waterQuality.color }}>
                            {waterQuality.score}
                        </Text>
                        <Text size="xs" style={styles.scoreLabel}>
                            dari 100
                        </Text>
                        <Text size="md" bold style={[styles.qualityLabel, { color: waterQuality.color, marginTop: 4 }]}>
                            {waterQuality.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.factorsCard}>
                    <Text size="sm" bold style={styles.factorsTitle}>
                        Faktor Kualitas:
                    </Text>

                    <View style={styles.factorRow}>
                        <Text size="xs" style={styles.factorLabel}>Kekeruhan:</Text>
                        <Text size="xs" bold style={styles.factorValue}>
                            {turbidity} NTU
                        </Text>
                    </View>

                    <View style={styles.factorRow}>
                        <Text size="xs" style={styles.factorLabel}>pH:</Text>
                        <Text size="xs" bold style={styles.factorValue}>
                            {ph}
                        </Text>
                    </View>

                    <View style={styles.factorRow}>
                        <Text size="xs" style={styles.factorLabel}>Suhu:</Text>
                        <Text size="xs" bold style={styles.factorValue}>
                            {temperature} °C
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        width: '100%',
    },
    headerText: {
        marginLeft: 8,
        color: '#334155',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gaugeContainer: {
        position: 'relative',
        width: GAUGE_SIZE,
        height: GAUGE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gaugeContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreLabel: {
        color: '#64748b',
    },
    qualityLabel: {
        fontWeight: 'bold',
    },
    factorsCard: {
        width: '100%',
        marginTop: 16,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    factorsTitle: {
        marginBottom: 8,
        color: '#334155',
    },
    factorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    factorLabel: {
        color: '#64748b',
    },
    factorValue: {
        color: '#1e293b',
    },
});

export default WaterQualityGauge; 