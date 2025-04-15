import { View, StyleSheet, ScrollView, TextInput, Modal, Button, Pressable, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';
import { InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

import { Button as CustomButton, ButtonText } from "@/components/ui/button";
import { useRouter } from 'expo-router';
import { port } from '@/constants/https';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// import { InputField as TextInput } from '@/components/ui/input';
// import { Input, InputField } from '@gluestack-ui/themed';

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
    const router = useRouter();
    const [data, setData] = useState<FormattedLocation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPressed, setIsPressed] = useState(false);

    const filteredData = data.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCardPress = (id: number) => {
        console.log('Navigating to DetailLocationScreen with id:', id);
        router.push({
            pathname: "/detail/DetailLocationScreen",
            params: { id: id.toString() }
        });
    };

    useEffect(() => {
        fetch(`${port}data_lokasi`)
            .then(response => response.json())
            .then((apiData: ApiLocation[]) => {
                const formattedData: FormattedLocation[] = apiData.map(item => ({
                    id: item.id_lokasi,
                    title: item.nama_sungai,
                    location: item.alamat,
                    date: new Date(item.tanggal).toLocaleString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    }).replace(/\./g, ':'),
                    image: 'https://via.placeholder.com/150',
                }));
                setData(formattedData);
            });
    }, []);

    return (
        <LinearGradient
            colors={['#f8fafc', '#e0f2ff']}
            style={styles.container}
        >
            <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring' }}
                style={styles.searchContainer}
            >
                <View style={styles.searchInner}>
                    <Ionicons
                        name="search"
                        size={20}
                        color="#3b82f6"
                        style={styles.searchIcon}
                    />
                    <TextInput
                        placeholder="Cari lokasi..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.inputField}
                        cursorColor="#3b82f6"
                    />
                    {searchQuery.length > 0 && (
                        <MotiView
                            from={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={styles.clearButton}
                        >
                            <Pressable
                                onPress={() => setSearchQuery('')}
                                android_ripple={{ color: '#e2e8f0', borderless: true }}
                            >
                                <Ionicons name="close-circle" size={20} color="#94a3b8" />
                            </Pressable>
                        </MotiView>
                    )}
                </View>
            </MotiView>

            <ScrollView
                contentContainerStyle={styles.scrollViewContainer}
                showsVerticalScrollIndicator={false}
            >
                {filteredData.map((item, index) => (
                    <MotiView
                        key={item.id}
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: index * 40 }}
                        style={styles.cardContainer}
                    >
                        <Card style={styles.card}>
                            <Pressable
                                onPress={() => handleCardPress(item.id)}
                                style={styles.pressable}
                                android_ripple={{ color: '#f1f5f9', borderless: false, radius: 16 }}
                            >
                                <MotiView
                                    animate={{ translateX: isPressed ? 2 : 0 }}
                                    transition={{ type: 'spring' }}
                                >
                                    <View style={styles.cardContent}>
                                        <MotiView
                                            style={styles.iconWrapper}
                                            animate={{ rotate: isPressed ? '-3deg' : '0deg' }}
                                        >
                                            <LinearGradient
                                                colors={['#4f46e5', '#6366f1']}
                                                style={styles.gradientIcon}
                                            >
                                                <Ionicons
                                                    name="water"
                                                    size={28}
                                                    color="white"
                                                    style={styles.waterIcon}
                                                />
                                            </LinearGradient>
                                        </MotiView>

                                        <View style={styles.textContainer}>
                                            <Heading
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                                style={styles.title}
                                            >
                                                {item.title}
                                            </Heading>

                                            <View style={styles.infoRow}>
                                                <Ionicons
                                                    name="location-sharp"
                                                    size={16}
                                                    color="#4f46e5"
                                                    style={styles.rowIcon}
                                                />
                                                <Text
                                                    style={styles.locationText}
                                                >
                                                    {item.location}
                                                </Text>
                                            </View>

                                            <View style={styles.infoRow}>
                                                <Ionicons
                                                    name="calendar-sharp"
                                                    size={16}
                                                    color="#4f46e5"
                                                    style={styles.rowIcon}
                                                />
                                                <Text
                                                    style={styles.dateText}
                                                >
                                                    {item.date}
                                                </Text>
                                            </View>

                                            <MotiView
                                                style={styles.ctaContainer}
                                                animate={{
                                                    backgroundColor: isPressed ? '#e0e7ff' : '#eef2ff',
                                                }}
                                            >
                                                <Text style={styles.ctaText}>
                                                    Lihat Detail Analisis
                                                </Text>
                                                <Ionicons
                                                    name="chevron-forward"
                                                    size={16}
                                                    color="#4f46e5"
                                                    style={styles.ctaIcon}
                                                />
                                            </MotiView>
                                        </View>
                                    </View>
                                </MotiView>
                            </Pressable>
                        </Card>
                    </MotiView>
                ))}
                {filteredData.length === 0 && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring' }}
                        style={styles.emptyContainer}
                    >
                        <Ionicons name="water-outline" size={60} color="#d1d5db" />
                        <Text style={styles.emptyText}>Tidak ada data ditemukan</Text>
                    </MotiView>
                )}
            </ScrollView>
            <View style={{ height: 100 }}></View>
        </LinearGradient>
    );
};

export default AnalysisScreen;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 24,
    },
    searchContainer: {
        position: 'absolute',
        top: 16,
        left: 20,
        right: 20,
        zIndex: 10,
        backgroundColor: 'white',
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#1e40af',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.6)',
    },
    searchInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputField: {
        flex: 1,
        color: '#1e293b',
        fontSize: 16,
        paddingLeft: 32,
        paddingRight: 24,
        includeFontPadding: false,
    },
    searchIcon: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    clearButton: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    cardContainer: {
        marginHorizontal: 20,
        marginBottom: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 0,
        shadowColor: '#1e40af',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.7)',
    },
    pressable: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 16,
        elevation: 2,
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    gradientIcon: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waterIcon: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#1e293b',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    rowIcon: {
        width: 20,
        marginRight: 8,
    },
    locationText: {
        color: '#475569',
        fontSize: 14,
        flex: 1,
        marginRight: 8,
        lineHeight: 20,
    },
    dateText: {
        color: '#64748b',
        fontSize: 13,
        flex: 1,
        lineHeight: 19,
    },
    ctaContainer: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    ctaText: {
        color: '#4f46e5',
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: -0.2,
    },
    ctaIcon: {
        marginLeft: 6,
    },
    scrollViewContainer: {
        paddingTop: 80,
        paddingBottom: 20,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 12,
    },
});