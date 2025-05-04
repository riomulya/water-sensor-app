import { port } from '@/constants/https';
import AsyncStorage from '@react-native-async-storage/async-storage';

// User interface
export interface User {
    id: number;
    username: string;
    email: string | null;
    password?: string; // Only used for creation/updates
    role: 'admin' | 'pengamat' | 'guest';
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

// Get all users
export const getUsers = async (token: string): Promise<User[]> => {
    try {
        const response = await fetch(`${port}api/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to fetch users');
        }

        const data = await response.json();
        return data.users;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error((error as Error).message || 'Failed to fetch users');
    }
};

// Get user by ID
export const getUserById = async (userId: number, token: string): Promise<User> => {
    try {
        const response = await fetch(`${port}api/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to fetch user');
        }

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error(`Error fetching user with ID ${userId}:`, error);
        throw new Error((error as Error).message || 'Failed to fetch user');
    }
};

// Create a new user
export const createUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>, token: string): Promise<User> => {
    try {
        const response = await fetch(`${port}api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create user');
        }

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error creating user:', error);
        throw new Error((error as Error).message || 'Failed to create user');
    }
};

// Update an existing user
export const updateUser = async (userId: number, userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>, token: string): Promise<User> => {
    try {
        const response = await fetch(`${port}api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update user');
        }

        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error(`Error updating user with ID ${userId}:`, error);
        throw new Error((error as Error).message || 'Failed to update user');
    }
};

// Delete a user
export const deleteUser = async (userId: number, token: string): Promise<void> => {
    try {
        const response = await fetch(`${port}api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error(`Error deleting user with ID ${userId}:`, error);
        throw new Error((error as Error).message || 'Failed to delete user');
    }
}; 