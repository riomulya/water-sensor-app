import { Redirect, Stack } from 'expo-router';

export default function UnmatchedRoute() {
    return <Redirect href="/screens/Home" />;
}

export const unstable_settings = {
    initialRouteName: 'screens/Home',
}; 