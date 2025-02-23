import { View, StyleSheet, ScrollView, Modal, Button } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Input, InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Link } from '@/components/ui/link';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogBody,
    AlertDialogBackdrop
} from "@/components/ui/alert-dialog";
import { Button as CustomButton, ButtonText } from "@/components/ui/button";

interface ApiLocation {
    id_lokasi: number;
    nama_sungai: string;
    alamat: string;
    tanggal: string;
    lat: string;
    lon: string;
}

interface FormattedLocation {
    id: number;
    title: string;
    location: string;
    date: string;
    image: string;
}

const AnalysisScreen = () => {
    const [data, setData] = useState<FormattedLocation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAlertDialog, setShowAlertDialog] = useState(false);
    const [selectedData, setSelectedData] = useState<ApiLocation | null>(null);

    const filteredData = data.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCardPress = async (id: number) => {
        try {
            const response = await fetch(`http://192.168.1.15:3000/data_lokasi/${id}`);
            const result: ApiLocation = await response.json();
            setSelectedData(result);
            setShowAlertDialog(true);
        } catch (error) {
            console.error('Error fetching location details:', error);
        }
    };

    useEffect(() => {
        fetch('http://192.168.1.15:3000/data_lokasi')
            .then(response => response.json())
            .then((apiData: ApiLocation[]) => {
                const formattedData: FormattedLocation[] = apiData.map(item => ({
                    id: item.id_lokasi,
                    title: item.nama_sungai,
                    location: item.alamat,
                    date: new Date(item.tanggal).toLocaleDateString('en-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                    }),
                    image: 'https://via.placeholder.com/150',
                }));
                setData(formattedData);
            });
    }, []);

    return (
        <View style={styles.container}>
            <View style={{ ...styles.searchBox, zIndex: 1 }} >
                {/* <View style={{ ...styles.inputContainer }}> */}
                <Input variant="outline" size="xl" isDisabled={false} isInvalid={false} isReadOnly={false} className='flex-1'  >
                    <InputField
                        placeholder='Cari Data ...'
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                    />
                </Input>
                {/* </View> */}
            </View>
            <ScrollView contentContainerStyle={styles.scrollViewContainer}>
                {filteredData.map((item, index) => (
                    <Card
                        key={item.id}
                        size="lg"
                        variant="outline"
                        className={`m-3 ${index === data.length - 1 ? 'mb-28' : ''}`}
                    >
                        <View className='flex flex-row'>
                            {/* <Image
                                source={require('../../assets/images/Nature.png')}
                                // className="mb-6 h-[240px] rounded-md"
                                alt="Nature"
                            /> */}
                            <View className='ml-3 flex-1'>
                                <Heading size="lg" className="mb-1">
                                    {item.title}
                                </Heading>
                                <Text
                                    size="sm"
                                    className='color-gray-400'
                                    style={{ flexWrap: 'wrap' }}
                                >
                                    {item.location}
                                </Text>
                                <Text size="sm" className='color-gray-400'>{item.date}</Text>
                                <Link>
                                    <Text
                                        size="lg"
                                        className='color-red-600'
                                        onPress={() => handleCardPress(item.id)}
                                    >
                                        Cek Selengkapnya <FontAwesome6 name="arrow-right-from-bracket" size={15} />
                                    </Text>
                                </Link>
                            </View>
                        </View>
                    </Card>
                ))}
            </ScrollView>

            <AlertDialog
                isOpen={showAlertDialog}
                onClose={() => setShowAlertDialog(false)}
                size="md"
            >
                <AlertDialogBackdrop />
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <Heading className="text-typography-950 font-semibold" size="md">
                            {selectedData?.nama_sungai}
                        </Heading>
                    </AlertDialogHeader>
                    <AlertDialogBody className="mt-3 mb-4">
                        <Text size="sm">
                            Alamat: {selectedData?.alamat}
                        </Text>
                        <Text size="sm" className="mt-2">
                            Tanggal: {selectedData && new Date(selectedData.tanggal).toLocaleDateString('en-ID', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </Text>
                        <Text size="sm" className="mt-2">
                            Latitude: {selectedData?.lat}
                        </Text>
                        <Text size="sm" className="mt-2">
                            Longitude: {selectedData?.lon}
                        </Text>
                    </AlertDialogBody>
                    <AlertDialogFooter className="">
                        <CustomButton
                            variant="outline"
                            action="secondary"
                            onPress={() => setShowAlertDialog(false)}
                            size="sm"
                        >
                            <ButtonText>Tutup</ButtonText>
                        </CustomButton>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <View style={{ height: 70 }}></View>
        </View >
    );
};

export default AnalysisScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    searchBox: {
        position: 'absolute',
        top: 6,
        width: '90%',
        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
        zIndex: 0,
    },
    inputContainer: {
        padding: 2,
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    input: {
        flex: 1,
        // height: 40,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderColor: '#ccc',
        borderWidth: 1,
        padding: 5,
    },
    clearButton: {
        marginLeft: 8,
        marginRight: 5,
    },
    suggestions: {
        backgroundColor: 'white',
        marginTop: 5,
        borderRadius: 8,
        padding: 5,
    },
    suggestionText: {
        padding: 10,
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
    },
    scrollViewContainer: {
        paddingTop: 80, // Memberikan padding di atas untuk mencegah konten tertutup oleh search bar
        paddingBottom: 20, // Menambahkan ruang bawah agar lebih nyaman scrollnya
    },
});