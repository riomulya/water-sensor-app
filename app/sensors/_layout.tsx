import { Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function SensorsLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    title: "Anomali Sensor",
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    }
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: "Detail Anomali",
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    }
                }}
            />
        </Stack>
    );
} 