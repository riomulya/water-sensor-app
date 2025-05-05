import { create } from 'zustand';
import { port } from '@/constants/https';
import moment from 'moment';
import { Text } from 'react-native';

// Types
export interface DataPoint {
    value: number;
    dataPointText: string;
    label: string;
    labelComponent?: () => JSX.Element;
    timestamp?: string;
}

export interface ChartData {
    title: string;
    as: string;
    url: string;
    color: string;
    maxValue: number;
    data: DataPoint[];
    page: number;
    loading: boolean;
    totalPage: number;
    hasError: boolean;
    errorMessage: string;
}

export type TimeRange = 'ALL' | '1h' | '3h' | '7h' | '1d' | '2d' | '3d' | '7d' | '1m' | '3m' | '6m' | '1y';

export interface ChartStoreState {
    chartData: ChartData[];
    globalPage: number;
    isRefreshing: boolean;
    isDataLoaded: boolean;
    selectedTimeRange: TimeRange;
    selectedLocation: string;
    visibleCharts: number[];
}

export interface ChartStoreActions {
    setChartData: (chartData: ChartData[]) => void;
    setGlobalPage: (page: number) => void;
    setIsRefreshing: (isRefreshing: boolean) => void;
    setIsDataLoaded: (isDataLoaded: boolean) => void;
    setSelectedTimeRange: (timeRange: TimeRange) => void;
    setSelectedLocation: (location: string) => void;
    setVisibleCharts: (charts: number[]) => void;
    updateChartDataAtIndex: (index: number, chartData: Partial<ChartData>) => void;
    fetchData: (url: string, as: string, page: number, limit: number) => Promise<any>;
    fetchAllData: (limit?: number) => Promise<void>;
    refreshData: () => Promise<void>;
    handlePageChange: (chartIndex: number, direction: 'next' | 'prev' | 'first' | 'last') => void;
    handleGlobalPageChange: (direction: 'next' | 'prev' | 'first' | 'last') => void;
}

// Initial chart configurations
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
    {
        title: 'Speed',
        as: 'nilai_speed',
        url: `${port}data_speed`,
        color: '#2196f3',
        maxValue: 20,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1,
        hasError: false,
        errorMessage: ''
    },
];

// Helper function to create data points
const createDataPoint = (item: any, as: string): DataPoint => {
    try {
        const value = parseFloat(item[as]);
        // Parse date correctly from ISO format
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
            timestamp: item.tanggal,
            labelComponent: function () {
                return (
                    <Text style={{
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
                        width: 70,
                        paddingHorizontal: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)'
                    }
                    } >
                        {date.format('DD/MM/YYYY HH:mm:ss')}
                    </Text>
                );
            }
        };
    } catch (error) {
        console.error('Error creating data point:', error);
        return {
            value: 0,
            dataPointText: '0',
            label: 'Invalid Date',
            labelComponent: function () {
                return (
                    <Text style={{
                        fontStyle: 'italic',
                        fontSize: 9,
                        color: 'gray'
                    }
                    } >
                        Invalid
                    </Text>
                );
            }
        };
    }
};

// Function to window data based on screen size
const windowData = (data: DataPoint[], maxPoints: number = 100): DataPoint[] => {
    if (data.length <= maxPoints) return data;

    // Calculate interval to pick evenly distributed points
    const interval = Math.ceil(data.length / maxPoints);

    // For very dense data, show only some labels to avoid overlapping
    const labelInterval = interval > 3 ? 3 : 1;

    // Return filtered data points with selective labeling
    const windowedData = data.filter((_, index) => index % interval === 0);

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
};

// Create the store
const useChartStore = create<ChartStoreState & ChartStoreActions>((set, get) => ({
    // State
    chartData: chartConfigs,
    globalPage: 1,
    isRefreshing: false,
    isDataLoaded: false,
    selectedTimeRange: 'ALL',
    selectedLocation: '',
    visibleCharts: [0, 1],

    // Actions
    setChartData: (chartData) => set({ chartData }),
    setGlobalPage: (globalPage) => set({ globalPage }),
    setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
    setIsDataLoaded: (isDataLoaded) => set({ isDataLoaded }),
    setSelectedTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
    setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
    setVisibleCharts: (visibleCharts) => set({ visibleCharts }),

    // Update a specific chart's data
    updateChartDataAtIndex: (index, chartData) => {
        set((state) => {
            const newChartData = [...state.chartData];
            newChartData[index] = { ...newChartData[index], ...chartData };
            return { chartData: newChartData };
        });
    },

    // Fetch data for a specific chart
    fetchData: async (url: string, as: string, page: number, limit: number) => {
        try {
            console.log('Fetching data for:', url, 'page:', page);

            const { selectedLocation, selectedTimeRange } = get();
            let apiUrl = '';
            const baseUrl = url.split('?')[0]; // Get base URL without query params

            if (selectedLocation && selectedLocation !== 'all') {
                // For all endpoints use the same format
                apiUrl = `${baseUrl}/${selectedLocation}?page=${page}&limit=${limit}`;

                // Add time range if not ALL
                if (selectedTimeRange !== 'ALL') {
                    apiUrl += `&range=${selectedTimeRange}`;
                }
            } else {
                // If no location selected, use base endpoint
                apiUrl = `${baseUrl}?page=${page}&limit=${limit}`;

                // Add time range if not ALL
                if (selectedTimeRange !== 'ALL') {
                    apiUrl += `&range=${selectedTimeRange}`;
                }
            }

            console.log('API URL:', apiUrl);

            // Add timeout for request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

            try {
                const response = await fetch(apiUrl, {
                    signal: controller.signal
                });

                // Clear timeout after response received
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Request failed with status ${response.status}. Response: ${errorText}`);

                    // More informative error message
                    let errorMessage = '';
                    if (response.status === 404) {
                        errorMessage = 'Data tidak ditemukan';
                    } else if (response.status === 500) {
                        errorMessage = 'Terjadi kesalahan pada server';
                    } else {
                        errorMessage = `Error ${response.status}: ${errorText || 'Unknown error'}`;
                    }

                    throw new Error(errorMessage);
                }

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
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        } catch (error) {
            console.error('Error fetching data:', error);

            // More user-friendly error message
            let userMessage = 'Terjadi kesalahan saat mengambil data';
            let technicalMessage = error instanceof Error ? error.message : 'Network error';

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    userMessage = 'Permintaan timeout, coba lagi nanti';
                } else if (error.message.includes('Network request failed')) {
                    userMessage = 'Koneksi jaringan gagal';
                }
            }

            return {
                formattedData: [],
                totalPage: 0,
                hasMore: false,
                hasError: true,
                errorMessage: `${userMessage} (${technicalMessage})`
            };
        }
    },

    // Fetch data for all charts
    fetchAllData: async (limit = 100) => {
        try {
            const { chartData, setChartData, setIsDataLoaded, fetchData } = get();

            // Set all charts to loading
            setChartData(chartData.map(chart => ({ ...chart, loading: true, hasError: false, errorMessage: '' })));

            const updatedChartData = await Promise.all(
                chartData.map(async (chart) => {
                    try {
                        const { formattedData, totalPage, hasError, errorMessage } =
                            await fetchData(chart.url, chart.as, chart.page, limit);
                        return {
                            ...chart,
                            data: formattedData,
                            loading: false,
                            totalPage: totalPage || 1,
                            hasError,
                            errorMessage
                        };
                    } catch (chartError) {
                        // Handle error per chart
                        console.error(`Error fetching data for ${chart.title}:`, chartError);
                        return {
                            ...chart,
                            data: [],
                            loading: false,
                            hasError: true,
                            errorMessage: chartError instanceof Error
                                ? chartError.message
                                : 'Terjadi kesalahan saat mengambil data'
                        };
                    }
                })
            );

            setChartData(updatedChartData);
            setIsDataLoaded(true); // Mark data as loaded after first fetch
        } catch (error) {
            console.error('Error in fetchAllData:', error);

            // Generate user friendly messages for each chart
            const { chartData, setChartData } = get();
            setChartData(chartData.map((prevChart) => {
                const userMessage = 'Gagal memuat data';
                const technicalMessage = error instanceof Error ? error.message : 'Network error';

                return {
                    ...prevChart,
                    loading: false,
                    hasError: true,
                    errorMessage: `${userMessage} (${technicalMessage})`
                };
            }));
        }
    },

    // Refresh all data and reset pages
    refreshData: async () => {
        const { setIsRefreshing, chartData, setChartData, fetchAllData } = get();
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
    },

    // Handle pagination change for a specific chart
    handlePageChange: (chartIndex, direction) => {
        const { chartData, updateChartDataAtIndex } = get();
        const chart = chartData[chartIndex];
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

        updateChartDataAtIndex(chartIndex, { page: newPage });
    },

    // Handle global page change for all charts
    handleGlobalPageChange: async (direction) => {
        const { globalPage, setGlobalPage, chartData, setChartData, fetchAllData } = get();

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
                newGlobalPage = Math.min(...chartData.map(chart => chart.totalPage || 1));
                break;
        }

        // Update global page only if it is valid
        const minTotalPage = Math.min(...chartData.map(chart => chart.totalPage || 1));
        if (newGlobalPage > 0 && newGlobalPage <= minTotalPage) {
            setGlobalPage(newGlobalPage);

            // Update the page for all charts to the new global page
            const updatedChartData = chartData.map((chart) => ({
                ...chart,
                page: newGlobalPage,
            }));

            setChartData(updatedChartData);

            // Fetch new data for all charts at the updated global page
            await fetchAllData();
        }
    }
}));

export default useChartStore; 