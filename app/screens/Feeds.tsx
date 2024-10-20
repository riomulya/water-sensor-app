import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

interface DataPoint {
    value: number;
}

const FeedsScreen: React.FC = () => {
    const data: DataPoint[] = [
        { value: 60 },
        { value: 30 },
        { value: 70 },
        { value: 50 },
        { value: 80 },
        { value: 40 },
        { value: 60 },
        { value: 20 },
        { value: 90 },
    ];

    const chartTitles: string[] = ['Accel X', 'Accel Y', 'Accel Z', "pH Sensor", "Temperature Sensor", "Turbidity Sensor"];

    const renderChart = (title: string, data: DataPoint[]): JSX.Element => (
        <View style={styles.chartContainer} key={title}>
            <Text style={styles.title}>{title}</Text>
            <LineChart
                data={data}
                thickness={2}
                color={'purple'}
                hideDataPoints={false}
                dataPointsColor={'purple'}
                hideYAxisText={false}
                xAxisColor={'gray'}
                yAxisColor={'gray'}
            />
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            {chartTitles.map((title) => renderChart(title, data))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f5f5f5',
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginBottom: 20,
        elevation: 2, // untuk shadow di Android
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        alignSelf: 'center',
    },
});

export default FeedsScreen;
