import { port } from '@/constants/https';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthResponse {
    success: boolean;
    token: string;
    user?: {
        id: number;
        username: string;
        email?: string;
        role: string;
        organization_id: string;
    };
    error?: string;
}

export const loginUser = async (identifier: string, password: string): Promise<AuthResponse> => {
    try {
        console.log(`Sending login request to: ${port}auth/login`);

        const response = await fetch(`${port}auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                identifier, // Username or email
                password
            }),
        });

        // Log response details for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        // Get response text first
        const textResponse = await response.text();
        console.log('Raw response:', textResponse);

        // Safely parse JSON
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error(`Server mengembalikan respons non-JSON: ${textResponse.substring(0, 100)}...`);
        }

        if (!response.ok) {
            throw new Error(data.error || 'Login gagal');
        }

        // Store auth data in AsyncStorage
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw new Error((error as Error).message || 'Terjadi kesalahan saat login');
    }
};

export const registerUser = async (userData: {
    username: string;
    email?: string;
    password: string;
}): Promise<AuthResponse> => {
    try {
        console.log(`Sending register request to: ${port}auth/register`);

        const response = await fetch(`${port}auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userData),
        });

        // Log response details for debugging
        console.log('Response status:', response.status);

        // Get response text first
        const textResponse = await response.text();
        console.log('Raw response:', textResponse);

        // Safely parse JSON
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error(`Server mengembalikan respons non-JSON: ${textResponse.substring(0, 100)}...`);
        }

        if (!response.ok) {
            throw new Error(data.error || 'Registrasi gagal');
        }

        // Store auth data in AsyncStorage
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userData', JSON.stringify({
            id: data.id,
            username: data.username,
            email: data.email,
            role: data.role
        }));

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw new Error((error as Error).message || 'Terjadi kesalahan saat registrasi');
    }
};

export const guestLogin = async (): Promise<AuthResponse> => {
    try {
        console.log(`Sending guest login request to: ${port}auth/guest`);

        // First try with minimal options to test connection
        const testResponse = await fetch(`${port}auth/guest`, {
            method: 'POST',
        }).catch(error => {
            console.error('Network error during guest login test:', error);
            throw new Error(`Koneksi gagal: ${error.message}`);
        });

        console.log('Test response status:', testResponse.status);

        // Now proceed with actual request
        const response = await fetch(`${port}auth/guest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Log response details for debugging
        console.log('Guest login response status:', response.status);

        // Get response text first
        const textResponse = await response.text();
        console.log('Guest login raw response:', textResponse);

        // Check if response is empty
        if (!textResponse || textResponse.trim() === '') {
            throw new Error('Server mengembalikan respons kosong');
        }

        // Safely parse JSON
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (parseError) {
            console.error('JSON parse error in guest login:', parseError);
            throw new Error(`Server mengembalikan respons non-JSON: ${textResponse.substring(0, 100)}...`);
        }

        if (!response.ok) {
            throw new Error(data.error || 'Guest login gagal');
        }

        // Store guest token
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));

        return data;
    } catch (error) {
        console.error('Guest login error:', error);
        throw new Error((error as Error).message || 'Terjadi kesalahan saat akses tamu');
    }
};

export const checkAuthStatus = async (): Promise<{ isLoggedIn: boolean; token?: string; user?: any }> => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');

        return {
            isLoggedIn: !!token,
            token: token || undefined,
            user: userData ? JSON.parse(userData) : undefined
        };
    } catch (error) {
        console.error('Auth check error:', error);
        return { isLoggedIn: false };
    }
};

export const logout = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
    } catch (error) {
        console.error('Logout error:', error);
        throw new Error('Gagal logout');
    }
};