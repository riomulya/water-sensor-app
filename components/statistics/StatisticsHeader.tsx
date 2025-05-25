import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Local components
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import {
    Select, SelectBackdrop, SelectContent, SelectDragIndicator,
    SelectDragIndicatorWrapper, SelectItem, SelectPortal,
    SelectTrigger, SelectInput
} from '@/components/ui/select';

// Constants and types
import { TIME_RANGE_OPTIONS } from '@/constants/api';

interface TimeRangeOption {
    label: string;
    value: string;
}

interface StatisticsHeaderProps {
    timeRange: string;
    onTimeRangeChange: (range: string) => void;
}

const StatisticsHeader: React.FC<StatisticsHeaderProps> = ({
    timeRange,
    onTimeRangeChange
}) => {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>

                <Text size="lg" bold style={styles.title}>
                    Statistik
                </Text>

                <Select
                    selectedValue={timeRange}
                    onValueChange={onTimeRangeChange}
                // width="140px"
                >
                    <SelectTrigger variant="outline" size="sm">
                        <SelectInput placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                            <SelectDragIndicatorWrapper>
                                <SelectDragIndicator />
                            </SelectDragIndicatorWrapper>
                            {TIME_RANGE_OPTIONS.map((option: TimeRangeOption) => (
                                <SelectItem
                                    key={option.value}
                                    label={option.label}
                                    value={option.value}
                                />
                            ))}
                        </SelectContent>
                    </SelectPortal>
                </Select>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
    },
    title: {
        color: '#0f172a',
    }
});

export default StatisticsHeader; 