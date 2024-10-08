import { Stack } from "expo-router";
import "../global.css";
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import React, { useEffect, useState } from "react";
import CustomAppBar from "@/components/CustomAppBar";
import * as SplashScreen from 'expo-splash-screen';
import { View, Text } from 'react-native';
import * as Font from 'expo-font';
import { SvgXml } from 'react-native-svg';
import { MotiView } from 'moti';
import Entypo from '@expo/vector-icons/build/Entypo';
import { Easing } from 'react-native-reanimated';
import { LinearGradient } from "expo-linear-gradient";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const plainLogo = `<svg width="144" height="146" viewBox="0 0 144 146" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M63.8877 0.480426C59.1807 1.01942 53.9703 1.9896 53.0362 2.49266C52.1738 2.95978 52.2096 3.92997 53.1079 4.14556C53.5032 4.25336 53.8266 4.46896 53.8266 4.61271C53.8266 4.75643 54.2578 5.0439 54.761 5.29542C56.7372 6.19373 61.4084 10.6494 63.6721 13.7756C64.3909 14.7458 65.7564 17.1892 66.7266 19.1655C71.0385 28.0768 73.0867 37.3475 73.4459 49.888C73.5537 53.7329 73.8052 57.7934 74.0208 58.8714C74.3803 60.8117 75.6019 63.6862 76.5362 64.8003C78.6561 67.3874 81.8901 69.4356 84.6211 69.9385C87.7831 70.5494 141.431 70.9087 142.688 70.3338C143.695 69.8668 144.27 68.1779 143.874 66.8843C143.766 66.525 143.587 65.4109 143.479 64.4408C142.688 57.5058 140.748 49.4568 138.808 45.037C136.005 38.713 133.957 35.0118 130.974 30.8796C127.094 25.4897 122.818 20.8543 118.506 17.3329C117.823 16.758 116.996 16.0393 116.709 15.7519C115.954 14.9614 113.224 12.8772 112.972 12.8772C112.864 12.8772 111.355 11.9071 109.594 10.7213C107.834 9.53548 106.252 8.5653 106.073 8.5653C105.893 8.5653 105.354 8.2419 104.851 7.84666C104.348 7.45139 103.701 7.12799 103.342 7.12799C103.019 7.12799 102.695 6.98427 102.623 6.84052C102.516 6.55308 96.479 4.07371 93.3528 3.06758C84.8726 0.26483 74.0569 -0.669425 63.8877 0.480426ZM105.678 24.1242C106.684 28.508 108.337 32.3168 109.99 33.9699C110.421 34.4011 111.319 35.2993 111.966 35.982C112.649 36.6649 113.763 37.5273 114.481 37.8865C115.236 38.2819 115.883 38.6769 115.99 38.7847C116.314 39.1801 120.518 40.5456 121.416 40.5456C121.883 40.5456 122.674 40.869 123.177 41.2641C124.075 41.947 124.075 41.947 123.357 42.486C122.961 42.7733 121.919 43.0967 121.057 43.2406C120.195 43.3842 119.224 43.5998 118.901 43.7796C118.578 43.9591 117.356 44.4622 116.206 44.9292C115.056 45.3604 113.906 46.0433 113.691 46.3667C113.475 46.726 113.152 47.0135 112.936 47.0135C112.757 47.0135 111.822 47.804 110.888 48.7383C109.091 50.5709 107.474 53.6251 105.929 58.1526C105.426 59.6259 104.851 60.8476 104.672 60.8476C104.456 60.8476 103.737 59.1228 103.055 57.0388C101.617 52.7268 100.719 51.2177 97.9162 48.3429C95.7961 46.2228 92.0231 44.0669 89.0767 43.3484C88.1785 43.1328 86.9566 42.7016 86.3817 42.414L85.3038 41.9109L86.202 41.408C87.6034 40.5815 89.4359 39.8269 89.9749 39.8269C90.2625 39.8269 91.8436 39.1801 93.5323 38.4255C99.1378 35.8025 101.114 32.9636 104.348 22.9744C104.564 22.3276 105.426 23.0462 105.678 24.1242Z" fill="#E62F2A" class="svg-elem-1"></path>
<path d="M28.6738 15.8956C24.6492 16.8658 20.6966 18.5546 19.0078 20.0279C18.5407 20.4591 18.0376 20.7825 17.9298 20.7825C17.5345 20.7825 14.085 24.1601 13.007 25.6334C11.4619 27.6457 9.88085 30.6282 8.91066 33.359C8.22795 35.2635 8.04828 36.6649 7.90455 40.6893C7.76081 45.7916 8.01235 48.0915 9.19814 51.3255C9.95273 53.4814 11.6056 56.5715 12.9711 58.3324C14.3725 60.2008 17.9298 63.5425 18.5047 63.5425C18.7203 63.5425 19.0797 63.7581 19.2234 64.0096C20.0139 65.2673 25.2601 67.4591 29.1767 68.1779C32.9857 68.8605 39.9565 68.5013 42.5078 67.4952C42.9032 67.3155 43.945 66.9201 44.8435 66.5967C50.0179 64.6564 55.228 59.6259 58.2822 53.5892C59.8992 50.3553 60.3665 48.1274 60.546 42.8811C60.7258 38.0663 60.3304 35.443 58.9651 31.9217C57.8872 29.2268 55.1561 24.8069 54.3657 24.5195C54.0781 24.3757 53.8267 24.1602 53.8267 23.9446C53.8267 23.5493 53.5391 23.2618 51.0959 21.2137C50.0537 20.3872 49.0477 19.7045 48.8321 19.7045C48.6165 19.7045 48.4367 19.5607 48.4367 19.417C48.4367 18.914 42.8312 16.4346 40.8189 16.0753C37.7289 15.4644 30.9014 15.3566 28.6738 15.8956Z" fill="#E62F2A" class="svg-elem-2"></path>
<path d="M84.2616 76.3347C80.5247 77.3407 76.7518 80.0357 76.2486 82.0839C76.1408 82.5509 75.9253 82.9462 75.7455 82.9462C75.4221 82.9462 74.3802 85.3537 74.1646 86.7192C74.0568 87.294 73.8771 90.2046 73.7693 93.1871C73.4459 101.775 72.9789 105.656 71.3977 112.842C69.7807 120.245 66.7624 127.898 64.1752 131.096C63.6362 131.779 63.1692 132.462 63.1692 132.641C63.1692 133.001 59.0367 137.061 57.4917 138.283C56.9527 138.678 55.8389 139.505 55.0123 140.115C53.8266 140.978 53.4673 141.445 53.4673 142.235C53.4673 143.098 53.6468 143.278 54.6531 143.421C55.2638 143.565 56.7013 143.817 57.7793 144.032C58.8573 144.248 62.3068 144.679 65.4688 145.002C70.679 145.541 71.6492 145.541 76.9674 145.002C80.1294 144.679 83.7226 144.284 84.9084 144.104C93.245 142.81 103.018 139.001 110.708 134.079C113.655 132.21 117.787 128.94 117.787 128.509C117.787 128.365 118.002 128.222 118.29 128.222C118.865 128.222 127.345 119.526 128.89 117.334C134.46 109.501 137.766 103.248 140.065 96.2774C141.862 90.8875 143.156 84.9225 143.515 80.7544C143.73 77.8439 143.695 77.5922 142.904 76.7298L142.078 75.7596L114.05 75.7957C92.1309 75.8316 85.5913 75.9394 84.2616 76.3347Z" fill="#E62F2A" class="svg-elem-3"></path>
<path d="M0.322586 77.7719C-0.324205 78.5265 -0.0726749 80.3591 1.7599 87.6894C3.41281 94.337 4.95791 99.0802 6.39524 102.062C6.97016 103.177 7.50915 104.434 7.65287 104.901C8.08407 106.231 12.0726 113.453 12.8631 114.28C13.2584 114.711 13.5818 115.214 13.5818 115.394C13.5818 116.112 18.1812 121.79 21.6307 125.275C25.1881 128.868 29.3563 132.534 29.9673 132.534C30.1468 132.534 30.6499 132.929 31.117 133.432C31.9793 134.294 36.1476 136.486 38.3394 137.169C39.9206 137.672 46.1729 137.672 47.754 137.169C51.8862 135.839 55.767 133.037 56.7371 130.665C57.312 129.264 56.9169 126.892 55.9825 125.886C55.5514 125.419 53.4673 124.305 51.3831 123.371C47.9335 121.861 44.3762 119.598 45.4541 119.598C45.7059 119.598 46.9633 119.849 48.3289 120.173C49.8022 120.532 52.533 120.784 55.2638 120.819C59.0729 120.855 59.9711 120.748 61.1927 120.137C65.0376 118.232 65.5047 116.903 65.5047 107.92C65.5047 100.05 65.1813 98.11 63.1331 93.7619C61.2647 89.7376 57.7793 86.1083 54.078 84.2757C48.4367 81.509 50.1256 81.6885 31.3687 81.6885C11.5696 81.6885 10.5994 81.5449 3.44873 78.0953C1.29277 77.0532 1.00531 77.0173 0.322586 77.7719Z" fill="#E62F2A" class="svg-elem-4"></path>
</svg>
`;

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync(Entypo.font);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <LinearGradient
        // Use the LinearGradient component from expo-linear-gradient
        colors={['#ffffff', '#ffcccc']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} // Full-screen gradient
      >
        <View
          style={{
            width: 144,
            height: 146,
            justifyContent: 'flex-end',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <MotiView
            from={{ height: '0%' }}
            animate={{ height: '100%' }}
            transition={{
              type: 'timing',
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
            }}
            style={{
              width: '100%',
              position: 'absolute',
              bottom: 0,
              backgroundColor: '#E0F7FA',
              borderRadius: 100,
            }}
          />
          {/* Bouncing logo effect */}
          <MotiView
            from={{ translateY: -20, scale: 0.8 }}
            animate={{ translateY: 0, scale: 1 }}
            transition={{
              type: 'spring',
              duration: 800,
              delay: 500,
            }}
            style={{
              position: 'absolute',
              top: 0,
            }}
          >
            <SvgXml
              xml={plainLogo}
              width="144"
              height="146"
            />
          </MotiView>
        </View>
      </LinearGradient>
    );
  }

  return (
    <GluestackUIProvider mode="light">
      <Stack >
        <Stack.Screen name="screens" options={{ header: CustomAppBar }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </GluestackUIProvider>
  );
}
