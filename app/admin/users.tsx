import React from 'react';
import { View, StyleSheet } from 'react-native';
import UserManagement from '@/components/UserManagement';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function UsersScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen
                options={{
                    title: 'User Management',
                    headerShown: true,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerShadowVisible: false,
                    headerStyle: {
                        backgroundColor: '#f8fafc',
                    },
                }}
            />
            <UserManagement />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    }
}); 