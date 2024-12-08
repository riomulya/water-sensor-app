import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Alert, TextInput, FlatList, TouchableOpacity, SafeAreaView, Button } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { Marker } from 'react-native-maps'; // Import Marker
import { BottomSheet, BottomSheetBackdrop, BottomSheetContent, BottomSheetDragIndicator, BottomSheetPortal, BottomSheetTrigger } from '@/components/ui/bottomsheet';
import Donut from '@/components/Donut';
import RealTimeClock from '@/components/RealTimeClock';
import { Fab, FabIcon, FabLabel } from '@/components/ui/fab';
import Map from '@/components/map/Map';
import * as Location from 'expo-location';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse?";

const data = [{
    percentage: 8,
    color: 'tomato',
    max: 10
}, {
    percentage: 8,
    color: 'tomato',
    max: 10
}, {
    percentage: 8,
    color: 'tomato',
    max: 10
}, {
    percentage: 8,
    color: 'tomato',
    max: 10
}, {
    percentage: 8,
    color: 'tomato',
    max: 10
}, {
    percentage: 8,
    color: 'tomato',
    max: 10
},]


const HomeScreen = () => {
    const [destination, setDestination] = useState<{ latitude: number, longitude: number } | null>(null); // Untuk marker destinasi
    const [address, setAddress] = useState<string | null>(null); // Untuk menyimpan alamat lengkap

    // Fungsi untuk melakukan reverse geocoding (mengambil alamat dari lat dan lon)
    const fetchAddressFromCoordinates = async (latitude: number, longitude: number) => {
        try {
            const response = await fetch(
                `${NOMINATIM_REVERSE_URL}lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
            );
            const data = await response.json();
            if (data && data.display_name) {
                setAddress(data.display_name);  // Ambil alamat dari "display_name"
            } else {
                setAddress("Alamat tidak ditemukan");
            }
        } catch (error) {
            setAddress("Gagal memuat alamat");
        }
    };

    // Event handler untuk klik di peta
    const handleMapPress = (coordinates: [number, number]) => {
        const latitude = coordinates[0];
        const longitude = coordinates[1];
        setDestination({ latitude, longitude });
        fetchAddressFromCoordinates(latitude, longitude);

        Alert.alert("Destinasi Dipilih", `Alamat: ${address}, Lat: ${latitude}, Long: ${longitude}`);
    };

    const zoomToGeoJSONFuncRef = useRef<() => void>();

    const getCurrentLocationFuncRef = useRef<() => void>();

    return (
        <>
            <SafeAreaView style={styles.container}>
                <Map
                    onInitialized={(zoomToGeoJSON) =>
                        (zoomToGeoJSONFuncRef.current = zoomToGeoJSON)
                    }
                    onMapPress={handleMapPress}
                    onGetCurrentLocation={(getCurrentLocationFunc) =>
                        (getCurrentLocationFuncRef.current = getCurrentLocationFunc)
                    }
                />
            </SafeAreaView>
            <Fab
                size="sm"
                isHovered={false}
                isDisabled={false}
                isPressed={true}
                onPress={() => getCurrentLocationFuncRef.current?.()}
                placement='bottom left'
                style={{
                    position: 'absolute', // FAB menjadi elemen absolut di layar
                    bottom: 120,           // Jarak dari bagian bawah layar
                    left: 25,            // Jarak dari sisi kiri layar
                    zIndex: 0,           // Memastikan FAB berada di atas elemen lain
                }}
            >
                <AntDesign name="home" size={35} color="#ea5757" />
            </Fab>
            <BottomSheet>
                <Fab
                    size="sm"
                    isHovered={false}
                    isDisabled={false}
                    isPressed={true}
                    style={{
                        position: 'absolute', // FAB menjadi elemen absolut di layar
                        bottom: 120,           // Jarak dari bagian bawah layar
                        right: 25,            // Jarak dari sisi kanan layar
                        zIndex: 0,           // Memastikan FAB berada di atas elemen lain
                    }}
                >
                    <BottomSheetTrigger>
                        <AntDesign name="piechart" size={35} color="#ea5757" />
                    </BottomSheetTrigger>
                </Fab>

                <BottomSheetPortal
                    snapPoints={["50%", "70%", "100%"]}
                    backdropComponent={BottomSheetBackdrop}
                    handleComponent={BottomSheetDragIndicator}
                >
                    <RealTimeClock />
                    <BottomSheetContent>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-evenly',
                            flexWrap: 'wrap',
                        }}>
                            {data.map((p, i) => {
                                // Mengatur ukuran setiap Donut agar sesuai dengan layout 2 kolom x 3 baris
                                return (
                                    <View key={i} style={{
                                        width: '50%',
                                        marginBottom: 40,
                                        alignItems: 'center'
                                    }}>
                                        <Donut
                                            percentage={p.percentage}
                                            color={p.color}
                                            delay={500 + 100 * i}
                                            max={p.max}
                                            suffix='pH'
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </BottomSheetContent>
                </BottomSheetPortal>
            </BottomSheet >
        </>
    );
};

export default HomeScreen;

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
        width: '70%',
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
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    input: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderColor: '#ccc',
        borderWidth: 1,
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
});