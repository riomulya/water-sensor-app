import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
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
import { loginUser, registerUser, guestLogin, checkAuthStatus } from '@/controllers/auth';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { port } from '@/constants/https';

const { width } = Dimensions.get('window');

interface FormData {
    identifier: string;
    email: string;
    password: string;
    confirmPassword: string;
}

const LoginScreen = () => {
    const [isLogin, setIsLogin] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        identifier: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    // Local implementation of guestLogin
    const guestLogin = async () => {
        try {
            const response = await fetch(`${port}auth/guest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Guest login failed');
            }

            await AsyncStorage.setItem('userToken', data.token);
            await AsyncStorage.setItem('userData', JSON.stringify({ role: 'guest' }));
            return data;
        } catch (error) {
            throw new Error((error as Error).message || 'Error accessing as guest');
        }
    };

    // Local implementation of registerUser
    const registerUser = async (userData: {
        username: string;
        email?: string;
        password: string;
    }) => {
        try {
            const response = await fetch(`${port}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            await AsyncStorage.setItem('userToken', data.token);
            await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            return data;
        } catch (error) {
            throw new Error((error as Error).message || 'Error during registration');
        }
    };

    // Form validation
    const validateForm = (): boolean => {
        if (isLogin) {
            if (!formData.identifier.trim()) {
                Alert.alert('Validasi Gagal', 'Username atau email harus diisi');
                return false;
            }
            if (!formData.password) {
                Alert.alert('Validasi Gagal', 'Password harus diisi');
                return false;
            }
        } else {
            if (!formData.identifier.trim()) {
                Alert.alert('Validasi Gagal', 'Username harus diisi');
                return false;
            }
            if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                Alert.alert('Validasi Gagal', 'Format email tidak valid');
                return false;
            }
            if (!formData.password || formData.password.length < 6) {
                Alert.alert('Validasi Gagal', 'Password minimal 6 karakter');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                Alert.alert('Validasi Gagal', 'Password tidak sama');
                return false;
            }
        }
        return true;
    };

    const handleAuth = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (isLogin) {
                await loginUser(formData.identifier, formData.password);
            } else {
                await registerUser({
                    username: formData.identifier,
                    email: formData.email,
                    password: formData.password
                });
            }
            router.replace('/screens/Home');
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                isLogin ? 'Login Gagal' : 'Registrasi Gagal',
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
            // Try to ping the server first to check connectivity
            try {
                const pingResponse = await fetch(`${port}`, {
                    method: 'GET',
                    headers: { 'Accept': 'text/plain' }
                });
                console.log('Server ping status:', pingResponse.status);
            } catch (pingError) {
                console.error('Server ping failed:', pingError);
                Alert.alert(
                    'Koneksi Server Gagal',
                    'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.'
                );
                setLoading(false);
                return;
            }

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

    const toggleAuthMode = () => {
        Haptics.selectionAsync();
        setIsLogin(!isLogin);
        // Reset form data
        setFormData({
            identifier: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
    };

    if (checkingAuth) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
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
                            source={require('@/assets/images/logo.png')}
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
                            {isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isLogin
                                ? 'Silakan login untuk melanjutkan monitoring'
                                : 'Daftar untuk memulai monitoring kualitas air'}
                        </Text>

                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[styles.toggleButton, isLogin && styles.activeToggle]}
                                onPress={() => setIsLogin(true)}
                            >
                                <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>Login</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.toggleButton, !isLogin && styles.activeToggle]}
                                onPress={() => setIsLogin(false)}
                            >
                                <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>Daftar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formContainer}>
                            <AnimatePresence>
                                <MotiView
                                    key={isLogin ? 'login' : 'register'}
                                    from={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ type: 'timing', duration: 250 }}
                                >
                                    {/* Username/Identifier Input */}
                                    <TextInput
                                        label={isLogin ? 'Username atau Email' : 'Username'}
                                        mode="outlined"
                                        style={styles.input}
                                        value={formData.identifier}
                                        onChangeText={(text) => setFormData({ ...formData, identifier: text })}
                                        theme={{ colors: { primary: '#FF6B6B' } }}
                                        left={<TextInput.Icon icon="account" color="#FF6B6B" />}
                                        autoCapitalize="none"
                                    />

                                    {/* Email Input (Register only) */}
                                    {!isLogin && (
                                        <TextInput
                                            label="Email (Opsional)"
                                            mode="outlined"
                                            style={styles.input}
                                            keyboardType="email-address"
                                            value={formData.email}
                                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                                            theme={{ colors: { primary: '#FF6B6B' } }}
                                            left={<TextInput.Icon icon="email" color="#FF6B6B" />}
                                            autoCapitalize="none"
                                        />
                                    )}

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

                                    {/* Confirm Password Input (Register only) */}
                                    {!isLogin && (
                                        <TextInput
                                            label="Konfirmasi Password"
                                            mode="outlined"
                                            secureTextEntry={!showConfirmPassword}
                                            style={styles.input}
                                            value={formData.confirmPassword}
                                            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                                            theme={{ colors: { primary: '#FF6B6B' } }}
                                            left={<TextInput.Icon icon="lock-check" color="#FF6B6B" />}
                                            right={
                                                <TextInput.Icon
                                                    icon={showConfirmPassword ? "eye-off" : "eye"}
                                                    color="#FF6B6B"
                                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                                />
                                            }
                                        />
                                    )}
                                </MotiView>
                            </AnimatePresence>

                            {/* Auth Button */}
                            <TouchableOpacity
                                style={styles.authButton}
                                onPress={handleAuth}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>
                                            {isLogin ? 'Masuk' : 'Daftar Sekarang'}
                                        </Text>
                                        <AntDesign name="arrowright" size={20} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Switch between Login and Register */}
                            <TouchableOpacity
                                onPress={toggleAuthMode}
                                style={styles.switchAuth}
                            >
                                <Text style={styles.switchText}>
                                    {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                                    <Text style={styles.switchTextBold}>
                                        {isLogin ? 'Daftar sekarang' : 'Login'}
                                    </Text>
                                </Text>
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
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 25,
        backgroundColor: '#F7F7F7',
        borderRadius: 15,
        padding: 4,
    },
    toggleButton: {
        paddingHorizontal: 25,
        paddingVertical: 10,
        borderRadius: 12,
        width: '48%',
        alignItems: 'center',
    },
    activeToggle: {
        backgroundColor: '#FF6B6B',
    },
    toggleText: {
        color: '#636E72',
        fontWeight: '600',
        fontSize: 15,
    },
    activeToggleText: {
        color: 'white',
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
    switchAuth: {
        alignItems: 'center',
        marginTop: 20,
    },
    switchText: {
        color: '#636E72',
        fontSize: 14,
    },
    switchTextBold: {
        color: '#FF6B6B',
        fontWeight: '700',
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
});

export default LoginScreen;
