import React from 'react';
import { Text, Image, Dimensions, StyleSheet, } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import { Link, router } from 'expo-router';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;


export default function Index() {
  return (
    <LinearGradient
      colors={['#ffffff', '#ffcccc']}
      style={styles.container}
    >
      {/* Logo Section */}
      <MotiView
        from={{ translateY: -50, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          duration: 1000,
        }}
        style={styles.logoContainer}
      >
        <Image
          source={require('../assets/images/full-logo.png')} // Update path to your Vector.png file
          style={styles.logo}
        />
      </MotiView>

      {/* Text Section */}
      <MotiText
        from={{ translateY: 30, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{
          delay: 500,
          type: 'timing',
          duration: 800,
        }}
        style={styles.headerText}
      >
        SELAMAT DATANG DI
      </MotiText>

      <MotiText
        from={{ translateY: 30, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{
          delay: 700,
          type: 'timing',
          duration: 800,
        }}
        style={styles.subHeaderText}
      >
        PENGUKURAN DAN PREDIKSI KADAR AIR SUNGAI
      </MotiText>

      {/* Illustration Section */}
      <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 900,
          type: 'timing',
          duration: 700,
        }}
        style={styles.imageContainer}
      >
        <Image
          source={require('../assets/images/Group 229.png')} // Update path to your Group 229.png file
          style={styles.illustration}
        />
      </MotiView>

      {/* Button */}
      <MotiView
        from={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'timing',
          duration: 1500,
          delay: 1200,
        }}
        style={styles.button}
      >
        <Link href='./screens/Home'
          style={styles.buttonText}
          onPress={() => router.replace('/screens/Home')}
        >Lanjutkan
        </Link>
      </MotiView>
    </LinearGradient >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 144,
    height: 146,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  subHeaderText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#ff3333',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  illustration: {
    width: screenWidth * 1,
    height: screenHeight * 0.4,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#ff3333',
    width: screenWidth * 0.8,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});
