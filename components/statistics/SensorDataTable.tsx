import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';
import moment from 'moment';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { MotiView } from 'moti';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

// Local components
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

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

interface SensorDataTableProps {
    sensorData: SensorData[] | null;
}

const { width } = Dimensions.get('window');

const SensorDataTable: React.FC<SensorDataTableProps> = ({ sensorData }) => {
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const maxPage = sensorData && Array.isArray(sensorData) ? Math.ceil(sensorData.length / pageSize) : 1;

    // Animation values
    const tableOpacity = useSharedValue(1);
    const tableTranslateY = useSharedValue(0);

    const animatedTableStyle = useAnimatedStyle(() => {
        return {
            opacity: tableOpacity.value,
            transform: [{ translateY: tableTranslateY.value }]
        };
    });

    const handlePageChange = (newPage: number) => {
        const updatePage = (p: number) => {
            setPage(p);
            setTimeout(() => {
                tableOpacity.value = withTiming(1, { duration: 300 });
                tableTranslateY.value = withTiming(0, { duration: 300 });
            }, 50);
        };

        // Animate table transition
        tableOpacity.value = withTiming(0.3, { duration: 200 });
        tableTranslateY.value = withTiming(10, { duration: 200 }, () => {
            // Use runOnJS to call setState from the UI thread
            runOnJS(updatePage)(newPage);
        });
    };

    const handleExport = async () => {
        if (!sensorData || !Array.isArray(sensorData) || sensorData.length === 0) return;

        try {
            // Create CSV content
            let csvContent = 'Timestamp,Turbidity,pH,Temperature,Speed,Accel X,Accel Y,Accel Z\n';

            sensorData.forEach(data => {
                if (!data || typeof data !== 'object') return;

                const timestamp = data.timestamp ? moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss') : '';
                const turbidity = typeof data.turbidity === 'number' ? data.turbidity : '';
                const ph = typeof data.ph === 'number' ? data.ph : '';
                const temperature = typeof data.temperature === 'number' ? data.temperature : '';
                const speed = typeof data.speed === 'number' ? data.speed : '';
                const accel_x = typeof data.accel_x === 'number' ? data.accel_x : '';
                const accel_y = typeof data.accel_y === 'number' ? data.accel_y : '';
                const accel_z = typeof data.accel_z === 'number' ? data.accel_z : '';

                csvContent += `${timestamp},${turbidity},${ph},${temperature},${speed},${accel_x},${accel_y},${accel_z}\n`;
            });

            // Create a temporary file
            const fileDate = moment().format('YYYY-MM-DD_HH-mm-ss');
            const filePath = `${FileSystem.documentDirectory}water_sensor_data_${fileDate}.csv`;

            await FileSystem.writeAsStringAsync(filePath, csvContent);

            // Share the file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Ekspor Data Sensor',
                    UTI: 'public.comma-separated-values-text'
                });
            }
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    };

    if (!sensorData || sensorData.length === 0) {
        return (
            <MotiView
                style={styles.containerEmpty}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 500 }}
            >
                <View style={styles.headerRow}>
                    <MaterialIcons name="table-chart" size={24} color="#3b82f6" />
                    <Text size="lg" bold style={styles.headerText}>
                        Data Sensor
                    </Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Feather name="database" size={32} color="#cbd5e1" style={styles.emptyIcon} />
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada data tersedia
                    </Text>
                </View>
            </MotiView>
        );
    }

    // Get paginated data
    const paginatedData = Array.isArray(sensorData)
        ? sensorData.slice((page - 1) * pageSize, page * pageSize)
        : [];

    return (
        <MotiView
            style={styles.container}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 600 }}
        >
            <View style={styles.card}>
                <View style={styles.content}>
                    <View style={styles.headerContainer}>
                        <View style={styles.headerRow}>
                            <MaterialIcons name="table-chart" size={24} color="#3b82f6" />
                            <Text size="lg" bold style={styles.headerText}>
                                Data Sensor
                            </Text>
                        </View>

                        <Button
                            size="sm"
                            onPress={handleExport}
                            variant="outline"
                            style={styles.exportButton}
                        >
                            <Feather name="download" size={16} color="#3b82f6" />
                            <Text size="xs" style={styles.exportButtonText}>
                                Ekspor
                            </Text>
                        </Button>
                    </View>

                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <View style={styles.headerCell30}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                Waktu
                            </Text>
                        </View>
                        <View style={styles.headerCell23}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                {SENSOR_LABELS.turbidity}
                            </Text>
                        </View>
                        <View style={styles.headerCell23}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                {SENSOR_LABELS.ph}
                            </Text>
                        </View>
                        <View style={styles.headerCell24}>
                            <Text size="xs" bold style={styles.headerCellText}>
                                {SENSOR_LABELS.temperature}
                            </Text>
                        </View>
                    </View>

                    {/* Table Rows */}
                    <Animated.View style={[styles.tableContainer, animatedTableStyle]}>
                        {paginatedData.map((item, index) => {
                            if (!item || typeof item !== 'object') {
                                return null;
                            }

                            const timestamp = item.timestamp
                                ? moment(item.timestamp).format('DD/MM HH:mm')
                                : 'N/A';
                            const turbidity = typeof item.turbidity === 'number'
                                ? `${item.turbidity.toFixed(1)} ${SENSOR_UNITS.turbidity}`
                                : 'N/A';
                            const ph = typeof item.ph === 'number'
                                ? item.ph.toFixed(1)
                                : 'N/A';
                            const temperature = typeof item.temperature === 'number'
                                ? `${item.temperature.toFixed(1)} ${SENSOR_UNITS.temperature}`
                                : 'N/A';

                            return (
                                <Animated.View
                                    key={item?.id?.toString() || `row-${index}`}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 0 ? styles.tableRowEven : null
                                    ]}
                                    entering={FadeInDown.delay(100 + index * 30).duration(200)}
                                >
                                    <View style={styles.cell30}>
                                        <Text size="xs" style={styles.cellText}>
                                            {timestamp}
                                        </Text>
                                    </View>
                                    <View style={styles.cell23}>
                                        <Text size="xs" style={styles.cellValue}>
                                            {turbidity}
                                        </Text>
                                    </View>
                                    <View style={styles.cell23}>
                                        <Text size="xs" style={styles.cellValue}>
                                            {ph}
                                        </Text>
                                    </View>
                                    <View style={styles.cell24}>
                                        <Text size="xs" style={styles.cellValue}>
                                            {temperature}
                                        </Text>
                                    </View>
                                </Animated.View>
                            );
                        })}
                    </Animated.View>

                    {/* Pagination */}
                    <MotiView
                        style={styles.paginationContainer}
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 500, delay: 800 }}
                    >
                        <Text size="xs" style={styles.paginationInfo}>
                            Menampilkan {sensorData && Array.isArray(sensorData) && sensorData.length > 0
                                ? `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, sensorData.length)} dari ${sensorData.length}`
                                : '0'} data
                        </Text>

                        <View style={styles.paginationControls}>
                            <TouchableOpacity
                                onPress={() => handlePageChange(1)}
                                disabled={page <= 1}
                                style={[styles.paginationButton, page <= 1 ? styles.paginationButtonDisabled : null]}
                            >
                                <MaterialIcons
                                    name="first-page"
                                    size={18}
                                    color={page <= 1 ? "#cbd5e1" : "#3b82f6"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handlePageChange(Math.max(1, page - 1))}
                                disabled={page <= 1}
                                style={[styles.paginationButton, page <= 1 ? styles.paginationButtonDisabled : null]}
                            >
                                <MaterialIcons
                                    name="chevron-left"
                                    size={20}
                                    color={page <= 1 ? "#cbd5e1" : "#3b82f6"}
                                />
                            </TouchableOpacity>

                            <View style={styles.pageIndicator}>
                                <Text size="xs" style={styles.paginationText}>
                                    {page} / {maxPage}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => handlePageChange(Math.min(maxPage, page + 1))}
                                disabled={page >= maxPage}
                                style={[styles.paginationButton, page >= maxPage ? styles.paginationButtonDisabled : null]}
                            >
                                <MaterialIcons
                                    name="chevron-right"
                                    size={20}
                                    color={page >= maxPage ? "#cbd5e1" : "#3b82f6"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handlePageChange(maxPage)}
                                disabled={page >= maxPage}
                                style={[styles.paginationButton, page >= maxPage ? styles.paginationButtonDisabled : null]}
                            >
                                <MaterialIcons
                                    name="last-page"
                                    size={18}
                                    color={page >= maxPage ? "#cbd5e1" : "#3b82f6"}
                                />
                            </TouchableOpacity>
                        </View>
                    </MotiView>
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
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    exportButtonText: {
        color: '#3b82f6',
        marginLeft: 4,
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
        marginTop: 8,
    },
    emptyIcon: {
        marginBottom: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    headerCell30: {
        flex: 0.3,
    },
    headerCell23: {
        flex: 0.23,
        alignItems: 'center',
    },
    headerCell24: {
        flex: 0.24,
        alignItems: 'center',
    },
    headerCellText: {
        color: '#475569',
        fontSize: 12,
    },
    tableContainer: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableRowEven: {
        backgroundColor: '#f8fafc',
    },
    cell30: {
        flex: 0.3,
    },
    cell23: {
        flex: 0.23,
        alignItems: 'center',
    },
    cell24: {
        flex: 0.24,
        alignItems: 'center',
    },
    cellText: {
        color: '#64748b',
    },
    cellValue: {
        color: '#334155',
        fontWeight: '500',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
    },
    paginationInfo: {
        color: '#64748b',
    },
    paginationControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 4,
    },
    paginationButton: {
        padding: 4,
    },
    paginationButtonDisabled: {
        opacity: 0.5,
    },
    pageIndicator: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: 'white',
        borderRadius: 4,
        marginHorizontal: 4,
        minWidth: 36,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    paginationText: {
        color: '#334155',
        fontWeight: '500',
    },
});

export default SensorDataTable; 