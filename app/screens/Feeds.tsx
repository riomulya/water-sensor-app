import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, InteractionManager, Modal, Pressable } from 'react-native';
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
        totalPage: 1
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
        totalPage: 1
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
        totalPage: 1
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
        totalPage: 1
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
        totalPage: 1
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
        totalPage: 1
    },
];

// Optimize DataPoint creation with memoization
const createDataPoint = (item: any, as: string): DataPoint => {
    try {
        const value = parseFloat(item[as]);
        const date = moment(item.tanggal);

        if (isNaN(value)) {
            console.warn('Invalid value for', as, ':', item[as]);
        }

        if (!date.isValid()) {
            console.warn('Invalid date:', item.tanggal);
        }

        return {
            value: value,
            dataPointText: value.toString(),
            label: date.format('DD-MM-YYYY HH:mm:ss'),
            labelComponent: () => (
                <Text style={[styles.italicLabel, { transform: [{ rotate: '-60deg' }] }]}>
                    {date.format('DD/MM HH:mm')}
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

type TimeRange = 'ALL' | '1h' | '3h' | '7h' | '1d' | '2d' | '3d' | '7d';

const timeRangeOptions: { label: string; value: TimeRange }[] = [
    { label: 'Semua', value: 'ALL' },
    { label: '1 Jam', value: '1h' },
    { label: '3 Jam', value: '3h' },
    { label: '7 Jam', value: '7h' },
    { label: '1 Hari', value: '1d' },
    { label: '2 Hari', value: '2d' },
    { label: '3 Hari', value: '3d' },
    { label: '7 Hari', value: '7d' },
];

const FeedsScreen: React.FC = () => {
    const [chartData, setChartData] = useState<ChartData[]>(chartConfigs);
    const [globalPage, setGlobalPage] = useState(1);  // Global page to sync all charts
    const [isRefreshing, setIsRefreshing] = useState(false);  // State to manage refresh control
    const [isDataLoaded, setIsDataLoaded] = useState(false);  // Track initial data load
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1h');
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

    // Calculate time range based on selection
    const getTimeRange = useCallback((range: TimeRange) => {
        const now = moment();
        switch (range) {
            case '1h': return now.clone().subtract(1, 'hours');
            case '3h': return now.clone().subtract(3, 'hours');
            case '7h': return now.clone().subtract(7, 'hours');
            case '1d': return now.clone().subtract(1, 'days');
            case '2d': return now.clone().subtract(2, 'days');
            case '3d': return now.clone().subtract(3, 'days');
            case '7d': return now.clone().subtract(7, 'days');
            default: return now.clone().subtract(1, 'hours');
        }
    }, []);

    // Filter data based on time range from the latest timestamp
    const filterDataByTimeRange = useCallback((data: DataPoint[], range: TimeRange, latestTimestamp: moment.Moment) => {
        if (range === 'ALL') return data;

        const startTime = getTimeRangeFromLatest(range, latestTimestamp);
        console.log('Filtering data from:', startTime.format('DD-MM-YYYY HH:mm:ss'));

        const filteredData = data.filter(point => {
            try {
                const pointTime = moment(point.label, 'DD-MM-YYYY HH:mm:ss');
                const isInRange = pointTime.isSameOrAfter(startTime) && pointTime.isSameOrBefore(latestTimestamp);
                return isInRange;
            } catch (error) {
                console.error('Error parsing date:', point.label, error);
                return false;
            }
        });

        console.log('Filtered data length:', filteredData.length);
        return filteredData;
    }, []);

    // Calculate time range based on selection from the latest timestamp
    const getTimeRangeFromLatest = useCallback((range: TimeRange, latestTimestamp: moment.Moment) => {
        switch (range) {
            case '1h': return latestTimestamp.clone().subtract(1, 'hours');
            case '3h': return latestTimestamp.clone().subtract(3, 'hours');
            case '7h': return latestTimestamp.clone().subtract(7, 'hours');
            case '1d': return latestTimestamp.clone().subtract(1, 'days');
            case '2d': return latestTimestamp.clone().subtract(2, 'days');
            case '3d': return latestTimestamp.clone().subtract(3, 'days');
            case '7d': return latestTimestamp.clone().subtract(7, 'days');
            default: return latestTimestamp.clone().subtract(1, 'hours');
        }
    }, []);

    // Fetch data for a specific chart
    const fetchData = async (url: string, as: string, page: number) => {
        try {
            console.log('Fetching data for:', url, 'page:', page);
            const response = await fetch(`${url}?page=${page}&limit=${limit}`);
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

                // If time range is 'ALL', return all data
                if (selectedTimeRange === 'ALL') {
                    return {
                        formattedData: windowData(formattedData),
                        totalPage: json.totalPage,
                        hasMore: page < json.totalPage
                    };
                }

                // Get the latest timestamp from the data
                const latestTimestamp = moment(sortedData[0]?.tanggal);
                console.log('Latest timestamp:', latestTimestamp.format('DD-MM-YYYY HH:mm:ss'));

                // Filter data based on selected time range from the latest timestamp
                const filteredData = filterDataByTimeRange(formattedData, selectedTimeRange, latestTimestamp);

                // Window the data for better performance
                const optimizedData = windowData(filteredData);
                console.log('Optimized data points:', optimizedData.length);
                return {
                    formattedData: optimizedData,
                    totalPage: json.totalPage,
                    hasMore: false // Set hasMore to false since we don't want to load more pages for time range
                };
            }
            return { formattedData: [], totalPage: 1, hasMore: false };
        } catch (error) {
            console.error('Error fetching data:', error);
            return { formattedData: [], totalPage: 1, hasMore: false };
        }
    };

    // Fetch data for all charts
    const fetchAllData = async () => {
        try {
            // First set all charts to loading
            setChartData(prev => prev.map(chart => ({ ...chart, loading: true })));

            const updatedChartData = await Promise.all(
                chartData.map(async (chart) => {
                    const { formattedData, totalPage } = await fetchData(chart.url, chart.as, chart.page);
                    return { ...chart, data: formattedData, loading: false, totalPage };
                })
            );

            setChartData(updatedChartData);
            setIsDataLoaded(true); // Mark data as loaded after first fetch
        } catch (error) {
            console.error('Error fetching data:', error);
            setChartData((prevData) =>
                prevData.map((prevChart) => ({ ...prevChart, loading: false }))
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
        // If time range is not 'ALL', disable pagination
        if (selectedTimeRange !== 'ALL') {
            return;
        }

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
        const resetPagesChartData = chartData.map((chart) => ({ ...chart, page: 1 }));
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
                newGlobalPage = Math.min(...chartData.map(chart => chart.totalPage));  // Get the minimum total page
                break;
        }

        // Update global page only if it is valid (greater than 0 and less than or equal to totalPage)
        const minTotalPage = Math.min(...chartData.map(chart => chart.totalPage));  // Get the minimum total page
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

            // Create CSV content
            let csvContent = 'Tanggal,';
            chartData.forEach(chart => {
                csvContent += `${chart.title},`;
            });
            csvContent = csvContent.slice(0, -1) + '\n';

            // Get all unique timestamps
            const timestamps = new Set<string>();
            chartData.forEach(chart => {
                chart.data.forEach(point => timestamps.add(point.label));
            });

            // Sort timestamps
            const sortedTimestamps = Array.from(timestamps).sort((a, b) =>
                moment(a, 'DD-MM-YYYY HH:mm:ss').valueOf() - moment(b, 'DD-MM-YYYY HH:mm:ss').valueOf()
            );

            // Add data rows
            sortedTimestamps.forEach(timestamp => {
                csvContent += `${timestamp},`;
                chartData.forEach(chart => {
                    const point = chart.data.find(p => p.label === timestamp);
                    csvContent += `${point ? point.value : ''},`;
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
        } finally {
            setIsExporting(false);
        }
    };

    // Update chart data when time range changes
    useEffect(() => {
        if (isDataLoaded) {
            fetchAllData(); // Fetch new data when time range changes
        }
    }, [selectedTimeRange]);

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
                        <Text style={styles.title}>{chart.title}</Text>
                        {chart.loading ? (
                            <ChartSkeleton />
                        ) : visibleCharts.includes(index) ? (
                            <MemoizedLineChart
                                key={`${index}-${chart.page}`}  // Add page to key to force proper re-render
                                focusEnabled={false}  // Disable focus animation for performance
                                isAnimated={false}  // Disable animations for large datasets
                                data={chart.data}
                                initialSpacing={20}
                                spacing={50}
                                thickness={5} // Reduce line thickness
                                color={chart.color}
                                // hideDataPoints={chart.data.length > 30} // Hide data points for large datasets
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

                            <Text>{`Page ${chart.page} of ${chart.totalPage}`}</Text>
                            <PaginationButton
                                onPress={() => handlePageChange(index, 'next')}
                                disabled={globalPage >= chart.totalPage}
                                text="Next"
                            />

                            <PaginationButton
                                onPress={() => handlePageChange(index, 'last')}
                                disabled={globalPage >= chart.totalPage}
                                text="Last"
                            />

                        </View>
                    </View >
                ))
                }

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
                                    onPress={() => {
                                        setSelectedTimeRange(option.value);
                                        setShowTimeRangeModal(false);
                                    }}
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
});

export default FeedsScreen;
