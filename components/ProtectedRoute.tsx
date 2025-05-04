import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRoles = []
}) => {
    const { user, isAuthenticated, loading } = useAuth();

    // Show loading screen while checking authentication
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Redirect href="/auth/Login" />;
    }

    // If roles are specified and user doesn't have required role
    if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
        return <Redirect href="/" />;
    }

    // User is authenticated and has required role, render children
    return <>{children}</>;
};

export default ProtectedRoute; 