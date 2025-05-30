import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import Animated, { FadeIn } from 'react-native-reanimated';

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
        <Animated.View
            style={styles.container}
            entering={FadeIn.duration(500)}
        >
            <View style={styles.row}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>

                <MotiView
                    from={{ opacity: 0, translateY: -10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 500, delay: 100 }}
                >
                    <Text size="lg" bold style={styles.title}>
                        Statistik
                    </Text>
                </MotiView>

                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 500, delay: 200 }}
                    style={styles.selectContainer}
                >
                    <Select
                        selectedValue={timeRange}
                        onValueChange={onTimeRangeChange}
                    >
                        <SelectTrigger
                            variant="outline"
                            size="sm"
                            style={styles.selectTrigger}
                        >
                            <SelectInput placeholder="Pilih Periode" style={styles.selectInput} />
                        </SelectTrigger>
                        <SelectPortal>
                            <SelectBackdrop />
                            <SelectContent style={styles.selectContent}>
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
                </MotiView>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        marginBottom: 8,
        zIndex: 100, // Ensure header is above other elements
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
    },
    title: {
        color: '#0f172a',
    },
    selectContainer: {
        zIndex: 101, // Ensure dropdown appears above other elements
    },
    selectTrigger: {
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        minWidth: 120,
    },
    selectInput: {
        fontSize: 13,
    },
    selectContent: {
        zIndex: 1000,
    }
});

export default StatisticsHeader; 