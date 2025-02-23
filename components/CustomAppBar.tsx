import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const CustomAppBar = () => {
    return (
        <LinearGradient
            colors={['#ffffff', '#ffcccc']}
            start={{ x: 0, y: .1 }}
            end={{ x: 1, y: .1 }}   
            style={{ ...styles.appBar, ...styles.shadow }}
        >
            <View style={styles.logoContainer} >
                <Image 
                    source={require('../assets/images/logo.png')}
                    style={styles.logoImage}
                />
            </View>
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    appBar: {
        height: 0, // Tinggi AppBar
        opacity: 0,
        paddingTop: 40, // Untuk mengatur posisi di bawah status bar
        paddingHorizontal: 16, // Padding kiri dan kanan
        flexDirection: 'row', // Mengatur logo dan teks berjajar horizontal
        alignItems: 'center', // Vertikal tengah
        justifyContent: 'space-between', // Mengatur jarak antara logo dan teks
        elevation: 10, // Shadow untuk Android
        shadowColor: '#000', // Warna bayangan
        shadowOffset: { width: 0, height: 2 }, // Posisi bayangan
        shadowOpacity: 0.3, // Transparansi bayangan
        shadowRadius: 4, // Radius bayangan
        backgroundColor: 'transparent', // Warna AppBar, transparan karena digantikan dengan gradasi
    },
    logoContainer: {
        flex: 1, // Agar logo berada di sisi kiri
    },
    logoImage: {
        width: 70, // Ukuran logo
        height: 70, // Sesuaikan tinggi logo
        resizeMode: 'contain', // Menjaga proporsi logo
    },
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
});

export default CustomAppBar;
