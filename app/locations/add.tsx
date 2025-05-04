import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
    Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, Link } from 'expo-router';
import { createLocation } from '@/utils/api';
import { useToast } from "@/components/ui/toast";
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { LeafletView } from 'react-native-leaflet-view';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

const { width } = Dimensions.get('window');

// Default map center - Indonesia
const DEFAULT_LATITUDE = -6.200000;
const DEFAULT_LONGITUDE = 106.816666;

export default function AddLocationScreen() {
    const [formData, setFormData] = useState({
        nama_sungai: '',
        alamat: '',
        lat: '',
        lon: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [mapLoading, setMapLoading] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    const [webViewContent, setWebViewContent] = useState<string | null>(null);
    const [markerPosition, setMarkerPosition] = useState({
        lat: DEFAULT_LATITUDE,
        lng: DEFAULT_LONGITUDE
    });
    const [mapCenterPosition, setMapCenterPosition] = useState({
        lat: DEFAULT_LATITUDE,
        lng: DEFAULT_LONGITUDE
    });
    const [searchingAddress, setSearchingAddress] = useState(false);
    const leafletRef = useRef(null);

    const toast = useToast();

    // Load the HTML content for Expo
    useEffect(() => {
        const loadHtml = async () => {
            try {
                setMapLoading(true);
                const path = require("../../assets/custom-leaflet.html");
                console.log("Loading custom-leaflet.html:", path);
                const asset = Asset.fromModule(path);
                await asset.downloadAsync();
                console.log("Asset downloaded successfully:", asset.localUri);
                const htmlContent = await FileSystem.readAsStringAsync(asset.localUri!);
                console.log("HTML loaded, length:", htmlContent.length);
                setWebViewContent(htmlContent);
                setMapLoading(false);
            } catch (error) {
                console.error('Error loading HTML:', error);
                Alert.alert('Error loading HTML', JSON.stringify(error));
                setMapLoading(false);
                toast.show({
                    placement: 'top',
                    render: () => (
                        <Toast action="error">
                            <ToastTitle>Error</ToastTitle>
                            <ToastDescription>Gagal memuat peta. Pastikan file custom-leaflet.html ada di folder assets.</ToastDescription>
                        </Toast>
                    )
                });
            }
        };

        loadHtml();
    }, []);

    // Get current location on load
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    toast.show({
                        placement: 'top',
                        render: () => (
                            <Toast action="warning">
                                <ToastTitle>Izin Lokasi Ditolak</ToastTitle>
                                <ToastDescription>Tidak dapat mengakses lokasi Anda</ToastDescription>
                            </Toast>
                        )
                    });
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;

                const newPos = {
                    lat: latitude,
                    lng: longitude
                };

                setMarkerPosition(newPos);
                setMapCenterPosition(newPos);

                // Get address for this location
                await fetchAddress(latitude, longitude);

            } catch (error) {
                console.log('Error getting location:', error);
            }
        })();
    }, []);

    // Fetch address from coordinates
    const fetchAddress = async (latitude: number, longitude: number) => {
        try {
            setSearchingAddress(true);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                {
                    headers: {
                        'User-Agent': 'WaterSensorApp/1.0'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch address');
            }

            const data = await response.json();

            if (data.display_name) {
                setFormData(prev => ({
                    ...prev,
                    id_lokasi: Math.floor(Math.random() * 10000000),
                    alamat: data.display_name,
                    lat: latitude.toString(),
                    lon: longitude.toString()
                }));
            }
        } catch (error) {
            console.error('Error fetching address:', error);
            // Still update coordinates even if address lookup fails
            setFormData(prev => ({
                ...prev,
                lat: latitude.toString(),
                lon: longitude.toString()
            }));
        } finally {
            setSearchingAddress(false);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.nama_sungai.trim()) {
            newErrors.nama_sungai = 'Nama sungai tidak boleh kosong';
        }

        if (!formData.alamat.trim()) {
            newErrors.alamat = 'Alamat tidak boleh kosong';
        }

        if (!formData.lat.trim()) {
            newErrors.lat = 'Latitude tidak boleh kosong';
        } else if (isNaN(Number(formData.lat))) {
            newErrors.lat = 'Latitude harus berupa angka';
        }

        if (!formData.lon.trim()) {
            newErrors.lon = 'Longitude tidak boleh kosong';
        } else if (isNaN(Number(formData.lon))) {
            newErrors.lon = 'Longitude harus berupa angka';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const locationData = {
                ...formData,
                tanggal: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            };

            await createLocation(locationData);

            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="success">
                        <ToastTitle>Berhasil</ToastTitle>
                        <ToastDescription>Lokasi berhasil ditambahkan</ToastDescription>
                    </Toast>
                )
            });

            // @ts-ignore - Ignoring TypeScript errors for navigation paths
            router.replace('/locations');
        } catch (error) {
            console.error('Error creating location:', error);
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="error">
                        <ToastTitle>Error</ToastTitle>
                        <ToastDescription>Gagal menambahkan lokasi</ToastDescription>
                    </Toast>
                )
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
        // Clear error when user types
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }

        // If lat or lon is changed, update marker position
        if ((name === 'lat' || name === 'lon') && !isNaN(Number(value))) {
            if (name === 'lat' && formData.lon && !isNaN(Number(formData.lon))) {
                const newPos = {
                    lat: Number(value),
                    lng: Number(formData.lon),
                };
                setMarkerPosition(newPos);
                setMapCenterPosition(newPos);

                // Update marker on map
                updateMarkerOnMap(newPos);
            } else if (name === 'lon' && formData.lat && !isNaN(Number(formData.lat))) {
                const newPos = {
                    lat: Number(formData.lat),
                    lng: Number(value),
                };
                setMarkerPosition(newPos);
                setMapCenterPosition(newPos);

                // Update marker on map
                updateMarkerOnMap(newPos);
            }
        }
    };

    // Fungsi untuk mengirim pesan ke peta untuk mengupdate marker
    const updateMarkerOnMap = (position) => {
        if (leafletRef.current) {
            const message = {
                type: 'updateMarker',
                payload: {
                    position: position
                }
            };

            try {
                console.log('Mengirim pesan ke WebView:', message);
                if (leafletRef.current.injectJavaScript) {
                    const jsCode = `
                        try {
                            window.handleMessage('${JSON.stringify(message)}');
                            true;
                        } catch(err) {
                            console.error('Error injecting JS: ' + err);
                            false;
                        }
                    `;
                    leafletRef.current.injectJavaScript(jsCode);
                }
            } catch (error) {
                console.error('Error mengirim pesan ke peta:', error);
            }
        }
    };

    // Handle getting current location
    const handleGetCurrentLocation = async () => {
        try {
            setLocationLoading(true);

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                toast.show({
                    placement: 'top',
                    render: () => (
                        <Toast action="warning">
                            <ToastTitle>Izin Lokasi Ditolak</ToastTitle>
                            <ToastDescription>Tidak dapat mengakses lokasi Anda</ToastDescription>
                        </Toast>
                    )
                });
                setLocationLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            const newPos = {
                lat: latitude,
                lng: longitude
            };

            // Update state
            setMarkerPosition(newPos);
            setMapCenterPosition(newPos);

            // Update marker on map
            updateMarkerOnMap(newPos);

            // Get address
            await fetchAddress(latitude, longitude);
        } catch (error) {
            console.error('Error getting current location:', error);
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="error">
                        <ToastTitle>Error</ToastTitle>
                        <ToastDescription>Gagal mendapatkan lokasi Anda</ToastDescription>
                    </Toast>
                )
            });
        } finally {
            setLocationLoading(false);
        }
    };

    // Handle map events from Leaflet
    const handleMessageReceived = async (message: any) => {
        console.log('Pesan dari peta:', JSON.stringify(message));

        try {
            // Cek jika ada pesan dari map click
            if (message && message.event === 'onMapClicked') {
                console.log('Peta di klik, koordinat:', message.payload);

                // Pastikan payload dan latlng ada
                if (message.payload && message.payload.latlng) {
                    const { lat, lng } = message.payload.latlng;

                    console.log(`Koordinat yang di klik: ${lat}, ${lng}`);

                    // Update marker position di state
                    setMarkerPosition({
                        lat: lat,
                        lng: lng
                    });

                    setMapCenterPosition({
                        lat: lat,
                        lng: lng
                    });

                    // Ambil alamat berdasarkan koordinat dan isi form
                    await fetchAddress(lat, lng);
                }
            } else if (message && message.event === 'onMapLoaded') {
                console.log('Peta berhasil dimuat');
                setMapLoading(false);
            }
        } catch (error) {
            console.error('Error menangani pesan peta:', error);
        }
    };

    if (!webViewContent && !mapLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Memuat peta...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <View style={styles.header}>
                <Link href={{
                    // @ts-ignore - Ignoring TypeScript errors for navigation paths
                    pathname: '/locations',
                }} asChild>
                    <TouchableOpacity style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                </Link>
                <Text style={styles.screenTitle}>Tambah Lokasi</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                {/* Map Selection View */}
                <View style={styles.mapContainer}>
                    <Text style={[styles.label, { marginBottom: 8 }]}>
                        Pilih Lokasi di Peta
                    </Text>
                </View>

                <View style={styles.mapOuterContainer}>
                    <View style={styles.leafletContainer}>
                        {mapLoading ? (
                            <View style={styles.mapLoading}>
                                <ActivityIndicator size="large" color="#3b82f6" />
                                <Text style={styles.mapLoadingText}>Memuat peta...</Text>
                            </View>
                        ) : (
                            <>
                                {webViewContent && (
                                    <View style={{ width: '100%', height: '100%' }}>
                                        <WebView
                                            ref={leafletRef}
                                            source={{ html: webViewContent }}
                                            onMessage={(event) => {
                                                const data = event.nativeEvent.data;
                                                try {
                                                    const message = JSON.parse(data);
                                                    handleMessageReceived(message);
                                                } catch (error) {
                                                    console.error('Error parsing WebView message:', error);
                                                }
                                            }}
                                            style={{ flex: 1 }}
                                            javaScriptEnabled={true}
                                            domStorageEnabled={true}
                                            scrollEnabled={false}
                                            bounces={false}
                                            startInLoadingState={true}
                                            renderLoading={() => (
                                                <View style={styles.mapLoading}>
                                                    <ActivityIndicator size="large" color="#3b82f6" />
                                                    <Text style={styles.mapLoadingText}>Memuat peta...</Text>
                                                </View>
                                            )}
                                        />
                                    </View>
                                )}

                                {locationLoading && (
                                    <View style={styles.mapOverlay}>
                                        <ActivityIndicator size="large" color="#ffffff" />
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.myLocationButton}
                                    onPress={handleGetCurrentLocation}
                                    disabled={locationLoading}
                                >
                                    {locationLoading ? (
                                        <ActivityIndicator size="small" color="#3b82f6" />
                                    ) : (
                                        <MaterialIcons name="my-location" size={24} color="#3b82f6" />
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <Text style={styles.helperText}>
                        <Ionicons name="information-circle" size={14} color="#64748b" /> Tap pada peta untuk memilih lokasi, gunakan tombol <MaterialIcons name="my-location" size={14} color="#64748b" /> untuk menggunakan lokasi saat ini, atau gunakan fitur pencarian di peta. Koordinat dan alamat akan terisi otomatis.
                    </Text>
                </View>

                <ScrollView
                    style={styles.formScrollView}
                    contentContainerStyle={styles.formScrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nama Sungai</Text>
                        <TextInput
                            style={[styles.input, errors.nama_sungai ? styles.inputError : null]}
                            placeholder="Masukkan nama sungai"
                            value={formData.nama_sungai}
                            onChangeText={(value) => handleChange('nama_sungai', value)}
                        />
                        {errors.nama_sungai ? (
                            <Text style={styles.errorText}>{errors.nama_sungai}</Text>
                        ) : null}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Alamat</Text>
                        {searchingAddress ? (
                            <View style={[styles.input, styles.textArea, styles.loadingInput]}>
                                <ActivityIndicator size="small" color="#3b82f6" />
                                <Text style={styles.loadingText}>Mencari alamat...</Text>
                            </View>
                        ) : (
                            <TextInput
                                style={[styles.input, styles.textArea, errors.alamat ? styles.inputError : null]}
                                placeholder="Masukkan alamat lokasi"
                                multiline
                                numberOfLines={3}
                                value={formData.alamat}
                                onChangeText={(value) => handleChange('alamat', value)}
                            />
                        )}
                        {errors.alamat ? (
                            <Text style={styles.errorText}>{errors.alamat}</Text>
                        ) : null}
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Latitude</Text>
                            <TextInput
                                style={[styles.input, errors.lat ? styles.inputError : null]}
                                placeholder="-6.3598..."
                                keyboardType="numeric"
                                value={formData.lat}
                                onChangeText={(value) => handleChange('lat', value)}
                            />
                            {errors.lat ? (
                                <Text style={styles.errorText}>{errors.lat}</Text>
                            ) : null}
                        </View>

                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Longitude</Text>
                            <TextInput
                                style={[styles.input, errors.lon ? styles.inputError : null]}
                                placeholder="106.7335..."
                                keyboardType="numeric"
                                value={formData.lon}
                                onChangeText={(value) => handleChange('lon', value)}
                            />
                            {errors.lon ? (
                                <Text style={styles.errorText}>{errors.lon}</Text>
                            ) : null}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading ? styles.submitButtonDisabled : null]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>Simpan</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 8,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    mapContainer: {
        marginBottom: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    leafletContainer: {
        position: 'relative',
        height: 300,
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
    },
    mapLoading: {
        width: '100%',
        height: 300,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapLoadingText: {
        marginTop: 8,
        color: '#64748b',
    },
    mapHelperText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 8,
        textAlign: 'center',
    },
    myLocationButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 1000,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1e293b',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    loadingInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginLeft: 8,
        color: '#64748b',
    },
    inputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    submitButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 32,
    },
    submitButtonDisabled: {
        backgroundColor: '#93c5fd',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    placeholderMap: {
        width: '100%',
        height: 250,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    helperText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 8,
        textAlign: 'center',
    },
    mapOuterContainer: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    mapWrapper: {
        marginBottom: 20,
        borderRadius: 8,
        overflow: 'hidden',
    },
    formScrollView: {
        flex: 1,
    },
    formScrollContainer: {
        paddingBottom: 32,
    },
    mapOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
}); 