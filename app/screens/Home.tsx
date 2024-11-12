import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { Text } from '@/components/ui/text';
import { BottomSheet, BottomSheetBackdrop, BottomSheetContent, BottomSheetDragIndicator, BottomSheetPortal, BottomSheetTrigger } from '@/components/ui/bottomsheet';
import Donut from '@/components/Donut';
import RealTimeClock from '@/components/RealTimeClock';
import { Fab } from '@/components/ui/fab';
import DestinationMarker from '@/components/destination/DestinationMarker';

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse?";

// Tipe lokasi awal
interface LocationType {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

interface NominatimResult {
    place_id: string;
    lat: string;
    lon: string;
    display_name: string;
}

const INITIAL_LOCATION: LocationType = {
    latitude: -6.3580484,
    longitude: 106.6340785,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
};

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

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search?";

const HomeScreen = () => {
    const [location, setLocation] = useState<LocationType>(INITIAL_LOCATION);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [markerLocation, setMarkerLocation] = useState<LocationType | null>(null);
    const [destination, setDestination] = useState<{ latitude: number, longitude: number } | null>(null); // Untuk marker destinasi
    const [address, setAddress] = useState<string | null>(null); // Untuk menyimpan alamat lengkap

    useEffect(() => {
        const getLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        "Izin Lokasi Ditolak",
                        "Menggunakan lokasi default karena izin akses lokasi ditolak."
                    );
                    return;
                }

                const userLocation = await Location.getCurrentPositionAsync({});
                setLocation({
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            } catch (error) {
                Alert.alert(
                    "Kesalahan",
                    "Tidak dapat mengakses lokasi. Menggunakan lokasi default."
                );
            }
        };

        getLocation();
    }, []);

    const fetchSuggestions = async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]); // Minimal 3 karakter untuk mulai mencari
            return;
        }

        try {
            const response = await fetch(
                `${NOMINATIM_BASE_URL}q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=ID`
            );
            const data: NominatimResult[] = await response.json();
            setSuggestions(data);
        } catch (error) {
            Alert.alert("Kesalahan", "Gagal mengambil saran lokasi.");
        }
    };

    const selectSuggestion = (item: NominatimResult) => {
        const { lat, lon, display_name } = item;
        const latNumber = parseFloat(lat);
        const lonNumber = parseFloat(lon);

        setLocation({
            latitude: latNumber,
            longitude: lonNumber,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
        });
        setMarkerLocation({ latitude: latNumber, longitude: lonNumber, latitudeDelta: 0.005, longitudeDelta: 0.005 });
        setSearchQuery(display_name); // Mengisi input dengan alamat lengkap
        setSuggestions([]); // Kosongkan saran setelah dipilih
    };

    const clearSearch = () => {
        setSearchQuery('');  // Kosongkan input
        setSuggestions([]);  // Hapus saran
    };

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
    const handleMapPress = (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        setDestination({ latitude, longitude });
        fetchAddressFromCoordinates(latitude, longitude); // Ambil alamat dari lat dan lon
        Alert.alert("Destinasi Dipilih", `Alamat: ${address}, Lat: ${latitude}, Long: ${longitude}`);
    };

    return (
        <>
            <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                region={location}
                showsUserLocation
                onPress={handleMapPress}
                className='z-0'
            >
                <DestinationMarker destination={destination} address={address} />
            </MapView>

            {/* Input pencarian lokasi dengan tombol X untuk menghapus */}
            <View style={styles.searchBox}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Cari lokasi..."
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            fetchSuggestions(text);
                        }}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                            <AntDesign name="closecircle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
                {suggestions.length > 0 && (
                    <FlatList
                        style={styles.suggestions}
                        data={suggestions}
                        keyExtractor={(item) => item.place_id}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => selectSuggestion(item)}>
                                <Text style={styles.suggestionText}>{item.display_name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
            <BottomSheet>
                <Fab size="sm" placement="top left" isHovered={false} isDisabled={false} isPressed={true} className='z-0 bg-white opacity-90'>
                    <BottomSheetTrigger>
                        <AntDesign name="piechart" size={20} color="#ea5757" />
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
        top: 10,
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