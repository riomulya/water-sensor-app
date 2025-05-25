import React, { useState } from 'react';
import { StyleSheet, View, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { SENSOR_LABELS, SENSOR_UNITS } from '@/constants/api';
import moment from 'moment';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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
            <View style={styles.containerEmpty}>
                <View style={styles.headerRow}>
                    <MaterialIcons name="table-chart" size={24} color="#64748b" />
                    <Text size="lg" bold style={styles.headerText}>
                        Data Sensor
                    </Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada data tersedia
                    </Text>
                </View>
            </View>
        );
    }

    // Get paginated data
    const paginatedData = Array.isArray(sensorData)
        ? sensorData.slice((page - 1) * pageSize, page * pageSize)
        : [];

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <View style={styles.headerRow}>
                        <MaterialIcons name="table-chart" size={24} color="#64748b" />
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

                {/* Table Rows - Replace FlatList with direct rendering */}
                <View style={styles.tableContainer}>
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
                            <View key={item?.id?.toString() || `row-${index}`} style={styles.tableRow}>
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
                            </View>
                        );
                    })}
                </View>

                {/* Pagination */}
                <View style={styles.paginationContainer}>
                    <Text size="xs" style={styles.paginationInfo}>
                        Menampilkan {sensorData && Array.isArray(sensorData) && sensorData.length > 0
                            ? `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, sensorData.length)} dari ${sensorData.length}`
                            : '0'} data
                    </Text>

                    <View style={styles.paginationControls}>
                        <TouchableOpacity
                            onPress={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            style={styles.paginationButton}
                        >
                            <MaterialIcons
                                name="chevron-left"
                                size={24}
                                color={page <= 1 ? "#cbd5e1" : "#3b82f6"}
                            />
                        </TouchableOpacity>

                        <Text size="xs" style={styles.paginationText}>
                            {page} / {maxPage}
                        </Text>

                        <TouchableOpacity
                            onPress={() => setPage(Math.min(maxPage, page + 1))}
                            disabled={page >= maxPage}
                            style={styles.paginationButton}
                        >
                            <MaterialIcons
                                name="chevron-right"
                                size={24}
                                color={page >= maxPage ? "#cbd5e1" : "#3b82f6"}
                            />
                        </TouchableOpacity>
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
        borderColor: '#3b82f6',
    },
    exportButtonText: {
        color: '#3b82f6',
        marginLeft: 4,
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
    tableContainer: {
        height: 300,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 8,
    },
    headerCell30: {
        width: '30%',
        paddingHorizontal: 8,
    },
    headerCell23: {
        width: '23%',
        paddingHorizontal: 8,
    },
    headerCell24: {
        width: '24%',
        paddingHorizontal: 8,
    },
    headerCellText: {
        color: '#64748b',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    cell30: {
        width: '30%',
        paddingHorizontal: 8,
    },
    cell23: {
        width: '23%',
        paddingHorizontal: 8,
    },
    cell24: {
        width: '24%',
        paddingHorizontal: 8,
    },
    cellText: {
        color: '#334155',
    },
    cellValue: {
        color: '#1e293b',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    paginationInfo: {
        color: '#64748b',
    },
    paginationControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paginationButton: {
        padding: 4,
    },
    paginationText: {
        marginHorizontal: 8,
        color: '#334155',
    }
});

export default SensorDataTable; 