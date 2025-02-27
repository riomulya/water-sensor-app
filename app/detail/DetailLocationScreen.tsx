import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
// import { Heading, Text, Button, ButtonText } from '@/components/ui';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ButtonText } from '@/components/ui/button';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import { port } from '@/constants/https';

interface ApiLocation {
    id_lokasi: number;
    nama_sungai: string;
    alamat: string;
    tanggal: string;
    lat: string;
    lon: string;
}

type RootStackParamList = {
    Detail: { id: number };
};

const DetailLocationScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    console.log('Received id:', id);
    const router = useRouter();
    const [data, setData] = useState<ApiLocation | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('Fetching data for id:', id);
                const response = await fetch(`${port}data_lokasi/${id}`);
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        fetchData();
    }, [id]);

    const handleBack = () => {
        router.back();
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Heading size="xl" className="mb-4">
                    {data?.nama_sungai || 'Loading...'}
                </Heading>

                <Text size="lg" className="mb-2">
                    Alamat: {data?.alamat}
                </Text>

                <Text size="lg" className="mb-2">
                    Tanggal: {data && new Date(data.tanggal).toLocaleDateString('en-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </Text>

                <Text size="lg" className="mb-2">
                    Latitude: {data?.lat}
                </Text>

                <Text size="lg" className="mb-4">
                    Longitude: {data?.lon}
                </Text>

                <Button
                    variant="outline"
                    action="secondary"
                    onPress={handleBack}
                    size="md"
                >
                    <ButtonText>Kembali</ButtonText>
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    content: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
});

export default DetailLocationScreen; 