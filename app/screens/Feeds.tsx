import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
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
}

const chartConfigs: ChartData[] = [
    {
        title: 'pH Sensor',
        as: 'nilai_ph',
        url: 'http://192.168.1.22:3000/data_ph',
        color: 'tomato',
        maxValue: 14,
        data: []  // Initialize data as empty array
    },
    {
        title: 'Acceleration X',
        as: 'nilai_accel_x',
        url: 'http://192.168.1.22:3000/data_accel_x',
        color: 'blue',
        maxValue: 500,
        data: []  // Initialize data as empty array
    },
    {
        title: 'Acceleration Y',
        as: 'nilai_accel_y',
        url: 'http://192.168.1.22:3000/data_accel_y',
        color: 'green',
        maxValue: 500,
        data: []  // Initialize data as empty array
    },
    {
        title: 'Acceleration Z',
        as: 'nilai_accel_z',
        url: 'http://192.168.1.22:3000/data_accel_z',
        color: 'orange',
        maxValue: 500,
        data: []  // Initialize data as empty array
    },
    {
        title: 'Temperature',
        as: 'nilai_temperature',
        url: 'http://192.168.1.22:3000/data_temperature',
        color: 'purple',
        maxValue: 100,
        data: []  // Initialize data as empty array
    },
    {
        title: 'Turbidity',
        as: 'nilai_turbidity',
        url: 'http://192.168.1.22:3000/data_turbidity',
        color: 'brown',
        maxValue: 3000,
        data: []  // Initialize data as empty array
    },
];

const FeedsScreen: React.FC = () => {
    const [chartData, setChartData] = useState<ChartData[]>([]);  // chartData should be of type ChartData[]
    const [loading, setLoading] = useState(true);

    const downsampleData = (data: DataPoint[], interval: number) => {
        return data.filter((_, index) => index % interval === 0); // Take data every interval
    };

    const fetchData = async (url: string, as: string) => {
        const response = await fetch(url);
        const json = await response.json();
        if (json.success) {
            const formattedData: DataPoint[] = json.data.map((item: any) => ({
                value: item[as],  // Use 'as' to dynamically get the correct value
                dataPointText: item[as].toString(),
                label: moment(item.tanggal).format('HH:mm:ss') // Adjust based on your API's timestamp field
            }));
            return downsampleData(formattedData, 10); // Downsample every 10 data points
        }
        return [];
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Fetch data for all charts concurrently
                const updatedChartData = await Promise.all(
                    chartConfigs.map(async (chart) => {
                        const data = await fetchData(chart.url, chart.as);  // Fetch data for each chart
                        return { ...chart, data };  // Update chart data
                    })
                );
                setChartData(updatedChartData);  // Set the fetched data into the state
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    return (
        <ScrollView style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="purple" />
            ) : (
                chartData.map((chart, index) => (
                    <View style={styles.chartContainer} key={index}>
                        <Text style={styles.title}>{chart.title}</Text>
                        <LineChart
                            focusEnabled
                            curved={true}
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
                            startFillColor={'rgba(255, 154, 154, 0.4)'}
                            endFillColor={'rgba(255, 154, 154, 0.1)'}
                            startOpacity={0.4}
                            endOpacity={0.1}
                            areaChart
                        />
                    </View>
                ))
            )}
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
});

export default FeedsScreen;
