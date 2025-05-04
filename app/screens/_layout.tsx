import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, StatusBar, Platform, Image } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from "@/components/ui/toast";
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { logout } from '@/controllers/auth';
import { router } from 'expo-router';
import CustomDrawer from '@/components/CustomDrawer';
import HomeScreen from './Home';
import AnalysisScreen from './Analysis';
import FeedsScreen from './Feeds';
import AboutScreen from './About';
import TabBar from '@/components/navigation/TabBar';
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Center } from "@/components/ui/center";
import { HStack } from "@/components/ui/hstack";

type RootStackParamList = {
    Home: undefined;
    Analysis: undefined;
    Feeds: undefined;
    About: undefined;
};

const BottomTab = createBottomTabNavigator<RootStackParamList>();

// Custom AppBar component with menu button
const AppBar = ({ onMenuPress, onLogoutPress }: { onMenuPress: () => void, onLogoutPress: () => void }) => {
    return (
        <LinearGradient
            colors={['pink', '#ffffff']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.appBar}
        >
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
                <AntDesign name="menuunfold" size={22} color="#333" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/images/plain-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            <TouchableOpacity onPress={onLogoutPress} style={styles.logoutButton}>
                <AntDesign name="logout" size={18} color="#ef4444" />
            </TouchableOpacity>
        </LinearGradient>
    );
};

function ScreensLayout() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showLogoutAlert, setShowLogoutAlert] = useState(false);
    const toast = useToast();

    const handleLogoutConfirm = async () => {
        try {
            await logout();
            setShowLogoutAlert(false);
            router.replace('/auth/Login');
        } catch (error) {
            toast.show({
                placement: 'top',
                render: () => (
                    <Toast action="error">
                        <ToastTitle>Logout Gagal</ToastTitle>
                        <ToastDescription>Terjadi kesalahan saat logout</ToastDescription>
                    </Toast>
                )
            });
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                {/* Drawer component positioned above everything */}
                <View style={styles.drawerContainer}>
                    <CustomDrawer
                        isOpen={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                    />
                </View>

                {/* App Bar */}
                <AppBar
                    onMenuPress={() => setDrawerOpen(true)}
                    onLogoutPress={() => setShowLogoutAlert(true)}
                />

                {/* Main Content with Tab Navigator */}
                <BottomTab.Navigator
                    id={undefined}
                    tabBar={TabBar}
                >
                    <BottomTab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                    <BottomTab.Screen name="Feeds" component={FeedsScreen} options={{ headerShown: false }} />
                    <BottomTab.Screen name="Analysis" component={AnalysisScreen} options={{ headerShown: false }} />
                    <BottomTab.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
                </BottomTab.Navigator>

                {/* Logout Confirmation Alert */}
                <AlertDialog isOpen={showLogoutAlert} onClose={() => setShowLogoutAlert(false)}>
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <Center>
                                <AntDesign name="logout" size={32} color="#ef4444" style={{ marginBottom: 12 }} />
                                <Heading size="md" style={{ textAlign: 'center', color: '#1e293b' }}>Konfirmasi Logout</Heading>
                            </Center>
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            <Text style={styles.alertText}>
                                Apakah Anda yakin ingin keluar dari aplikasi?
                            </Text>
                            <Text style={[styles.alertText, { marginTop: 6 }]}>
                                Anda perlu login kembali untuk mengakses aplikasi.
                            </Text>
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <HStack space="md" style={styles.buttonContainer}>
                                <Button
                                    variant="outline"
                                    size="md"
                                    style={styles.cancelButton}
                                    onPress={() => setShowLogoutAlert(false)}
                                >
                                    <ButtonText>Batal</ButtonText>
                                </Button>
                                <Button
                                    action="negative"
                                    size="md"
                                    style={styles.logoutConfirmButton}
                                    onPress={handleLogoutConfirm}
                                >
                                    <AntDesign name="logout" size={16} color="white" style={{ marginRight: 8 }} />
                                    <ButtonText>Ya, Logout</ButtonText>
                                </Button>
                            </HStack>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SafeAreaView>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    drawerContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 9999,
        elevation: 9999,
        pointerEvents: 'box-none'
    },
    appBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 45,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    logoContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1,
    },
    logo: {
        height: 28,
        width: 120,
    },
    menuButton: {
        padding: 6,
    },
    logoutButton: {
        padding: 6,
    },
    alertText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
    },
    buttonContainer: {
        width: '100%',
        justifyContent: 'center',
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        borderColor: '#e2e8f0',
    },
    logoutConfirmButton: {
        flex: 1,
        backgroundColor: '#ef4444',
    },
});

export default ScreensLayout