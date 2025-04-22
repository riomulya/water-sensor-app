import { port } from '@/constants/https';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loginUser = async (identifier: string, password: string) => {
    try {
        const response = await fetch(`${port}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identifier, // Bisa username atau email
                password
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login gagal');
        }

        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        return data;
    } catch (error) {
        throw new Error((error as Error).message || 'Terjadi kesalahan saat login');
    }
};

export const checkAuthStatus = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        return { isLoggedIn: !!token, token };
    } catch (error) {
        return { isLoggedIn: false, token: null };
    }
};