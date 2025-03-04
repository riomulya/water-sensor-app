import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ButtonText } from '@/components/ui/button';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import { port } from '@/constants/https';
import { DataTable } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AntDesign } from '@expo/vector-icons';

interface ApiLocation {
    id_lokasi: number;
    nama_sungai: string;
    alamat: string;
    tanggal: string;
    lat: string;
    lon: string;
}

interface CombinedData {
    lat: string;
    lon: string;
    tanggal: string;
    nilai_accel_x: number;
    nilai_accel_y: number;
    nilai_accel_z: number;
    nilai_ph: number;
    nilai_temperature: number;
    nilai_turbidity: number;
}

const DetailLocationScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<ApiLocation | null>(null);
    const [allCombinedData, setAllCombinedData] = useState<CombinedData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${port}data_lokasi/${id}`);
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        const fetchCombinedData = async () => {
            try {
                const response = await fetch(`${port}data_combined/paginated/${id}?page=${currentPage}&limit=${itemsPerPage}`);
                const responseTotal = await fetch(`${port}data_combined/${id}`);
                const result = await response.json();
                const resultTotal = await responseTotal.json();
                if (result.success) {
                    setAllCombinedData(result.data);
                    setTotalItems(resultTotal.length); // Set total items from response
                }
            } catch (error) {
                console.error('Error fetching combined data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCombinedData();
    }, [id, currentPage, itemsPerPage]);

    const handleBack = () => {
        router.back();
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(`${port}data_combined/export/${Number(id)}`);
            const blob: Blob = await response.blob();
            const fileUri = FileSystem.documentDirectory + 'data_combined.xlsx';
            const base64Data = await blobToBase64(blob);
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });

            Alert.alert('Download Sukses', 'File berhasil diunduh ke perangkat Anda.', [
                {
                    text: 'Buka File',
                    onPress: async () => {
                        await Sharing.shareAsync(fileUri);
                    },
                },
                { text: 'OK', onPress: () => console.log('OK Pressed') },
            ]);
        } catch (error) {
            console.error('Error downloading file:', error);
            Alert.alert('Error', 'Gagal mengunduh file.');
        } finally {
            setIsDownloading(false);
        }
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <AntDesign name="arrowleft" size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.header}>
                    <Heading size="xl" className="mb-4" style={styles.title}>
                        {data?.nama_sungai || 'Loading...'}
                    </Heading>
                </View>

                <Text size="lg" className="mb-2">Alamat: {data?.alamat}</Text>
                <Text size="lg" className="mb-2">Tanggal: {data && new Date(data.tanggal).toLocaleDateString('en-ID')}</Text>
                <Text size="lg" className="mb-2">Latitude: {data?.lat}</Text>
                <Text size="lg" className="mb-4">Longitude: {data?.lon}</Text>

                {allCombinedData.length === 0 ? "" : <Button
                    variant="outline"
                    action="secondary"
                    onPress={handleDownload}
                    size="md"
                    disabled={allCombinedData.length === 0 || isDownloading}
                >
                    <ButtonText>{isDownloading ? 'Downloading...' : 'Download Excel'}</ButtonText>
                </Button>}


                {isDownloading && <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />}

                {loading ? (
                    <View className='flex justify-center items-center'>
                        <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />
                        <Text className='text-center text-blue-500'>Loading data...</Text>
                    </View>
                ) : allCombinedData.length === 0 ? (
                    <Text className='text-center text-red-500'>Tidak ada data untuk ditampilkan.</Text>
                ) : (
                    <ScrollView horizontal>
                        <ScrollView>
                            <DataTable className='w-full flex mb-10'>
                                <DataTable.Header>
                                    <DataTable.Title style={styles.titleCell}>No</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Latitude</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Longitude</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Tanggal</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Accel X</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Accel Y</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Accel Z</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>pH</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Temperature</DataTable.Title>
                                    <DataTable.Title style={styles.titleCell}>Turbidity</DataTable.Title>
                                </DataTable.Header>

                                {allCombinedData.map((item, index) => (
                                    <DataTable.Row key={index}>
                                        <DataTable.Cell>{(currentPage - 1) * itemsPerPage + index + 1}</DataTable.Cell>
                                        <DataTable.Cell>{item.lat}</DataTable.Cell>
                                        <DataTable.Cell>{item.lon}</DataTable.Cell>
                                        <DataTable.Cell>{new Date(item.tanggal).toLocaleDateString('en-ID')}</DataTable.Cell>
                                        <DataTable.Cell>{item.nilai_accel_x}</DataTable.Cell>
                                        <DataTable.Cell>{item.nilai_accel_y}</DataTable.Cell>
                                        <DataTable.Cell>{item.nilai_accel_z}</DataTable.Cell>
                                        <DataTable.Cell>{item.nilai_ph}</DataTable.Cell>
                                        <DataTable.Cell>{item.nilai_temperature}</DataTable.Cell>
                                        <DataTable.Cell>{item.nilai_turbidity}</DataTable.Cell>
                                    </DataTable.Row>
                                ))}

                                <DataTable.Pagination
                                    page={currentPage - 1}
                                    numberOfPages={Math.ceil(totalItems / itemsPerPage)}
                                    onPageChange={(page) => setCurrentPage(page + 1)}
                                    label={`${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems}`}
                                    numberOfItemsPerPageList={[10, 20, 50, 100]}
                                    numberOfItemsPerPage={itemsPerPage}
                                    onItemsPerPageChange={setItemsPerPage}
                                    showFastPaginationControls
                                    selectPageDropdownLabel={'Rows per page'}
                                />
                            </DataTable>
                        </ScrollView>
                    </ScrollView>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 5,
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
        marginBottom: 200,
    },
    loadingIndicator: {
        marginTop: 20,
    },
    titleCell: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        textAlign: 'center',
    },
});

export default DetailLocationScreen; 