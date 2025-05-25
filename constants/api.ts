import { port } from './https';

export const API_URL = port;

export const TIME_RANGE_OPTIONS = [
    { label: '1 Hari', value: '1d' },
    { label: '7 Hari', value: '7d' },
    { label: '14 Hari', value: '14d' },
    { label: '30 Hari', value: '30d' },
    { label: '3 Bulan', value: '3m' },
    { label: '6 Bulan', value: '6m' },
    { label: '1 Tahun', value: '1y' }
];

export const SENSOR_UNITS = {
    accel_x: 'm/s²',
    accel_y: 'm/s²',
    accel_z: 'm/s²',
    turbidity: 'NTU',
    ph: '',
    temperature: '°C',
    speed: 'm/s'
};

export const SENSOR_LABELS = {
    accel_x: 'Akselerasi X',
    accel_y: 'Akselerasi Y',
    accel_z: 'Akselerasi Z',
    turbidity: 'Kekeruhan',
    ph: 'pH',
    temperature: 'Suhu',
    speed: 'Kecepatan'
};

export const WATER_QUALITY_THRESHOLDS = {
    turbidity: {
        excellent: 5, // < 5 NTU
        good: 10,     // < 10 NTU
        fair: 25,     // < 25 NTU
        poor: 50      // >= 50 NTU is very poor
    },
    ph: {
        excellent: { min: 6.5, max: 8.5 },
        good: { min: 6.0, max: 9.0 },
        fair: { min: 5.5, max: 9.5 },
        poor: { min: 5.0, max: 10.0 }
    }
}; 