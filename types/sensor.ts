export interface Location {
    id_lokasi: string;
    nama_lokasi: string;
    latitude: number;
    longitude: number;
    created_at: string;
}

export interface SensorData {
    id: string;
    id_lokasi: string;
    accel_x: number;
    accel_y: number;
    accel_z: number;
    turbidity: number;
    ph: number;
    temperature: number;
    speed: number;
    timestamp: string;
}

export interface SensorStatistics {
    min: number;
    max: number;
    avg: number;
    current: number;
    unit: string;
}

export interface TimeRangeOption {
    label: string;
    value: string;
}

export type SensorType = 'accel_x' | 'accel_y' | 'accel_z' | 'turbidity' | 'ph' | 'temperature' | 'speed'; 