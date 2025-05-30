import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';

// Local components
import { Text } from '@/components/ui/text';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import {
    Select, SelectBackdrop, SelectContent, SelectDragIndicator,
    SelectDragIndicatorWrapper, SelectItem, SelectPortal,
    SelectTrigger, SelectInput
} from '@/components/ui/select';

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

const LocationSelector: React.FC<LocationSelectorProps> = ({
    locations,
    selectedLocation,
    onLocationChange
}) => {
    return (
        <MotiView
            style={styles.container}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
        >
            <View style={styles.headerRow}>
                <Icon as={MaterialIcons} name="location-on" size="lg" color="#3b82f6" />
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
                        onValueChange={onLocationChange}
                        accessibilityLabel="Pilih lokasi"
                        placeholder="Pilih lokasi"
                    >
                        <SelectTrigger
                            variant="outline"
                            size="md"
                            style={styles.selectTrigger}
                        >
                            <Box>
                                <SelectInput
                                    placeholder="Pilih lokasi"
                                    style={styles.selectInput}
                                />
                            </Box>
                        </SelectTrigger>
                        <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent style={styles.selectContent}>
                                <SelectDragIndicatorWrapper>
                                    <SelectDragIndicator />
                                </SelectDragIndicatorWrapper>
                                <ScrollView
                                    style={styles.scrollView}
                                    contentContainerStyle={styles.scrollViewContent}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                >
                                    {locations.map((location) => (
                                        <SelectItem
                                            key={location.id_lokasi}
                                            label={location.nama_sungai}
                                            value={location.id_lokasi}
                                        />
                                    ))}
                                </ScrollView>
                            </SelectContent>
                        </SelectPortal>
                    </Select>

                    {selectedLocation && (
                        <MotiView
                            style={styles.locationDetails}
                            from={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ type: 'timing', duration: 300, delay: 300 }}
                        >
                            {locations.find(loc => loc.id_lokasi === selectedLocation)?.alamat && (
                                <View style={styles.locationAddressContainer}>
                                    <MaterialIcons name="place" size={16} color="#64748b" style={styles.addressIcon} />
                                    <Text size="xs" style={styles.locationAddress}>
                                        {locations.find(loc => loc.id_lokasi === selectedLocation)?.alamat}
                                    </Text>
                                </View>
                            )}
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
        borderRadius: 8,
        borderWidth: 1,
    },
    selectInput: {
        color: '#334155',
        fontWeight: '500',
    },
    selectContent: {
        maxHeight: 250,
        zIndex: 1000,
    },
    scrollView: {
        maxHeight: 200,
    },
    scrollViewContent: {
        paddingBottom: 8,
    },
    locationDetails: {
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    locationAddressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    addressIcon: {
        marginRight: 4,
        marginTop: 2,
    },
    locationAddress: {
        color: '#64748b',
        lineHeight: 18,
        flex: 1,
    }
});

export default LocationSelector; 