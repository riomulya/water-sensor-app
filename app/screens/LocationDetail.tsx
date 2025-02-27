import { View, StyleSheet } from 'react-native';
import React from 'react';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

interface LocationDetailProps {
    route: {
        params: {
            data: {
                nama_sungai: string;
                alamat: string;
                tanggal: string;
                lat: string;
                lon: string;
            }
        }
    }
}

const LocationDetail = ({ route }: LocationDetailProps) => {
    const { data } = route.params;

    return (
        <View style={styles.container}>
            <Heading size="xl" className="mb-4">
                {data.nama_sungai}
            </Heading>
            <View style={styles.infoContainer}>
                <Text size="lg" className="mb-2">
                    Alamat: {data.alamat}
                </Text>
                <Text size="lg" className="mb-2">
                    Tanggal: {new Date(data.tanggal).toLocaleDateString('en-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </Text>
                <Text size="lg" className="mb-2">
                    Latitude: {data.lat}
                </Text>
                <Text size="lg" className="mb-2">
                    Longitude: {data.lon}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: 'white',
    },
    infoContainer: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
    }
});

export default LocationDetail;