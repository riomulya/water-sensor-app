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
import { Link, router } from 'expo-router';
import { AntDesign, MaterialCommunityIcons, Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useToast } from "@/components/ui/toast";
import { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { goToLocations } from '@/utils/navigationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useAuth } from '@/context/AuthContext'; // Commented out for testing

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
    adminOnly?: boolean;
}

interface UserData {
    id: number;
    username: string;
    email: string | null;
    role: string;
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
    // const { user } = useAuth(); // Commented out for testing

    // State untuk menyimpan data user dari AsyncStorage
    const [userData, setUserData] = useState<UserData | null>(null);

    // Load user data from AsyncStorage on component mount
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedUserData = await AsyncStorage.getItem('userData');
                if (storedUserData) {
                    setUserData(JSON.parse(storedUserData));
                } else {
                    // Default to guest user if no data is found
                    setUserData({
                        id: -1,
                        username: 'Guest User',
                        email: 'guest@watersensor.app',
                        role: 'guest',
                    });
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                // Default to guest user if error occurs
                setUserData({
                    id: -1,
                    username: 'Guest User',
                    email: 'guest@watersensor.app',
                    role: 'guest',
                });
            }
        };

        loadUserData();
    }, [isOpen]);  // Reload user data each time drawer opens

    const getInitials = (name: string | undefined) => {
        if (!name) return 'WS';

        // Split the name by spaces and get the first letter of each part
        const parts = name.split(' ');
        if (parts.length === 1) {
            return name.charAt(0).toUpperCase();
        }

        // Get first letter of first name and first letter of last name
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

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

    const handleNavigateToLocations = () => {
        onClose();
        try {
            setTimeout(() => {
                // @ts-ignore - Ignoring TypeScript errors for navigation paths
                router.push('locations');
            }, 300);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    };

    const navigateToUserManagement = () => {
        onClose();
        try {
            setTimeout(() => {
                // @ts-ignore - Ignoring TypeScript errors for navigation paths
                router.push('/admin/users');
            }, 300);
        } catch (error) {
            console.error('Navigation error:', error);
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
            }
        },
        {
            icon: <MaterialIcons name="location-on" size={22} color="#64748b" />,
            label: "Lokasi",
            onPress: handleNavigateToLocations
        },
        {
            icon: <Feather name="bar-chart-2" size={22} color="#64748b" />,
            label: "Statistik",
            onPress: () => {
                onClose();
            }
        },
        {
            icon: <Ionicons name="notifications-outline" size={22} color="#64748b" />,
            label: "Notifikasi",
            onPress: () => {
                onClose();
            }
        },
        {
            icon: <Ionicons name="settings-outline" size={22} color="#64748b" />,
            label: "Pengaturan",
            onPress: () => {
                onClose();
            }
        },
        {
            icon: <Ionicons name="people-outline" size={22} color="#64748b" />,
            label: "Manajemen User",
            onPress: navigateToUserManagement,
            adminOnly: true
        }
    ];

    const renderMenuItem = (item: MenuItem, index: number) => {
        // Skip admin-only items for non-admin users
        if (item.adminOnly && (!userData || userData.role !== 'admin')) {
            return null;
        }

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
                        <View style={[
                            styles.avatar,
                            {
                                backgroundColor: userData?.role === 'admin'
                                    ? '#ef4444'
                                    : userData?.role === 'pengamat'
                                        ? '#3b82f6'
                                        : '#9ca3af'
                            }
                        ]}>
                            <Text style={styles.avatarText}>
                                {getInitials(userData?.username)}
                            </Text>
                        </View>
                        <View style={styles.userText}>
                            <Text style={styles.userName}>
                                {userData?.username || 'Water Sensor'}
                            </Text>
                            <Text style={styles.userEmail}>
                                {userData?.email || 'Monitoring App'}
                            </Text>
                            <View
                                style={[
                                    styles.roleBadge,
                                    {
                                        backgroundColor: userData?.role === 'admin'
                                            ? '#ef4444'
                                            : userData?.role === 'pengamat'
                                                ? '#3b82f6'
                                                : '#9ca3af'
                                    }
                                ]}
                            >
                                <Text style={styles.roleBadgeText}>
                                    {userData?.role || 'guest'}
                                </Text>
                            </View>
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
        marginTop: 16,
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
    roleBadge: {
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    roleBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});

export default CustomDrawer; 