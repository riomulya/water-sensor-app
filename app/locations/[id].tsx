import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Link } from 'expo-router';
import { getLocationById, updateLocation, Location } from '@/utils/api';
import { useToast } from "@/components/ui/toast";
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";

export default function EditLocationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [location, setLocation] = useState<Location | null>(null);
    const [formData, setFormData] = useState({
        nama_sungai: '',
        alamat: '',
        lat: '',
        lon: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const toast = useToast();

    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                if (!id) return;

                const data = await getLocationById(Number(id));
                setLocation(data);

                setFormData({
                    nama_sungai: data.nama_sungai,
                    alamat: data.alamat,
                    lat: data.lat,
                    lon: data.lon,
                });
            } catch (error) {
                console.error('Error fetching location:', error);
                toast.show({
                    placement: 'top',
                    render: () => (
                        <Toast action="error">
                            <ToastTitle>Error</ToastTitle>
                            <ToastDescription>Gagal memuat data lokasi</ToastDescription>
                        </Toast>
                    )
                });
                router.back();
            } finally {
                setFetchLoading(false);
            }
        };

        fetchLocationData();
    }, [id, toast]);

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
        if (!validate() || !id || !location) return;

        setLoading(true);
        try {
            await updateLocation(Number(id), formData);

            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="success">
                        <ToastTitle>Berhasil</ToastTitle>
                        <ToastDescription>Lokasi berhasil diperbarui</ToastDescription>
                    </Toast>
                )
            });
            // @ts-ignore - Ignoring TypeScript errors for navigation paths

            router.replace('/locations');
        } catch (error) {
            console.error('Error updating location:', error);
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="error">
                        <ToastTitle>Error</ToastTitle>
                        <ToastDescription>Gagal memperbarui lokasi</ToastDescription>
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
    };

    if (fetchLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Memuat data lokasi...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Link href={{
                    // @ts-ignore - Ignoring TypeScript errors for navigation paths
                    pathname: '/locations',
                }} asChild>
                    <TouchableOpacity style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                </Link>
                <Text style={styles.screenTitle}>Edit Lokasi</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.locationInfo}>
                    <Text style={styles.locationId}>ID: {id}</Text>
                    {location && (
                        <Text style={styles.locationDate}>
                            Dibuat: {new Date(location.tanggal).toLocaleDateString()}
                        </Text>
                    )}
                </View>

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
                    <TextInput
                        style={[styles.input, styles.textArea, errors.alamat ? styles.inputError : null]}
                        placeholder="Masukkan alamat lokasi"
                        multiline
                        numberOfLines={3}
                        value={formData.alamat}
                        onChangeText={(value) => handleChange('alamat', value)}
                    />
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
                        <Text style={styles.submitButtonText}>Perbarui</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
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
    },
    scrollContent: {
        padding: 16,
    },
    locationInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
    },
    locationId: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    locationDate: {
        fontSize: 14,
        color: '#64748b',
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
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#64748b',
    },
}); 