import { View, StyleSheet, ScrollView, TextInput, Modal, Button, Pressable, Dimensions, ActivityIndicator, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { FontAwesome6 } from '@expo/vector-icons';

import { Button as CustomButton, ButtonText } from "@/components/ui/button";
import { useRouter } from 'expo-router';
import { port } from '@/constants/https';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from 'moti/skeleton';
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
    const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(true);
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
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                setIsLoading(false);
            });
    }, []);

    const renderSkeletonLoading = () => {
        const SkeletonCommon = {
            colorMode: 'light' as const,
            transition: {
                type: 'timing' as const,
                duration: 1500,
                loop: true,
            },
            backgroundColor: '#e2e8f0',
            highlightColor: '#f8fafc',
        };

        // Create 4 skeleton items for more realism
        const skeletons = Array(4).fill(0).map((_, index) => (
            <MotiView
                key={`skeleton-${index}`}
                from={{ opacity: 0.7, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: index * 100 }}
                style={styles.cardContainer}
            >
                <Card style={styles.card}>
                    <View style={styles.cardContent}>
                        <Skeleton
                            width={56}
                            height={56}
                            radius={12}
                            {...SkeletonCommon}
                        />

                        <View style={[styles.textContainer, { marginLeft: 16 }]}>
                            <Skeleton
                                width={'85%'}
                                height={20}
                                radius={4}
                                {...SkeletonCommon}
                            />

                            <View style={{ height: 12 }} />

                            <View style={styles.infoRow}>
                                <Skeleton
                                    width={16}
                                    height={16}
                                    radius={8}
                                    {...SkeletonCommon}
                                />
                                <View style={{ width: 8 }} />
                                <Skeleton
                                    width={'70%'}
                                    height={14}
                                    radius={4}
                                    {...SkeletonCommon}
                                />
                            </View>

                            <View style={{ height: 8 }} />

                            <View style={styles.infoRow}>
                                <Skeleton
                                    width={16}
                                    height={16}
                                    radius={8}
                                    {...SkeletonCommon}
                                />
                                <View style={{ width: 8 }} />
                                <Skeleton
                                    width={'50%'}
                                    height={14}
                                    radius={4}
                                    {...SkeletonCommon}
                                />
                            </View>

                            <View style={{ height: 16 }} />

                            <Skeleton
                                width={160}
                                height={34}
                                radius={10}
                                {...SkeletonCommon}
                            />
                        </View>
                    </View>
                </Card>
            </MotiView>
        ));

        return (
            <View>
                {skeletons}
            </View>
        );
    };

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
                {isLoading ? (
                    renderSkeletonLoading()
                ) : filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
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
                                                    colors={['#3b82f6', '#60a5fa']}
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
                                                        color="#3b82f6"
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
                                                        color="#3b82f6"
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
                                                        backgroundColor: isPressed ? '#dbeafe' : '#eff6ff',
                                                    }}
                                                >
                                                    <Text style={styles.ctaText}>
                                                        Lihat Detail Analisis
                                                    </Text>
                                                    <Ionicons
                                                        name="chevron-forward"
                                                        size={16}
                                                        color="#3b82f6"
                                                        style={styles.ctaIcon}
                                                    />
                                                </MotiView>
                                            </View>
                                        </View>
                                    </MotiView>
                                </Pressable>
                            </Card>
                        </MotiView>
                    ))
                ) : (
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
        color: '#3b82f6',
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
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 30,
    },
    loadingGradient: {
        width: '100%',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1e40af',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    loadingContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    loadingText: {
        color: 'white',
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    loadingIcon: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    loadingSpinner: {
        marginVertical: 16,
    },
    skeletonIcon: {
        backgroundColor: '#e2e8f0',
        borderRadius: 12,
    },
    skeletonTitle: {
        height: 24,
        width: '80%',
        backgroundColor: '#e2e8f0',
        borderRadius: 6,
        marginBottom: 16,
    },
    skeletonLocation: {
        height: 16,
        width: '90%',
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
    },
    skeletonDate: {
        height: 16,
        width: '70%',
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
    },
    skeletonCta: {
        height: 36,
        width: 160,
        backgroundColor: '#e2e8f0',
        borderRadius: 10,
        marginTop: 12,
    },
});