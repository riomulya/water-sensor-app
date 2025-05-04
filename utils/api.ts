import { port } from '../constants/https';

// Location type definition
export interface Location {
    id_lokasi: number;
    nama_sungai: string;
    alamat: string;
    tanggal: string;
    lat: string;
    lon: string;
}

// Get all locations
export const getLocations = async (): Promise<Location[]> => {
    try {
        const response = await fetch(`${port}data_lokasi`);
        if (!response.ok) {
            throw new Error('Failed to fetch locations');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching locations:', error);
        throw error;
    }
};

// Get location by ID
export const getLocationById = async (id: number): Promise<Location> => {
    try {
        const response = await fetch(`${port}data_lokasi/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch location');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching location ${id}:`, error);
        throw error;
    }
};

// Create new location
export const createLocation = async (locationData: Omit<Location, 'id_lokasi'>): Promise<Location> => {
    try {
        const response = await fetch(`${port}data_lokasi`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData),
        });

        if (!response.ok) {
            throw new Error('Failed to create location');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating location:', error);
        throw error;
    }
};

// Update location
export const updateLocation = async (id: number, locationData: Partial<Location>): Promise<Location> => {
    try {
        const response = await fetch(`${port}data_lokasi/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData),
        });

        if (!response.ok) {
            throw new Error(`Failed to update location ${id}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error updating location ${id}:`, error);
        throw error;
    }
};

// Delete location
export const deleteLocation = async (id: number): Promise<void> => {
    try {
        const response = await fetch(`${port}data_lokasi/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to delete location ${id}`);
        }
    } catch (error) {
        console.error(`Error deleting location ${id}:`, error);
        throw error;
    }
}; 