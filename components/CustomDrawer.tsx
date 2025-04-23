import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    Image,
    StatusBar,
    Platform,
    TouchableWithoutFeedback
} from 'react-native';
import { router } from 'expo-router';
import { AntDesign, MaterialCommunityIcons, Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { logout } from '@/controllers/auth';
import { useToast } from "@/components/ui/toast";
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface CustomDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MenuItem {
    icon: JSX.Element;
    label: string;
    onPress: () => void;
    isActive?: boolean;
}

// Fungsi helper untuk menambahkan drawer langsung ke root view
const createDrawerPortal = (content: React.ReactNode) => {
    // Karena kita tidak bisa menggunakan Portal di React Native standar,
    // fungsi ini hanya mengembalikan konten, tapi bisa diganti
    // dengan portal dari library seperti react-native-portalize jika tersedia
    return content;
};

const CustomDrawer = ({ isOpen, onClose }: CustomDrawerProps) => {
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const toast = useToast();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.5,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setVisible(false);
            });
        }
    }, [isOpen, slideAnim, fadeAnim]);

    const handleBackdropPress = () => {
        onClose();
    };

    const handleLogout = async () => {
        try {
            await logout();
            onClose();
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

    const menuItems: MenuItem[] = [
        {
            icon: <Ionicons name="home-outline" size={22} color="#3b82f6" />,
            label: "Beranda",
            onPress: onClose,
            isActive: true
        },
        {
            icon: <MaterialCommunityIcons name="water-outline" size={22} color="#64748b" />,
            label: "Data Sensor",
            onPress: () => {
                onClose();
                // router.push('/sensors'); // When route exists
            }
        },
        {
            icon: <MaterialIcons name="location-on" size={22} color="#64748b" />,
            label: "Lokasi",
            onPress: () => {
                onClose();
                // router.push('/locations'); // When route exists
            }
        },
        {
            icon: <Feather name="bar-chart-2" size={22} color="#64748b" />,
            label: "Statistik",
            onPress: () => {
                onClose();
                // router.push('/statistics'); // When route exists
            }
        },
        {
            icon: <Ionicons name="notifications-outline" size={22} color="#64748b" />,
            label: "Notifikasi",
            onPress: () => {
                onClose();
                // router.push('/notifications'); // When route exists
            }
        },
        {
            icon: <Ionicons name="settings-outline" size={22} color="#64748b" />,
            label: "Pengaturan",
            onPress: () => {
                onClose();
                // router.push('/settings'); // When route exists
            }
        }
    ];

    const renderMenuItem = (item: MenuItem, index: number) => {
        return (
            <TouchableOpacity
                key={index}
                style={[styles.menuItem, item.isActive && styles.activeMenuItem]}
                onPress={item.onPress}
                activeOpacity={0.7}
            >
                {item.icon}
                <Text style={[styles.menuItemText, item.isActive && styles.activeMenuItemText]}>
                    {item.label}
                </Text>
                {item.isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
        );
    };

    // Don't return null immediately when drawer is closed
    // This allows the closing animation to complete
    if (!visible && !isOpen) {
        return null;
    }

    const drawerContent = (
        <View style={styles.container}>
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[
                    styles.drawer,
                    { transform: [{ translateX: slideAnim }] }
                ]}
            >
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>WS</Text>
                        </View>
                        <View style={styles.userText}>
                            <Text style={styles.userName}>Water Sensor</Text>
                            <Text style={styles.userEmail}>Monitoring App</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <AntDesign name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.menuItems}>
                        {menuItems.map(renderMenuItem)}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <AntDesign name="logout" size={20} color="#ef4444" />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );

    // Render sebagai portal terpisah agar berada di depan semua komponen
    return createDrawerPortal(drawerContent);
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 9999,
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 9990,
        position: 'absolute',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: DRAWER_WIDTH,
        height: '100%',
        backgroundColor: '#fff',
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 9999,
        zIndex: 9999,
        paddingTop: Platform.OS === 'ios' ? StatusBar.currentHeight || 40 : StatusBar.currentHeight,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 20,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#dbeafe',
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    userText: {
        justifyContent: 'center',
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#1e293b',
    },
    userEmail: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 2,
    },
    closeButton: {
        padding: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginHorizontal: 16,
    },
    scrollView: {
        flex: 1,
    },
    menuItems: {
        paddingTop: 12,
        paddingBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        position: 'relative',
    },
    activeMenuItem: {
        backgroundColor: '#f1f5f9',
    },
    menuItemText: {
        marginLeft: 16,
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    activeMenuItemText: {
        color: '#3b82f6',
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 10,
        bottom: 10,
        width: 3,
        borderRadius: 3,
        backgroundColor: '#3b82f6',
    },
    footer: {
        padding: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    logoutText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#ef4444',
        fontWeight: '500',
    },
});

export default CustomDrawer; 