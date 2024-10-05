// components/navigation/Tabs.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../../app/(tabs)/home/Home';
import ChartScreen from '../../app/(tabs)/chart/Chart';
import AnalysisScreen from '../../app/(tabs)/analysis/Analysis';
import MapScreen from '../../app/(tabs)/map/Map';
import SensorsScreen from '../../app/(tabs)/sensors/Sensors';
import { StyleSheet, Text, View } from 'react-native'; // Mengimpor View dari react-native
import { Center } from '@/components/ui/center';
import { House } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const Tab = createBottomTabNavigator();

const CustomTabbarButton = ({ children, onPress }) => {
    // Tambahkan return agar JSX dikembalikan
    return (
        <TouchableOpacity
            onPress={onPress}
            className="justify-content-center align-items-center"
            style={{ top: -30, ...styles.shadow }}
        >
            <View
                style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: '#fc0335', // Ganti color dengan backgroundColor
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                {children}
            </View>
        </TouchableOpacity>
    );
};

const Tabs = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarShowLabel: false,
                tabBarStyle: {
                    ...styles.tab,
                    ...styles.shadow,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Center>
                            <House color={focused ? '#fc0335' : 'gray'} />
                            <Text>Home</Text>
                        </Center>
                    ),
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Chart"
                component={ChartScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Center>
                            <House color={focused ? '#fc0335' : 'gray'} />
                            <Text>Chart</Text>
                        </Center>
                    ),
                }}
            />
            <Tab.Screen
                name="Map"
                component={MapScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Center>
                            <House
                                color={focused ? 'black' : 'white'}
                                style={{
                                    width: 30,
                                    height: 30,
                                }}
                                strokeWidth={focused ? 3 : 2}
                            />
                        </Center>
                    ),
                    // Menggunakan CustomTabbarButton untuk tombol tengah
                    tabBarButton: (props) => <CustomTabbarButton {...props} />,
                }}
            />
            <Tab.Screen
                name="Analysis"
                component={AnalysisScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Center>
                            <House color={focused ? '#fc0335' : 'gray'} />
                            <Text>Analysis</Text>
                        </Center>
                    ),
                }}
            />
            <Tab.Screen
                name="Sensors"
                component={SensorsScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Center>
                            <House color={focused ? '#fc0335' : 'gray'} />
                            <Text>Sensors</Text>
                        </Center>
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export default Tabs;

const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#7F5DF0',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        elevation: 5,
    },
    tab: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        borderRadius: 15,
        height: 70,
        backgroundColor: '#ffffff',
    },
});
