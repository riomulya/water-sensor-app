import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { Center } from '@/components/ui/center';

const RealTimeClock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            clearInterval(timerId);
        };
    }, []);

    // Fungsi untuk memformat waktu menjadi lebih manusiawi
    const formatTime = (date: Date) => {
        const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
        const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date);
        const day = date.getDate();
        const year = date.getFullYear();

        let hour = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        hour = hour % 12 || 12; // Konversi ke format 12-jam

        return `${dayName}, ${day} ${monthName} ${year} jam ${hour}:${minutes}:${seconds}`;
    };

    // Fungsi untuk menentukan waktu (pagi, siang, sore, malam)
    const getPeriodOfDay = (hour: number) => {
        if (hour >= 0 && hour < 12) return 'pagi';
        if (hour >= 12 && hour < 15) return 'siang';
        if (hour >= 15 && hour < 18) return 'sore';
        return 'malam';
    };

    return (
        <Center className="h-[70px]">
            <Text className="text-typography-1 font-bold">
                {formatTime(currentTime)}{' '}
                {getPeriodOfDay(currentTime.getHours())}
            </Text>
        </Center>
    );
};

export default RealTimeClock;
