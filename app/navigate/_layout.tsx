import { Stack } from 'expo-router';

export default function NavigateLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: 'transparent' },
            }}
        />
    );
}
