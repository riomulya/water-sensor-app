import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/Config';
import { port } from '@/constants/https';

interface User {
    id: number;
    username?: string;
    email?: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (identifier: string, password: string) => Promise<void>;
    guestLogin: () => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    loading: true,
    login: async () => { },
    guestLogin: async () => { },
    logout: async () => { },
    isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user data from AsyncStorage on app start
    useEffect(() => {
        const loadUserFromStorage = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('@user');
                const storedToken = await AsyncStorage.getItem('@token');

                if (storedUser && storedToken) {
                    setUser(JSON.parse(storedUser));
                    setToken(storedToken);
                }
            } catch (error) {
                console.error('Error loading auth data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserFromStorage();
    }, []);

    const login = async (identifier: string, password: string) => {
        try {
            setLoading(true);

            const response = await fetch(`${port}login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier,
                    password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }

            const data = await response.json();

            if (data.success && data.token && data.user) {
                setUser(data.user);
                setToken(data.token);

                // Save to AsyncStorage
                await AsyncStorage.setItem('@user', JSON.stringify(data.user));
                await AsyncStorage.setItem('@token', data.token);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const guestLogin = async () => {
        try {
            setLoading(true);

            const guestUser = {
                id: -1,
                role: 'guest'
            };

            const token = 'guest';

            setUser(guestUser);
            setToken(token);

            // Save to AsyncStorage
            await AsyncStorage.setItem('@user', JSON.stringify(guestUser));
            await AsyncStorage.setItem('@token', token);

        } catch (error: any) {
            console.error('Guest login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('@user');
            await AsyncStorage.removeItem('@token');
            setUser(null);
            setToken(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                guestLogin,
                logout,
                isAuthenticated: !!user && !!token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}; 