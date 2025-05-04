import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomAppBarProps {
    title: string;
    onMenuPress?: () => void;
}

const CustomAppBar: React.FC<CustomAppBarProps> = ({ title, onMenuPress }) => {
    return (
        <View style={styles.appBar}>
            <TouchableOpacity
                style={styles.menuButton}
                onPress={onMenuPress}
            >
                <Ionicons name="menu-outline" size={24} color="#3b82f6" />
            </TouchableOpacity>

            <Text style={styles.title}>{title}</Text>

            <View style={styles.rightPlaceholder} />
        </View>
    );
};

const styles = StyleSheet.create({
    appBar: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: 'white',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    menuButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    rightPlaceholder: {
        width: 40,
    },
});

export default CustomAppBar;
