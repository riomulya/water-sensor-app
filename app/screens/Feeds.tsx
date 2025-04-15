import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, InteractionManager, Modal, Pressable, Alert } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { port } from '@/constants/https';
import { useDebouncedCallback } from 'use-debounce';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

interface DataPoint {
    value: number;
    dataPointText: string;
    label: string;
    labelComponent?: () => JSX.Element;
}

interface ChartData {
    title: string;
    as: string;
    url: string;
    color: string;
    maxValue: number;
    data: DataPoint[];
    page: number;
    loading: boolean;
    totalPage: number;  // Track the total pages for each chart
    hasError: boolean;  // Track if this chart has an error
    errorMessage: string; // Store error message
}

const chartConfigs: ChartData[] = [
    {
        title: 'pH Sensor',
        as: 'nilai_ph',
        url: `${port}data_ph`,
        color: 'tomato',
        maxValue: 14,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1,
        hasError: false,
        errorMessage: ''
    },
    {
        title: 'Acceleration X',
        as: 'nilai_accel_x',
        url: `${port}data_accel_x`,
        color: 'blue',
        maxValue: 10,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1,
        hasError: false,
        errorMessage: ''
    },
    {
        title: 'Acceleration Y',
        as: 'nilai_accel_y',
        url: `${port}data_accel_y`,
        color: 'green',
        maxValue: 10,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1,
        hasError: false,
        errorMessage: ''
    },
    {
        title: 'Acceleration Z',
        as: 'nilai_accel_z',
        url: `${port}data_accel_z`,
        color: 'orange',
        maxValue: 10,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1,
        hasError: false,
        errorMessage: ''
    },
    {
        title: 'Temperature',
        as: 'nilai_temperature',
        url: `${port}data_temperature`,
        color: 'purple',
        maxValue: 100,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1,
        hasError: false,
        errorMessage: ''
    },
    {
        title: 'Turbidity',
        as: 'nilai_turbidity',
        url: `${port}data_turbidity`,
        color: 'brown',
        maxValue: 1000,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1,
        hasError: false,
        errorMessage: ''
    },
];

// Optimize DataPoint creation with memoization
const createDataPoint = (item: any, as: string): DataPoint => {
    try {
        const value = parseFloat(item[as]);
        // Parse date correctly from ISO format (API returns format like "2025-03-24T13:05:00.000Z")
        const date = moment(item.tanggal);

        if (isNaN(value)) {
            console.warn('Invalid value for', as, ':', item[as]);
        }

        if (!date.isValid()) {
            console.warn('Invalid date:', item.tanggal);
        }

        return {
            value: value,
            dataPointText: value.toFixed(2),
            label: date.format('DD-MM-YYYY HH:mm:ss'),
            labelComponent: () => (
                <Text style={[styles.italicLabel, { transform: [{ rotate: '-60deg' }] }]}>
                    {date.format('DD/MM/YYYY HH:mm:ss')}
                </Text>
            )
        };
    } catch (error) {
        console.error('Error creating data point:', error);
        return {
            value: 0,
            dataPointText: '0',
            label: 'Invalid Date',
            labelComponent: () => <Text style={styles.italicLabel}>Invalid</Text>
        };
    }
};

// Memoized chart component to prevent unnecessary re-renders
const MemoizedLineChart = memo(LineChart);

type TimeRange = 'ALL' | '1h' | '3h' | '7h' | '1d' | '2d' | '3d' | '7d' | '1m' | '3m' | '6m' | '1y';

const timeRangeOptions: { label: string; value: TimeRange }[] = [
    { label: 'Semua', value: 'ALL' },
    { label: '1 Jam', value: '1h' },
    { label: '3 Jam', value: '3h' },
    { label: '7 Jam', value: '7h' },
    { label: '1 Hari', value: '1d' },
    { label: '2 Hari', value: '2d' },
    { label: '3 Hari', value: '3d' },
    { label: '7 Hari', value: '7d' },
    { label: '1 Bulan', value: '1m' },
    { label: '3 Bulan', value: '3m' },
    { label: '6 Bulan', value: '6m' },
    { label: '1 Tahun', value: '1y' },
];

const FeedsScreen: React.FC = () => {
    const [chartData, setChartData] = useState<ChartData[]>(chartConfigs);
    const [globalPage, setGlobalPage] = useState(1);  // Global page to sync all charts
    const [isRefreshing, setIsRefreshing] = useState(false);  // State to manage refresh control
    const [isDataLoaded, setIsDataLoaded] = useState(false);  // Track initial data load
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('ALL');
    const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [visibleCharts, setVisibleCharts] = useState<number[]>([0, 1]);
    const scrollViewRef = useRef<ScrollView>(null);

    // Reduce limit for first load to improve initial render speed
    const initialLimit = 100;
    const limit = isDataLoaded ? 100 : initialLimit;  // Number of data points per page

    // Window data points based on screen size to improve performance
    const windowData = useCallback((data: DataPoint[], maxPoints: number = 100): DataPoint[] => {
        if (data.length <= maxPoints) return data;

        // Calculate interval to pick evenly distributed points
        const interval = Math.ceil(data.length / maxPoints);

        // For very dense data, show only some labels to avoid overlapping
        const labelInterval = interval > 3 ? 3 : 1;

        // Return filtered data points with selective labeling
        const windowedData = data.filter((_, index) => index % interval === 0);

        console.log('Windowed data points:', windowedData.length);

        // Ensure we have at least 2 points for the chart
        if (windowedData.length < 2) {
            console.warn('Not enough data points after windowing, using all points');
            return data;
        }

        return windowedData.map((point, index) => {
            // Only show labels for some points to prevent overlapping
            if (index % labelInterval !== 0) {
                return {
                    ...point,
                    // Keep the value but don't render the label component
                    labelComponent: undefined
                };
            }
            return point;
        });
    }, []);

    // Fetch data for a specific chart
    const fetchData = async (url: string, as: string, page: number) => {
        try {
            console.log('Fetching data for:', url, 'page:', page);

            // Build the API URL with the appropriate parameters
            let apiUrl = `${url}?page=${page}&limit=${limit}`;

            // Add time range parameter if not "ALL"
            if (selectedTimeRange !== 'ALL') {
                apiUrl += `&range=${selectedTimeRange}`;
            }

            console.log('API URL:', apiUrl);

            const response = await fetch(apiUrl);
            const json = await response.json();

            if (json.success) {
                console.log('Received data points:', json.data.length);

                // Sort data by timestamp in descending order (newest first)
                const sortedData = [...json.data].sort((a, b) =>
                    moment(b.tanggal).valueOf() - moment(a.tanggal).valueOf()
                );

                const formattedData: DataPoint[] = sortedData.map((item: any) =>
                    createDataPoint(item, as)
                );

                return {
                    formattedData: windowData(formattedData),
                    totalPage: json.totalPage,
                    hasMore: page < json.totalPage,
                    hasError: false,
                    errorMessage: ''
                };
            } else {
                console.warn('API error:', json.message);
                return {
                    formattedData: [],
                    totalPage: 0,
                    hasMore: false,
                    hasError: true,
                    errorMessage: json.message || 'Error fetching data'
                };
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return {
                formattedData: [],
                totalPage: 0,
                hasMore: false,
                hasError: true,
                errorMessage: error instanceof Error ? error.message : 'Network error'
            };
        }
    };

    // Fetch data for all charts
    const fetchAllData = async () => {
        try {
            // First set all charts to loading
            setChartData(prev => prev.map(chart => ({ ...chart, loading: true, hasError: false, errorMessage: '' })));

            const updatedChartData = await Promise.all(
                chartData.map(async (chart) => {
                    const { formattedData, totalPage, hasError, errorMessage } = await fetchData(chart.url, chart.as, chart.page);
                    return {
                        ...chart,
                        data: formattedData,
                        loading: false,
                        totalPage: totalPage || 1,
                        hasError,
                        errorMessage
                    };
                })
            );

            setChartData(updatedChartData);
            setIsDataLoaded(true); // Mark data as loaded after first fetch
        } catch (error) {
            console.error('Error fetching data:', error);
            setChartData((prevData) =>
                prevData.map((prevChart) => ({
                    ...prevChart,
                    loading: false,
                    hasError: true,
                    errorMessage: error instanceof Error ? error.message : 'Network error'
                }))
            );
        }
    };

    // Use InteractionManager to defer non-critical operations
    useEffect(() => {
        if (isDataLoaded) return;

        InteractionManager.runAfterInteractions(() => {
            fetchAllData();
        });
    }, []);

    // Add back effect for globalPage changes
    useEffect(() => {
        if (isDataLoaded) {
            fetchAllData();
        }
    }, [globalPage]);

    // Handle scroll events to determine which charts are visible
    const handleScroll = useCallback((event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const height = event.nativeEvent.layoutMeasurement.height;

        // Estimate which charts are visible based on scroll position
        // Assuming each chart container is roughly 400px tall
        const chartHeight = 400;
        const startChart = Math.max(0, Math.floor(offsetY / chartHeight));
        const endChart = Math.min(chartConfigs.length - 1, Math.ceil((offsetY + height) / chartHeight));

        // Set buffer of one chart above and below viewport
        const visibleIndices = [];
        for (let i = Math.max(0, startChart - 1); i <= Math.min(chartConfigs.length - 1, endChart + 1); i++) {
            visibleIndices.push(i);
        }

        setVisibleCharts(visibleIndices);
    }, []);

    // Handle pagination change for a specific chart
    const handlePageChange = useCallback(async (chartIndex: number, direction: 'next' | 'prev' | 'first' | 'last') => {
        // All time ranges now support pagination (handled by server)
        const updatedChartData = [...chartData];
        const chart = updatedChartData[chartIndex];
        let newPage = chart.page;

        switch (direction) {
            case 'next':
                if (newPage < chart.totalPage) newPage++;
                break;
            case 'prev':
                if (newPage > 1) newPage--;
                break;
            case 'first':
                newPage = 1;
                break;
            case 'last':
                newPage = chart.totalPage;
                break;
        }

        updatedChartData[chartIndex].page = newPage;
        setChartData(updatedChartData);
    }, [chartData, selectedTimeRange]);

    // Refresh all data and reset pages
    const refreshData = useDebouncedCallback(async () => {
        setIsRefreshing(true);
        const resetPagesChartData = chartData.map((chart) => ({
            ...chart,
            page: 1,
            hasError: false,
            errorMessage: ''
        }));
        setChartData(resetPagesChartData);
        await fetchAllData();
        setIsRefreshing(false);
    }, 20);  // 20ms debounce

    // Handle global page change for all charts
    const handleGlobalPageChange = async (direction: 'next' | 'prev' | 'first' | 'last') => {
        let newGlobalPage = globalPage;

        switch (direction) {
            case 'next':
                newGlobalPage++;
                break;
            case 'prev':
                newGlobalPage--;
                break;
            case 'first':
                newGlobalPage = 1;
                break;
            case 'last':
                newGlobalPage = Math.min(...chartData.map(chart => chart.totalPage || 1));  // Get the minimum total page
                break;
        }

        // Update global page only if it is valid (greater than 0 and less than or equal to totalPage)
        const minTotalPage = Math.min(...chartData.map(chart => chart.totalPage || 1));  // Get the minimum total page
        if (newGlobalPage > 0 && newGlobalPage <= minTotalPage) {  // Use minTotalPage instead of chartData[0].totalPage
            setGlobalPage(newGlobalPage);  // Update the global page state

            // Update the page for all charts to the new global page
            const updatedChartData = chartData.map((chart) => ({
                ...chart,
                page: newGlobalPage,  // Set each chart's page to the global page
            }));

            setChartData(updatedChartData);  // Update chart data with new pages for all charts

            // Fetch new data for all charts at the updated global page
            await fetchAllData();
        }
    };

    // Optimize pagination buttons with proper memoization:
    const PaginationButton = memo(({ onPress, disabled, text }: {
        onPress: () => void,
        disabled: boolean,
        text: string
    }) => (
        <Button size="md" variant="solid" action="primary">
            <TouchableOpacity onPress={onPress} disabled={disabled}>
                <ButtonText>{text}</ButtonText>
            </TouchableOpacity>
        </Button>
    ));

    // Empty state when no data is found
    const EmptyStateView = ({ message }: { message: string }) => (
        <View style={styles.emptyStateContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#999" />
            <Text style={styles.emptyStateText}>{message}</Text>
        </View>
    );

    // Add loading skeleton
    const ChartSkeleton = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#888" />
        </View>
    );

    // Export data to Excel
    const exportToExcel = async () => {
        try {
            setIsExporting(true);

            // Fetch all data for each sensor without pagination
            const allSensorData = await Promise.all(
                chartData.map(async (chart) => {
                    let allData: any[] = [];
                    let currentPage = 1;
                    let hasMoreData = true;

                    while (hasMoreData) {
                        // Build the API URL with the appropriate parameters
                        let apiUrl = `${chart.url}?page=${currentPage}&limit=1000`; // Use larger limit for export

                        // Add time range parameter if not "ALL"
                        if (selectedTimeRange !== 'ALL') {
                            apiUrl += `&range=${selectedTimeRange}`;
                        }

                        const response = await fetch(apiUrl);
                        const json = await response.json();

                        if (json.success && json.data.length > 0) {
                            allData = [...allData, ...json.data];
                            currentPage++;
                            hasMoreData = currentPage <= json.totalPage;
                        } else {
                            hasMoreData = false;
                        }
                    }

                    return {
                        title: chart.title,
                        as: chart.as,
                        data: allData
                    };
                })
            );

            // Create CSV content
            let csvContent = 'Tanggal,';
            allSensorData.forEach(sensor => {
                csvContent += `${sensor.title},`;
            });
            csvContent = csvContent.slice(0, -1) + '\n';

            // Get all unique timestamps
            const timestamps = new Set<string>();
            allSensorData.forEach(sensor => {
                sensor.data.forEach((item: any) => timestamps.add(item.tanggal));
            });

            // Sort timestamps
            const sortedTimestamps = Array.from(timestamps).sort((a, b) =>
                moment(a).valueOf() - moment(b).valueOf()
            );

            // Add data rows
            sortedTimestamps.forEach(timestamp => {
                const formattedDate = moment(timestamp).format('DD-MM-YYYY HH:mm:ss');
                csvContent += `${formattedDate},`;

                allSensorData.forEach(sensor => {
                    const point = sensor.data.find((item: any) => item.tanggal === timestamp);
                    csvContent += `${point ? point[sensor.as] : ''},`;
                });

                csvContent = csvContent.slice(0, -1) + '\n';
            });

            // Save file
            const filename = `water_sensor_data_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
            const filepath = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.writeAsStringAsync(filepath, csvContent);

            // Share file
            await Sharing.shareAsync(filepath, {
                mimeType: 'text/csv',
                dialogTitle: 'Export Data Sensor',
                UTI: 'public.comma-separated-values-text'
            });
        } catch (error) {
            console.error('Error exporting data:', error);
            Alert.alert('Export Error', 'Failed to export data. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Update chart data when time range changes
    useEffect(() => {
        if (isDataLoaded) {
            // Reset pages when time range changes
            const resetPagesChartData = chartData.map((chart) => ({
                ...chart,
                page: 1,
                hasError: false,
                errorMessage: ''
            }));
            setChartData(resetPagesChartData);
            setGlobalPage(1);
            fetchAllData(); // Fetch new data when time range changes
        }
    }, [selectedTimeRange]);

    // Update handler for time range change
    const handleTimeRangeChange = async (range: TimeRange) => {
        setSelectedTimeRange(range);
        setShowTimeRangeModal(false);

        // No need for special handling as we're using server-side filtering now
        // Just reset pagination and fetch data
        setGlobalPage(1);
        const resetPagesChartData = chartData.map((chart) => ({
            ...chart,
            page: 1,
            hasError: false,
            errorMessage: ''
        }));
        setChartData(resetPagesChartData);
    };

    return (
        <View style={styles.container}>
            {/* Time Range Selector */}
            <View style={styles.timeRangeContainer}>
                <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setShowTimeRangeModal(true)}
                >
                    <HStack space="sm">
                        <Ionicons name="time-outline" size={16} color="#000" />
                        <ButtonText>{timeRangeOptions.find(opt => opt.value === selectedTimeRange)?.label}</ButtonText>
                    </HStack>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onPress={exportToExcel}
                    disabled={isExporting}
                >
                    <HStack space="sm">
                        <Ionicons name="download-outline" size={16} color="#000" />
                        <ButtonText>{isExporting ? 'Exporting...' : 'Export'}</ButtonText>
                    </HStack>
                </Button>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} />}
                onScroll={handleScroll}
                scrollEventThrottle={400}
            >
                {chartData.map((chart, index) => (
                    <View style={styles.chartContainer} key={index}>
                        <HStack style={styles.chartHeader}>
                            <Text style={styles.title}>{chart.title}</Text>
                            {chart.hasError && (
                                <TouchableOpacity
                                    onPress={() => Alert.alert('Error', chart.errorMessage)}
                                    style={styles.errorInfo}
                                >
                                    <Ionicons name="alert-circle" size={18} color="#ff6b6b" />
                                </TouchableOpacity>
                            )}
                        </HStack>

                        {chart.loading ? (
                            <ChartSkeleton />
                        ) : chart.hasError ? (
                            <EmptyStateView message={chart.errorMessage || 'Data tidak tersedia'} />
                        ) : chart.data.length === 0 ? (
                            <EmptyStateView message="Data tidak ditemukan" />
                        ) : visibleCharts.includes(index) ? (
                            <MemoizedLineChart
                                key={`${index}-${chart.page}-${selectedTimeRange}`}  // Added timeRange to key for proper re-render
                                focusEnabled={false}  // Disable focus animation for performance
                                isAnimated={false}  // Disable animations for large datasets
                                data={chart.data}
                                initialSpacing={20}
                                spacing={50}
                                thickness={5} // Reduce line thickness
                                color={chart.color}
                                dataPointsColor={'black'}
                                dataPointLabelWidth={20}
                                dataPointsRadius={3} // Smaller data points
                                xAxisColor={'black'}
                                yAxisColor={'black'}
                                yAxisTextStyle={{ color: 'gray', fontSize: 15 }}
                                xAxisLabelTextStyle={styles.italicLabel}
                                xAxisLabelsHeight={20}
                                xAxisIndicesWidth={10}
                                maxValue={chart.maxValue}
                                mostNegativeValue={-(chart.maxValue / 2)}
                                startFillColor={'rgba(255, 154, 154, 0.4)'}
                                endFillColor={'rgba(255, 154, 154, 0.1)'}
                                startOpacity={0.4}
                                endOpacity={0.1}
                                areaChart
                                rotateLabel={false}
                                noOfSections={5}
                                pointerConfig={{
                                    pointerStripHeight: 160,
                                    pointerStripColor: 'lightgray',
                                    stripOverPointer: true,
                                    pointerColor: chart.color,
                                    radius: 6,
                                    pointerLabelWidth: 100,
                                    activatePointersOnLongPress: true,
                                    autoAdjustPointerLabelPosition: true,
                                }}
                                dashWidth={5}
                                labelsExtraHeight={60}
                                rulesColor="rgba(0,0,0,0.1)"
                            />
                        ) : (
                            <View style={styles.loadingContainer} />
                        )}

                        {/* Pagination for individual chart */}
                        {!chart.hasError && chart.data.length > 0 && (
                            <View style={styles.pagination}>
                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'first')}
                                    disabled={chart.page <= 1}
                                    text="First"
                                />

                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'prev')}
                                    disabled={chart.page <= 1}
                                    text="Prev"
                                />

                                <Text>{`Page ${chart.page} of ${chart.totalPage || 1}`}</Text>
                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'next')}
                                    disabled={chart.page >= chart.totalPage}
                                    text="Next"
                                />

                                <PaginationButton
                                    onPress={() => handlePageChange(index, 'last')}
                                    disabled={chart.page >= chart.totalPage}
                                    text="Last"
                                />
                            </View>
                        )}
                    </View >
                ))}

                {/* Global Pagination */}
                <View style={styles.globalPagination}>
                    <HStack space="md" reversed={false}>
                        <VStack space="md" reversed={false}>
                            <Button variant='outline' size='md'>
                                <TouchableOpacity onPress={() => handleGlobalPageChange('prev')} disabled={globalPage === 1}>
                                    <ButtonText>Prev All</ButtonText>
                                </TouchableOpacity>
                            </Button>

                            <Button variant='outline' size='md'>
                                <TouchableOpacity onPress={() => handleGlobalPageChange('first')} disabled={globalPage === 1}>
                                    <ButtonText>First All</ButtonText>
                                </TouchableOpacity>
                            </Button>
                        </VStack>

                        <Text className='px-5 text-center'>{`Global Page: ${globalPage}`}</Text>

                        <VStack space="md" reversed={false}>
                            <Button variant='outline' size='md'>
                                <TouchableOpacity onPress={() => handleGlobalPageChange('next')} disabled={globalPage === chartData[0].totalPage}>
                                    <ButtonText>Next All</ButtonText>
                                </TouchableOpacity>
                            </Button>

                            <Button variant='outline' size='md'>
                                <TouchableOpacity onPress={() => handleGlobalPageChange('last')} disabled={globalPage === chartData[0].totalPage}>
                                    <ButtonText>Last All</ButtonText>
                                </TouchableOpacity>
                            </Button>
                        </VStack>
                    </HStack>
                </View>
            </ScrollView>

            {/* Time Range Modal */}
            <Modal
                visible={showTimeRangeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTimeRangeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Pilih Rentang Waktu</Text>
                        <View style={styles.timeRangeOptions}>
                            {timeRangeOptions.map((option) => (
                                <Pressable
                                    key={option.value}
                                    style={[
                                        styles.timeRangeOption,
                                        selectedTimeRange === option.value && styles.timeRangeOptionSelected
                                    ]}
                                    onPress={() => handleTimeRangeChange(option.value)}
                                >
                                    <Text style={[
                                        styles.timeRangeOptionText,
                                        selectedTimeRange === option.value && styles.timeRangeOptionTextSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Button
                            variant="outline"
                            size="sm"
                            onPress={() => setShowTimeRangeModal(false)}
                            style={styles.modalCloseButton}
                        >
                            <ButtonText>Tutup</ButtonText>
                        </Button>
                    </View>
                </View>
            </Modal>
            <View style={{ height: 100 }}></View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
        padding: 5,
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 5,
        marginBottom: 20,
        elevation: 2,
        overflow: 'hidden',  // Add this for better rendering performance
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        alignSelf: 'center',
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 5,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    globalPagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    loadingContainer: {
        height: 200,  // Fixed height for loading state
        justifyContent: 'center',
    },
    italicLabel: {
        fontStyle: 'italic',
        fontSize: 9,
        color: 'gray',
        marginTop: 10,
        transform: [{ rotate: '-60deg' }],
        textAlign: 'center',
        fontFamily: 'Poppins-Regular',
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
        position: 'absolute',
        width: 70,  // Give enough width for the label
        paddingHorizontal: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent background to improve readability
    },
    timeRangeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    timeRangeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    timeRangeOption: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        minWidth: 100,
        alignItems: 'center',
    },
    timeRangeOptionSelected: {
        backgroundColor: '#007AFF',
    },
    timeRangeOptionText: {
        color: '#333',
        fontSize: 14,
    },
    timeRangeOptionTextSelected: {
        color: '#fff',
    },
    modalCloseButton: {
        marginTop: 20,
        alignSelf: 'center',
    },
    emptyStateContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    emptyStateText: {
        marginTop: 10,
        color: '#666',
        textAlign: 'center',
        fontSize: 14,
    },
    errorInfo: {
        marginLeft: 8,
        padding: 2,
    },
});

export default FeedsScreen;
