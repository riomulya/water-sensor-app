import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import moment from 'moment';

interface DataPoint {
    value: number;
    dataPointText: string;
    label: string;
}

const FeedsScreen: React.FC = () => {
    const [phData, setPhData] = useState<DataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    const downsampleData = (data: DataPoint[], interval: number) => {
        return data.filter((_, index) => index % interval === 0); // Ambil data setiap interval
    };

    useEffect(() => {
        fetch('http://192.168.1.22:3000/data_ph')
            .then((response) => response.json())
            .then((json) => {
                if (json.success) {
                    const formattedData: DataPoint[] = json.data.map((item: any) => ({
                        value: item.nilai_ph,
                        dataPointText: item.nilai_ph,
                        label: moment(item.tanggal).format('HH:mm:ss')
                    }));
                    // Downsample data to reduce the number of points shown
                    setPhData(downsampleData(formattedData.reverse(), 10)); // Menampilkan 1 data setiap 10 data
                }
            })
            .catch((error) => console.error('Error fetching data:', error))
            .finally(() => setLoading(false));
    }, []);


    return (
        <ScrollView style={styles.container}>
            <View style={styles.chartContainer}>
                <Text style={styles.title}>pH Sensor</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="purple" />
                ) : (
                    <LineChart
                        focusEnabled
                        curved={true}
                        isAnimated={true}
                        data={phData}
                        initialSpacing={20}
                        spacing={100}
                        thickness={5}
                        color={'tomato'}
                        hideDataPoints={false}
                        dataPointsColor={'black'}
                        dataPointLabelWidth={20}
                        xAxisColor={'black'}
                        yAxisColor={'black'}
                        yAxisTextStyle={{ color: 'gray', fontSize: 15 }}
                        maxValue={14}
                        startFillColor={'rgb(255, 154, 154)'}
                        endFillColor={'rgb(255, 154, 154)'}
                        startOpacity={0.4}
                        endOpacity={0.1}
                        areaChart
                        xAxisType='time'
                    // xAxisTextStyle={{ color: 'gray', fontSize: 10, rotation: -45 }} // Miring biar muat
                    // onDataPointClick={(data) => handleDataPointClick(phData[data.index])} // Klik titik untuk detail
                    />
                )}
            </View>
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
