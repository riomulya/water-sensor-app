import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import Animated, { FadeIn } from 'react-native-reanimated';

// Local components
import { Text } from '@/components/ui/text';

interface StatisticsHeaderProps { }

const StatisticsHeader: React.FC<StatisticsHeaderProps> = () => {
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
                    style={styles.titleContainer}
                    from={{ opacity: 0, translateY: -10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 500, delay: 100 }}
                >
                    <Text size="lg" bold style={styles.title}>
                        Statistik
                    </Text>
                </MotiView>

                {/* Empty view to balance the layout */}
                <View style={styles.placeholder} />
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
        width: 40,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        color: '#0f172a',
    },
    placeholder: {
        width: 40,
    }
});

export default StatisticsHeader; 