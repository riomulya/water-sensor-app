// components/navigation/Tabs.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../../screens/HomeScreen';
import ChartScreen from '../../screens/ChartScreen';
import AnalysisScreen from '../../screens/AnalysisScreen';
import AddScreen from '../../screens/AddScreen';
import SensorsScreen from '../../screens/SensorsScreen';
import { StyleSheet, Text } from 'react-native';
import { Center } from '@/components/ui/center';
import { House, View } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const Tab = createBottomTabNavigator();
const CustomTabbarButton = ({ children, onPress }) => {
    <TouchableOpacity onPress={onPress} className="justify-content-center align-items-center" style={{top:-30,...styles.shadow}}>
        <View style={{
            width:70,
            height:70,
            borderRadius:35,
            color:'#fc0335',
        }} >
        {children}
        </View>
    </TouchableOpacity>
}

const Tabs = () => {
    return (
        <Tab.Navigator screenOptions={{
            tabBarShowLabel: false,
            tabBarStyle: {
                ...styles.tab,
                ...styles.shadow
            }
        }}>
            <Tab.Screen name="Home" component={HomeScreen} options={{
                tabBarIcon: ({ focused }) => (
                    <Center>
                        {/* //? Primary Color */}
                        <House color={focused ? '#fc0335' : 'gray'} />
                        <Text>Home</Text>
                    </Center>
                ),
            }} />
            <Tab.Screen name="Chart" component={ChartScreen} options={{
                tabBarIcon: ({ focused }) => (
                    <Center>
                        {/* //? Primary Color */}
                        <House color={focused ? '#fc0335' : 'gray'} />
                        <Text>Chart</Text>
                    </Center>
                ),
            }} />
            <Tab.Screen name="Add" component={AddScreen} options={{
                tabBarIcon: ({ focused }) => (
                    <Center>
                        {/* //? Primary Color */}
                        <House color={focused ? '#fc0335' : 'gray'} style={{
                            width: 30,
                            height: 30,
                        }} />
                        <Text>Add</Text>
                    </Center>
                ),
                tabBarButton: (props) => <CustomTabbarButton {...props} />
            }} 
            />
            <Tab.Screen name="Analysis" component={AnalysisScreen} options={{
                tabBarIcon: ({ focused }) => (
                    <Center>
                        {/* //? Primary Color */}
                        <House color={focused ? '#fc0335' : 'gray'} />
                        <Text>Analysis</Text>
                    </Center>
                ),
            }} />
            <Tab.Screen name="Sensors" component={SensorsScreen} options={{
                tabBarIcon: ({ focused }) => (
                    <Center>
                        {/* //? Primary Color */}
                        <House color={focused ? '#fc0335' : 'gray'} />
                        <Text>Sensors</Text>
                    </Center>
                ),
            }} />
        </Tab.Navigator>
    );
};

export default Tabs;


const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#7F5DF0',
        shadowOffset: {
            width: 0,
            height: 10
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        elevation: 5
    },
    tab: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        borderRadius: 15,
        height: 70,
        backgroundColor: '#ffffff',
    }
})