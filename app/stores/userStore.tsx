import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
    id?: number;
    username?: string;
    email?: string;
    role: string;
}

interface UserStore {
    userData: UserData | null;
    isLoading: boolean;
    hasError: boolean;
    errorMessage: string;

    // Actions
    loadUserData: () => Promise<void>;
    setUserData: (data: UserData | null) => void;
    clearUserData: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
    userData: null,
    isLoading: false,
    hasError: false,
    errorMessage: '',

    loadUserData: async () => {
        try {
            set({ isLoading: true, hasError: false });
            const storedUserData = await AsyncStorage.getItem('userData');

            if (storedUserData) {
                set({ userData: JSON.parse(storedUserData), isLoading: false });
            } else {
                set({ userData: null, isLoading: false });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            set({
                hasError: true,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                isLoading: false
            });
        }
    },

    setUserData: (data) => {
        set({ userData: data });
        if (data) {
            AsyncStorage.setItem('userData', JSON.stringify(data)).catch(error => {
                console.error('Error saving user data:', error);
            });
        }
    },

    clearUserData: async () => {
        try {
            await AsyncStorage.removeItem('userData');
            set({ userData: null });
        } catch (error) {
            console.error('Error clearing user data:', error);
            set({
                hasError: true,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}));
