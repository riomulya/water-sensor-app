import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';

interface DataPoint {
    value: number;
    dataPointText: string;
    label: string;
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
        url: 'http://192.168.1.22:3000/data_ph',
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
        url: 'http://192.168.1.22:3000/data_accel_x',
        color: 'blue',
        maxValue: 500,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1
    },
    {
        title: 'Acceleration Y',
        as: 'nilai_accel_y',
        url: 'http://192.168.1.22:3000/data_accel_y',
        color: 'green',
        maxValue: 500,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1
    },
    {
        title: 'Acceleration Z',
        as: 'nilai_accel_z',
        url: 'http://192.168.1.22:3000/data_accel_z',
        color: 'orange',
        maxValue: 500,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1
    },
    {
        title: 'Temperature',
        as: 'nilai_temperature',
        url: 'http://192.168.1.22:3000/data_temperature',
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
        url: 'http://192.168.1.22:3000/data_turbidity',
        color: 'brown',
        maxValue: 3000,
        data: [],
        page: 1,
        loading: false,
        totalPage: 1
    },
];

const FeedsScreen: React.FC = () => {
    const [chartData, setChartData] = useState<ChartData[]>(chartConfigs);
    const [globalPage, setGlobalPage] = useState(1);  // Global page to sync all charts
    const [isRefreshing, setIsRefreshing] = useState(false);  // State to manage refresh control

    const limit = 100;  // Number of data points per page

    // Fetch data for a specific chart
    const fetchData = async (url: string, as: string, page: number) => {
        const response = await fetch(`${url}?page=${page}&limit=${limit}`);
        const json = await response.json();
        if (json.success) {
            const formattedData: DataPoint[] = json.data.slice(-limit).map((item: any) => ({
                value: item[as],
                dataPointText: item[as].toString(),
                label: moment(item.tanggal).format('HH:mm:ss')
            }));
            return { formattedData, totalPage: json.totalPage };
        }
        return { formattedData: [], totalPage: 1 };
    };

    // Fetch data for all charts
    const fetchAllData = async () => {
        try {
            const updatedChartData = await Promise.all(
                chartData.map(async (chart) => {
                    setChartData((prevData) =>
                        prevData.map((prevChart) =>
                            prevChart.title === chart.title
                                ? { ...prevChart, loading: true }
                                : prevChart
                        )
                    );
                    const { formattedData, totalPage } = await fetchData(chart.url, chart.as, chart.page);
                    return { ...chart, data: formattedData, loading: false, totalPage };
                })
            );
            setChartData(updatedChartData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setChartData((prevData) =>
                prevData.map((prevChart) => ({ ...prevChart, loading: false }))
            );
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);  // Fetch data on initial load

    // Handle pagination change for a specific chart
    const handlePageChange = async (chartIndex: number, direction: 'next' | 'prev' | 'first' | 'last') => {
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

        // Fetch new data for that chart
        const { formattedData } = await fetchData(chart.url, chart.as, newPage);
        updatedChartData[chartIndex].data = formattedData;
        setChartData(updatedChartData);  // Update chart data for specific chart
    };

    // Refresh all data and reset pages
    const refreshData = async () => {
        setIsRefreshing(true);
        const resetPagesChartData = chartData.map((chart) => ({ ...chart, page: 1 }));
        setChartData(resetPagesChartData);
        await fetchAllData();
        setIsRefreshing(false);
    };

    // Handle global page change for all charts
    const handleGlobalPageChange = async (direction: 'next' | 'prev') => {
        let newGlobalPage = globalPage;
        if (direction === 'next') newGlobalPage++;
        else if (direction === 'prev') newGlobalPage--;

        // Update global page
        if (newGlobalPage > 0) {
            setGlobalPage(newGlobalPage);
            const updatedChartData = chartData.map((chart) => ({
                ...chart,
                page: newGlobalPage
            }));
            setChartData(updatedChartData);
            await fetchAllData();  // Fetch data for all charts at the new page
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} />}
        >
            {chartData.map((chart, index) => (
                <View style={styles.chartContainer} key={index}>
                    <Text style={styles.title}>{chart.title}</Text>
                    {chart.loading ? (
                        <ActivityIndicator size="large" color={chart.color} />
                    ) : (
                        <LineChart
                            key={index}
                            focusEnabled
                            isAnimated={true}
                            data={chart.data}
                            initialSpacing={20}
                            spacing={100}
                            thickness={5}
                            color={chart.color}
                            hideDataPoints={false}
                            dataPointsColor={'black'}
                            dataPointLabelWidth={20}
                            xAxisColor={'black'}
                            yAxisColor={'black'}
                            yAxisTextStyle={{ color: 'gray', fontSize: 15 }}
                            maxValue={chart.maxValue}
                            mostNegativeValue={-(2)}
                            startFillColor={'rgba(255, 154, 154, 0.4)'}
                            endFillColor={'rgba(255, 154, 154, 0.1)'}
                            startOpacity={0.4}
                            endOpacity={0.1}
                            areaChart
                        />
                    )}

                    {/* Pagination for individual chart */}
                    <View style={styles.pagination}>
                        <TouchableOpacity onPress={() => handlePageChange(index, 'first')} disabled={chart.page <= 1}>
                            <Text style={styles.paginationButton}>First</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handlePageChange(index, 'prev')} disabled={chart.page <= 1}>
                            <Text style={styles.paginationButton}>Prev</Text>
                        </TouchableOpacity>
                        <Text>{`Page ${chart.page} of ${chart.totalPage}`}</Text>
                        <TouchableOpacity onPress={() => handlePageChange(index, 'next')} disabled={chart.page >= chart.totalPage}>
                            <Text style={styles.paginationButton}>Next</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handlePageChange(index, 'last')} disabled={chart.page >= chart.totalPage}>
                            <Text style={styles.paginationButton}>Last</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}

            {/* Global Pagination */}
            <View style={styles.globalPagination}>
                <TouchableOpacity onPress={() => handleGlobalPageChange('prev')} disabled={globalPage <= 1}>
                    <Text style={styles.paginationButton}>Prev All</Text>
                </TouchableOpacity>
                <Text>{`Global Page: ${globalPage}`}</Text>
                <TouchableOpacity onPress={() => handleGlobalPageChange('next')}>
                    <Text style={styles.paginationButton}>Next All</Text>
                </TouchableOpacity>
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 5,
        backgroundColor: '#f5f5f5',
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 5,
        marginBottom: 20,
        elevation: 2,
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
    paginationButton: {
        fontSize: 14,
        color: '#007bff',
        paddingHorizontal: 10,
    },
});

export default FeedsScreen;
