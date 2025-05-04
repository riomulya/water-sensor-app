import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, TextInput, Keyboard } from 'react-native';
import { Ionicons, MaterialIcons, AntDesign, Feather } from '@expo/vector-icons';
import { router, Link } from 'expo-router';
import { getLocations, deleteLocation, Location } from '@/utils/api';
import { useToast } from "@/components/ui/toast";
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";

export default function LocationsScreen() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const toast = useToast();

    const fetchLocations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getLocations();
            setLocations(data);
            setFilteredLocations(data);
        } catch (error) {
            console.error('Error fetching locations:', error);
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="error">
                        <ToastTitle>Error</ToastTitle>
                        <ToastDescription>Gagal memuat data lokasi</ToastDescription>
                    </Toast>
                )
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchLocations();
    }, [fetchLocations]);

    // Filter locations based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredLocations(locations);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = locations.filter(location =>
            location.nama_sungai.toLowerCase().includes(query) ||
            location.alamat.toLowerCase().includes(query)
        );

        setFilteredLocations(filtered);
    }, [searchQuery, locations]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setSearchQuery('');
        fetchLocations();
    }, [fetchLocations]);

    const handleEdit = (id: number) => {
        router.navigate({
            pathname: '/locations/[id]',
            params: { id: id.toString() }
        });
    };

    const handleDelete = async (id: number) => {
        Alert.alert(
            "Konfirmasi",
            "Anda yakin ingin menghapus lokasi ini?",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteLocation(id);
                            setLocations(locations.filter(loc => loc.id_lokasi !== id));
                            setFilteredLocations(filteredLocations.filter(loc => loc.id_lokasi !== id));
                            toast.show({
                                placement: 'top',
                                render: () => (
                                    <Toast action="success">
                                        <ToastTitle>Berhasil</ToastTitle>
                                        <ToastDescription>Lokasi berhasil dihapus</ToastDescription>
                                    </Toast>
                                )
                            });
                        } catch (error) {
                            console.error('Error deleting location:', error);
                            toast.show({
                                placement: 'top',
                                render: () => (
                                    <Toast action="error">
                                        <ToastTitle>Error</ToastTitle>
                                        <ToastDescription>Gagal menghapus lokasi</ToastDescription>
                                    </Toast>
                                )
                            });
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        Keyboard.dismiss();
    };

    const renderItem = ({ item }: { item: Location }) => (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>{item.nama_sungai}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleEdit(item.id_lokasi)}
                    >
                        <AntDesign name="edit" size={18} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDelete(item.id_lokasi)}
                    >
                        <AntDesign name="delete" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.address}>{item.alamat}</Text>
            <View style={styles.footer}>
                <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={14} color="#64748b" />
                    <Text style={styles.infoText}>{formatDate(item.tanggal)}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.infoText}>
                        {item.lat.substring(0, 8)}, {item.lon.substring(0, 8)}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.screenTitle}>Lokasi Sensor</Text>
                <Link href="/locations/add" asChild>
                    <TouchableOpacity style={styles.addButton}>
                        <AntDesign name="plus" size={20} color="#fff" />
                    </TouchableOpacity>
                </Link>
            </View>

            <View style={styles.searchContainer}>
                <View style={[
                    styles.searchInputWrapper,
                    searchFocused && styles.searchInputWrapperFocused
                ]}>
                    <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cari lokasi atau alamat..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleClearSearch}
                        >
                            <Ionicons name="close-circle" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <FlatList
                    data={filteredLocations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id_lokasi.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#3b82f6']}
                            tintColor="#3b82f6"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {searchQuery ? (
                                <>
                                    <Feather name="search" size={48} color="#cbd5e1" />
                                    <Text style={styles.emptyText}>Tidak ada hasil ditemukan</Text>
                                    <Text style={styles.emptySubtext}>
                                        Tidak ada lokasi yang cocok dengan "{searchQuery}"
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.resetButton}
                                        onPress={handleClearSearch}
                                    >
                                        <Text style={styles.resetButtonText}>Reset Pencarian</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="location-outline" size={48} color="#cbd5e1" />
                                    <Text style={styles.emptyText}>Tidak ada data lokasi</Text>
                                </>
                            )}
                        </View>
                    }
                />
            )}
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
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    addButton: {
        backgroundColor: '#3b82f6',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4,
    },
    searchContainer: {
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
        height: 42,
    },
    searchInputWrapperFocused: {
        borderColor: '#3b82f6',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: '#1e293b',
    },
    clearButton: {
        padding: 4,
    },
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
    },
    iconButton: {
        padding: 6,
        marginLeft: 8,
    },
    address: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 8,
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 4,
        textAlign: 'center',
    },
    resetButton: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#eff6ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    resetButtonText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '500',
    },
}); 