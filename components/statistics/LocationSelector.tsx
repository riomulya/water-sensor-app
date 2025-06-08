import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, FlatList, Dimensions, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';

// Local components
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import {
    Select, SelectBackdrop, SelectContent, SelectDragIndicator,
    SelectDragIndicatorWrapper, SelectItem, SelectPortal,
    SelectTrigger, SelectInput
} from '@/components/ui/select';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - 32; // Consistent width for all elements

// Types
interface Location {
    id_lokasi: string;
    nama_sungai: string;
    latitude?: number;
    longitude?: number;
    lat?: string;
    lon?: string;
    created_at?: string;
    tanggal?: string;
    alamat?: string;
}

interface LocationSelectorProps {
    locations: Location[];
    selectedLocation: string | null;
    onLocationChange: (locationId: string) => void;
}

interface FormData {
    searchText: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
    locations,
    selectedLocation,
    onLocationChange
}) => {
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

    // React Hook Form setup
    const { control, watch, reset, setValue } = useForm<FormData>({
        defaultValues: {
            searchText: ''
        },
        mode: 'onChange'  // Validate on change for immediate feedback
    });

    // Watch the search text value from the form
    const searchText = watch('searchText');

    // Initialize with all locations
    useEffect(() => {
        setFilteredLocations(locations);
    }, [locations]);

    // Filter locations when search text changes
    useEffect(() => {
        if (!searchText || searchText.trim() === '') {
            setFilteredLocations(locations);
        } else {
            const searchLower = searchText.toLowerCase();
            const filtered = locations.filter(location =>
                location.nama_sungai.toLowerCase().includes(searchLower) ||
                (location.alamat && location.alamat.toLowerCase().includes(searchLower))
            );
            setFilteredLocations(filtered);
        }
    }, [locations, searchText]);

    // Clear search and reset
    const clearSearch = useCallback(() => {
        reset({ searchText: '' });
        setFilteredLocations(locations);
    }, [locations, reset]);

    // Get the selected location object
    const selectedLocationData = locations.find(loc => loc.id_lokasi === selectedLocation);

    // Handle location selection
    const handleSelectLocation = useCallback((locationId: string) => {
        onLocationChange(locationId);
        clearSearch(); // Clear search when location is selected
    }, [onLocationChange, clearSearch]);

    return (
        <MotiView
            style={styles.container}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
        >
            <View style={styles.headerRow}>
                <MaterialIcons name="location-on" size={24} color="#3b82f6" />
                <Text size="md" bold style={styles.headerText}>
                    Lokasi Sensor
                </Text>
            </View>

            {locations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text size="sm" style={styles.emptyText}>
                        Tidak ada lokasi tersedia
                    </Text>
                </View>
            ) : (
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 400, delay: 200 }}
                >
                    <Select
                        selectedValue={selectedLocation || undefined}
                        onValueChange={handleSelectLocation}
                        accessibilityLabel="Pilih lokasi"
                        placeholder="Pilih lokasi"
                    >
                        <SelectTrigger
                            variant="outline"
                            size="md"
                            style={styles.selectTrigger}
                        >
                            <Box style={styles.selectTriggerContent}>
                                <MaterialIcons name="place" size={24} color="#3b82f6" style={styles.triggerIcon} />
                                <SelectInput
                                    placeholder="Pilih lokasi"
                                    style={styles.selectInput}
                                />
                                <MaterialIcons name="keyboard-arrow-down" size={28} color="#64748b" />
                            </Box>
                        </SelectTrigger>
                        <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent style={styles.selectContent}>
                                <SelectDragIndicatorWrapper style={styles.dragIndicatorWrapper}>
                                    <SelectDragIndicator style={styles.dragIndicator} />
                                </SelectDragIndicatorWrapper>

                                <View style={styles.sheetHeader}>
                                    <Text size="lg" bold style={styles.sheetTitle}>
                                        Pilih Lokasi Sensor
                                    </Text>
                                    <Text size="xs" style={styles.sheetSubtitle}>
                                        {filteredLocations.length} lokasi tersedia
                                    </Text>
                                </View>

                                {/* Search Box with React Hook Form */}
                                <View style={styles.searchContainer}>
                                    <View style={[
                                        styles.searchInputWrapper,
                                        isSearchFocused && styles.searchInputWrapperFocused
                                    ]}>
                                        <MaterialIcons name="search" size={26} color="#3b82f6" />
                                        <Controller
                                            control={control}
                                            name="searchText"
                                            render={({ field: { onChange, value, onBlur } }) => (
                                                <TextInput
                                                    style={styles.searchInput}
                                                    placeholder="Cari lokasi..."
                                                    placeholderTextColor="#94a3b8"
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onFocus={() => setIsSearchFocused(true)}
                                                    onBlur={() => {
                                                        setIsSearchFocused(false);
                                                        onBlur();
                                                    }}
                                                    autoCapitalize="none"
                                                    autoCorrect={false}
                                                    returnKeyType="search"
                                                    clearButtonMode="while-editing"
                                                    maxLength={50}
                                                />
                                            )}
                                        />
                                        {searchText?.length > 0 && (
                                            <TouchableOpacity
                                                style={styles.clearButton}
                                                onPress={clearSearch}
                                                activeOpacity={0.7}
                                                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                                            >
                                                <MaterialIcons name="close" size={20} color="white" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {filteredLocations.length === 0 ? (
                                    <View style={styles.noResultsContainer}>
                                        <MaterialIcons name="search-off" size={48} color="#94a3b8" />
                                        <Text size="sm" style={styles.noResultsText}>
                                            Tidak ada lokasi yang ditemukan
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.locationsListContainer}>
                                        <FlatList
                                            data={filteredLocations}
                                            keyExtractor={(item) => item.id_lokasi}
                                            style={styles.locationList}
                                            contentContainerStyle={styles.locationListContent}
                                            showsVerticalScrollIndicator={false}
                                            initialNumToRender={8}
                                            maxToRenderPerBatch={10}
                                            windowSize={10}
                                            removeClippedSubviews={true}
                                            keyboardShouldPersistTaps="handled"
                                            keyboardDismissMode="on-drag"
                                            renderItem={({ item, index }) => {
                                                const isSelected = selectedLocation === item.id_lokasi;

                                                return (
                                                    <Animated.View
                                                        entering={SlideInRight.delay(index * 50).springify()}
                                                        style={styles.locationItemWrapper}
                                                    >
                                                        <Pressable
                                                            style={({ pressed }) => [
                                                                pressed && styles.locationItemPressed
                                                            ]}
                                                            onPress={() => onLocationChange(item.id_lokasi)}
                                                            android_ripple={{ color: '#e0e7ff', borderless: false }}
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.locationItem,
                                                                    isSelected && styles.selectedLocationItem
                                                                ]}
                                                            >
                                                                {isSelected && (
                                                                    <LinearGradient
                                                                        colors={['rgba(59, 130, 246, 0.08)', 'rgba(59, 130, 246, 0.03)']}
                                                                        style={styles.selectedGradient}
                                                                        start={{ x: 0, y: 0 }}
                                                                        end={{ x: 1, y: 1 }}
                                                                    />
                                                                )}

                                                                <View style={styles.locationItemContent}>
                                                                    <View style={[
                                                                        styles.locationItemIcon,
                                                                        isSelected && styles.selectedLocationItemIcon
                                                                    ]}>
                                                                        <MaterialIcons
                                                                            name={isSelected ? "location-on" : "place"}
                                                                            size={20}
                                                                            color={isSelected ? "white" : "#64748b"}
                                                                        />
                                                                    </View>

                                                                    <View style={styles.locationItemTextContainer}>
                                                                        <Text
                                                                            size="md"
                                                                            style={[
                                                                                styles.locationItemText,
                                                                                isSelected && styles.selectedLocationItemText
                                                                            ]}
                                                                            numberOfLines={1}
                                                                        >
                                                                            {item.nama_sungai}
                                                                        </Text>

                                                                        {item.alamat && (
                                                                            <View style={styles.addressAndCoordinateContainer}>
                                                                                <View style={styles.locationMicroIcon}>
                                                                                    <MaterialIcons name="place" size={12} color="#94a3b8" />
                                                                                </View>
                                                                                <Text
                                                                                    size="xs"
                                                                                    style={styles.locationItemAddress}
                                                                                    numberOfLines={1}
                                                                                >
                                                                                    {item.alamat}
                                                                                </Text>
                                                                            </View>
                                                                        )}

                                                                        {(item.lat && item.lon) && (
                                                                            <View style={styles.locationCoordsContainer}>
                                                                                <View style={styles.locationMicroIcon}>
                                                                                    <MaterialIcons name="my-location" size={12} color="#94a3b8" />
                                                                                </View>

                                                                                <View style={styles.coordsVerticalContainer}>
                                                                                    <Text size="xs" style={styles.coordText}>
                                                                                        <Text style={styles.coordLabel}>Lat: </Text>
                                                                                        <Text>{item.lat}</Text>
                                                                                    </Text>
                                                                                    <Text size="xs" style={styles.coordText}>
                                                                                        <Text style={styles.coordLabel}>Lon: </Text>
                                                                                        <Text>{item.lon}</Text>
                                                                                    </Text>
                                                                                </View>
                                                                            </View>
                                                                        )}
                                                                    </View>

                                                                    {isSelected && (
                                                                        <View style={styles.checkmarkContainer}>
                                                                            <LinearGradient
                                                                                colors={['#3b82f6', '#60a5fa']}
                                                                                style={styles.checkmarkBg}
                                                                                start={{ x: 0, y: 0 }}
                                                                                end={{ x: 1, y: 1 }}
                                                                            >
                                                                                <MaterialIcons name="check" size={18} color="white" />
                                                                            </LinearGradient>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </Pressable>
                                                    </Animated.View>
                                                );
                                            }}
                                        />
                                    </View>
                                )}
                            </SelectContent>
                        </SelectPortal>
                    </Select>

                    {selectedLocation && selectedLocationData && (
                        <MotiView
                            style={styles.locationDetails}
                            from={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ type: 'timing', duration: 300, delay: 300 }}
                        >
                            <View style={styles.locationCard}>
                                <LinearGradient
                                    colors={['rgba(59, 130, 246, 0.08)', 'rgba(224, 242, 254, 0.6)']}
                                    style={styles.detailsGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />

                                <View style={styles.locationHeader}>
                                    <LinearGradient
                                        colors={['#3b82f6', '#60a5fa']}
                                        style={styles.locationIconContainer}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <MaterialIcons name="pin-drop" size={20} color="white" />
                                    </LinearGradient>
                                    <Text size="md" bold style={styles.locationName}>
                                        {selectedLocationData.nama_sungai}
                                    </Text>
                                </View>

                                {selectedLocationData.alamat && (
                                    <View style={styles.locationAddressContainer}>
                                        <MaterialIcons name="place" size={16} color="#64748b" style={styles.addressIcon} />
                                        <Text size="xs" style={styles.locationAddress}>
                                            {selectedLocationData.alamat}
                                        </Text>
                                    </View>
                                )}

                                {(selectedLocationData.lat && selectedLocationData.lon) && (
                                    <View style={styles.detailCoordsContainer}>
                                        <View style={styles.coordBoxVertical}>
                                            <Text size="xs" bold style={styles.coordBoxLabel}>Koordinat:</Text>
                                            <View style={styles.coordBoxRow}>
                                                <Text size="xs" style={styles.coordBoxLabelInner}>Lat:</Text>
                                                <Text size="xs" style={styles.coordBoxValue}>{selectedLocationData.lat}</Text>
                                            </View>
                                            <View style={styles.coordBoxRow}>
                                                <Text size="xs" style={styles.coordBoxLabelInner}>Lon:</Text>
                                                <Text size="xs" style={styles.coordBoxValue}>{selectedLocationData.lon}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </MotiView>
                    )}
                </MotiView>
            )}
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 16,
        zIndex: 10, // Ensure dropdown appears above other elements
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerText: {
        marginLeft: 8,
        color: '#334155',
    },
    emptyContainer: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 12,
    },
    emptyText: {
        color: '#64748b',
    },
    selectTrigger: {
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        height: 58,
    },
    selectTriggerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        paddingHorizontal: 12,
    },
    triggerIcon: {
        marginRight: 12,
    },
    selectInput: {
        color: '#334155',
        fontWeight: '500',
        flex: 1,
        fontSize: 16,
    },
    selectContent: {
        maxHeight: 600,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: 32,
        zIndex: 1000,
        backgroundColor: 'white',
    },
    dragIndicatorWrapper: {
        paddingVertical: 12,
    },
    dragIndicator: {
        backgroundColor: '#cbd5e1',
        width: 40,
        height: 5,
    },
    sheetHeader: {
        alignItems: 'center',
        marginBottom: 8,
    },
    sheetTitle: {
        color: '#334155',
        textAlign: 'center',
    },
    sheetSubtitle: {
        color: '#64748b',
        marginTop: 4,
        textAlign: 'center',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        borderRadius: 14,
        height: 64,
        borderWidth: 2,
        borderColor: '#f1f5f9',
        width: CONTENT_WIDTH,
        alignSelf: 'center',
    },
    searchInputWrapperFocused: {
        borderColor: '#93c5fd',
        backgroundColor: 'white',
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 12,
        color: '#334155',
        fontSize: 16,
        height: 60,
    },
    clearButton: {
        backgroundColor: '#94a3b8',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationsListContainer: {
        alignItems: 'center',
        width: '100%',
    },
    locationList: {
        maxHeight: 400,
        width: '100%',
    },
    locationListContent: {
        paddingVertical: 8,
        paddingBottom: 32,
        alignItems: 'center',
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    noResultsText: {
        color: '#94a3b8',
        marginTop: 12,
    },
    locationItemWrapper: {
        marginVertical: 6,
        borderRadius: 16,
        width: CONTENT_WIDTH,
        overflow: 'hidden',
    },
    locationItemPressed: {
        opacity: 0.8,
    },
    locationItem: {
        backgroundColor: 'white',
        padding: 16,
        margin: 6,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        width: CONTENT_WIDTH,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        overflow: 'hidden',
        position: 'relative',
    },
    selectedGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
    selectedLocationItem: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#bfdbfe',
    },
    locationItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    locationItemIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        marginRight: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    selectedLocationItemIcon: {
        backgroundColor: '#3b82f6',
    },
    locationItemTextContainer: {
        flex: 1,
    },
    locationItemText: {
        color: '#334155',
        fontWeight: '500',
        fontSize: 16,
    },
    selectedLocationItemText: {
        color: '#1e40af',
        fontWeight: '600',
    },
    addressAndCoordinateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locationCoordsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 4,
    },
    locationMicroIcon: {
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    coordsVerticalContainer: {
        flexDirection: 'column',
    },
    coordText: {
        color: '#94a3b8',
        fontFamily: 'monospace',
        fontSize: 12,
    },
    coordLabel: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    locationItemAddress: {
        color: '#94a3b8',
        flex: 1,
    },
    checkmarkContainer: {
        marginLeft: 8,
    },
    checkmarkBg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    locationDetails: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    detailsGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
    },
    locationCard: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e0f2fe',
        overflow: 'hidden',
        position: 'relative',
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationIconContainer: {
        borderRadius: 10,
        width: 38,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    locationName: {
        color: '#334155',
        flex: 1,
        marginLeft: 12,
    },
    locationAddressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
        paddingLeft: 50,
    },
    addressIcon: {
        marginRight: 6,
        marginTop: 2,
    },
    locationAddress: {
        color: '#64748b',
        lineHeight: 18,
        flex: 1,
    },
    detailCoordsContainer: {
        marginTop: 12,
        paddingLeft: 50,
    },
    coordBoxVertical: {
        backgroundColor: 'rgba(224, 242, 254, 0.6)',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'column',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        width: '100%',
        maxWidth: 200,
    },
    coordBoxLabel: {
        color: '#3b82f6',
        marginBottom: 4,
    },
    coordBoxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    coordBoxLabelInner: {
        color: '#64748b',
        width: 40,
    },
    coordBoxValue: {
        color: '#334155',
        fontFamily: 'monospace',
    }
});

export default LocationSelector; 