import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { loginUser, checkAuthStatus, createGuestUser } from '@/controllers/auth';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { port } from '@/constants/https';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

interface FormData {
    identifier: string;
    password: string;
}

const LoginScreen = () => {
    const [formData, setFormData] = useState<FormData>({
        identifier: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    // Check if user is already logged in
    useEffect(() => {
        const checkUserAuth = async () => {
            try {
                const { isLoggedIn } = await checkAuthStatus();
                if (isLoggedIn) {
                    // User is already logged in, navigate to Home
                    router.replace('/screens/Home');
                }
            } catch (error) {
                console.log('Auth check error:', error);
            } finally {
                setCheckingAuth(false);
            }
        };

        checkUserAuth();
    }, []);

    // Local implementation of login
    const performLogin = async (identifier: string, password: string) => {
        try {
            const response = await fetch(`${port}login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save user data including username, email, and role
            await AsyncStorage.setItem('userToken', data.token);

            // Save complete user data for the drawer
            const userData = {
                id: data.user.id,
                username: data.user.username,
                email: data.user.email || null,
                role: data.user.role,
            };

            await AsyncStorage.setItem('userData', JSON.stringify(userData));

            console.log('User logged in successfully:', userData);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // Local implementation of guestLogin
    const guestLogin = async () => {
        try {
            const response = await fetch(`${port}guest`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Guest login failed');
            }

            // For guest login, store the token
            await AsyncStorage.setItem('userToken', data.token);

            // Create default guest user data
            const userData = {
                id: -1,
                username: 'Guest User',
                email: 'guest@watersensor.app',
                role: 'guest',
            };

            await AsyncStorage.setItem('userData', JSON.stringify(userData));

            console.log('Guest logged in successfully:', userData);
            return data;
        } catch (error) {
            console.error('Guest login error:', error);
            throw new Error((error as Error).message || 'Error accessing as guest');
        }
    };

    // Form validation
    const validateForm = (): boolean => {
        if (!formData.identifier.trim()) {
            Alert.alert('Validasi Gagal', 'Username atau email harus diisi');
            return false;
        }
        if (!formData.password) {
            Alert.alert('Validasi Gagal', 'Password harus diisi');
            return false;
        }
        return true;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Use our custom login function instead
            await performLogin(formData.identifier, formData.password);

            router.replace('/screens/Home');
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Login Gagal',
                error.message || 'Terjadi kesalahan, silakan coba lagi'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            console.log('Starting guest login...');

            // Use our custom guest login function
            await guestLogin();

            router.replace('/screens/Home');
        } catch (error: any) {
            console.error('Guest login complete error detail:', error);
            Alert.alert(
                'Akses Tamu Gagal',
                error.message || 'Gagal mengakses sebagai tamu. Coba lagi nanti.'
            );
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <View style={styles.loadingContainer}>
                <LottieView
                    source={require('@/assets/animations/loading-animation-square.json')}
                    autoPlay
                    loop
                    style={styles.lottieAnimation}
                />
                <Text style={styles.loadingText}>Memeriksa status login...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={['#FFE7E7', '#FFFFFF']}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 500 }}
                    >
                        <Image
                            source={require('@/assets/images/logo_nama.png')}
                            style={styles.logo}
                        />
                    </MotiView>

                    <MotiView
                        from={{ translateY: 50, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 200 }}
                        style={styles.authContainer}
                    >
                        <Text style={styles.title}>
                            Selamat Datang Kembali
                        </Text>
                        <Text style={styles.subtitle}>
                            Silakan login untuk melanjutkan monitoring
                        </Text>

                        <View style={styles.formContainer}>
                            <AnimatePresence>
                                <MotiView
                                    from={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ type: 'timing', duration: 250 }}
                                >
                                    {/* Username/Identifier Input */}
                                    <TextInput
                                        label="Username atau Email"
                                        mode="outlined"
                                        style={styles.input}
                                        value={formData.identifier}
                                        onChangeText={(text) => setFormData({ ...formData, identifier: text })}
                                        theme={{ colors: { primary: '#FF6B6B' } }}
                                        left={<TextInput.Icon icon="account" color="#FF6B6B" />}
                                        autoCapitalize="none"
                                    />

                                    {/* Password Input */}
                                    <TextInput
                                        label="Password"
                                        mode="outlined"
                                        secureTextEntry={!showPassword}
                                        style={styles.input}
                                        value={formData.password}
                                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                                        theme={{ colors: { primary: '#FF6B6B' } }}
                                        left={<TextInput.Icon icon="lock" color="#FF6B6B" />}
                                        right={
                                            <TextInput.Icon
                                                icon={showPassword ? "eye-off" : "eye"}
                                                color="#FF6B6B"
                                                onPress={() => setShowPassword(!showPassword)}
                                            />
                                        }
                                    />
                                </MotiView>
                            </AnimatePresence>

                            {/* Login Button */}
                            <TouchableOpacity
                                style={styles.authButton}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <LottieView
                                        source={require('@/assets/animations/loading-animation-square.json')}
                                        autoPlay
                                        loop
                                        style={{ width: 30, height: 30 }}
                                    />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>
                                            Masuk
                                        </Text>
                                        <AntDesign name="arrowright" size={20} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.divider} />
                                <Text style={styles.dividerText}>atau</Text>
                                <View style={styles.divider} />
                            </View>

                            {/* Guest Access Button */}
                            <TouchableOpacity
                                style={styles.guestButton}
                                onPress={handleGuestLogin}
                                disabled={loading}
                                activeOpacity={0.7}
                            >
                                <Feather name="user-check" size={20} color="#FF6B6B" />
                                <Text style={styles.guestText}>
                                    Lanjut sebagai Tamu
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.disclaimer}>
                                Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi kami
                            </Text>
                        </View>
                    </MotiView>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: '#FFE7E7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#555',
    },
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    logo: {
        width: 140,
        height: 140,
        alignSelf: 'center',
        marginTop: 70,
        marginBottom: 30,
        resizeMode: 'contain',
    },
    authContainer: {
        backgroundColor: 'white',
        borderRadius: 24,
        marginHorizontal: 20,
        padding: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2D3436',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#636E72',
        textAlign: 'center',
        marginBottom: 25,
    },
    formContainer: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 14,
    },
    authButton: {
        backgroundColor: '#FF6B6B',
        borderRadius: 15,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 25,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    dividerText: {
        paddingHorizontal: 10,
        color: '#636E72',
        fontSize: 13,
    },
    guestButton: {
        borderWidth: 1.5,
        borderColor: '#FFD3D3',
        borderRadius: 15,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        backgroundColor: '#FFF9F9',
        gap: 10,
    },
    guestText: {
        color: '#FF6B6B',
        fontWeight: '600',
        fontSize: 15,
    },
    disclaimer: {
        color: '#636E72',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    lottieAnimation: {
        width: 120,
        height: 120,
    },
});

export default LoginScreen;
