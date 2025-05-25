import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
    nama_lokasi: string;
    latitude: number;
    longitude: number;
    created_at: string;
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
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Icon as={MaterialIcons} size="lg" />
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
                <Select
                    selectedValue={selectedLocation || undefined}
                    onValueChange={onLocationChange}
                    accessibilityLabel="Pilih lokasi"
                    placeholder="Pilih lokasi"
                // width="full"
                >
                    <SelectTrigger
                        variant="outline"
                        size="md"
                    >
                        <Box >
                            <SelectInput
                                placeholder="Pilih lokasi"
                            />
                        </Box>
                    </SelectTrigger>
                    <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                            <SelectDragIndicatorWrapper>
                                <SelectDragIndicator />
                            </SelectDragIndicatorWrapper>
                            {locations.map((location) => (
                                <SelectItem
                                    key={location.id_lokasi}
                                    label={location.nama_lokasi}
                                    value={location.id_lokasi}
                                />
                            ))}
                        </SelectContent>
                    </SelectPortal>
                </Select>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerText: {
        marginLeft: 8,
        color: '#334155',
    },
    emptyContainer: {
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 6,
    },
    emptyText: {
        color: '#64748b',
    },
});

export default LocationSelector; 