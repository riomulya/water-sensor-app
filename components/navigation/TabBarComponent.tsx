import { Dimensions, Pressable, StyleSheet, } from 'react-native';
import React, { useEffect } from 'react';
import Animated, {
    runOnUI,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import {
    TabNavigationState,
    ParamListBase,
    NavigationHelpers,
} from '@react-navigation/native';
import { BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';

export const routes = {
    home: { name: 'Home', icon: 'home' },
    feeds: { name: 'Feeds', icon: 'barschart' },
    analysis: { name: 'Analysis', icon: 'scan1' },
    settings: { name: 'Settings', icon: 'setting' },
};

type Props = {
    state: TabNavigationState<ParamListBase>;
    descriptors: any;
    navigation: NavigationHelpers<ParamListBase, BottomTabNavigationEventMap>;
};

const { width } = Dimensions.get('window');

// 20 on each side for absolute positioning of the tab bar
// 20 on each side for the internal padding
const TAB_WIDTH = (width - 40 * 2) / 4;

const TabBarComponent = ({ state, navigation, descriptors }: Props) => {
    const translateX = useSharedValue(0);
    const focusedTab = state.index;

    const handleAnimate = (index: number) => {
        'worklet';
        translateX.value = withTiming(index * TAB_WIDTH, {
            duration: 400,
        });
    };

    useEffect(() => {
        runOnUI(handleAnimate)(focusedTab);
    }, [focusedTab]);

    const rnStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <>
            <Animated.View style={[{ ...styles.container, ...styles.shadow }, rnStyle]} />
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate({
                            name: route.name,
                            merge: true,
                            params: {},
                        });
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                const routeName = route.name.toLowerCase() as keyof typeof routes;
                const icon = routes[routeName]?.icon;

                // Animasi untuk ikon
                const iconScale = useSharedValue(isFocused ? 1.2 : 1);
                const iconOpacity = useSharedValue(isFocused ? 1 : 0.6);

                useEffect(() => {
                    iconScale.value = withTiming(isFocused ? 1.2 : 1, { duration: 300 });
                    iconOpacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 300 });
                }, [isFocused]);

                const animatedIconStyle = useAnimatedStyle(() => {
                    return {
                        transform: [{ scale: iconScale.value }],
                        opacity: iconOpacity.value,
                    };
                });

                // Animasi untuk label
                const labelOpacity = useSharedValue(isFocused ? 0 : 1);
                const labelTranslateY = useSharedValue(isFocused ? 10 : 0);

                useEffect(() => {
                    labelOpacity.value = withTiming(isFocused ? 0 : 1, { duration: 300 });
                    labelTranslateY.value = withTiming(isFocused ? 10 : 0, { duration: 300 });
                }, [isFocused]);

                const animatedLabelStyle = useAnimatedStyle(() => {
                    return {
                        opacity: labelOpacity.value,
                        transform: [{ translateY: labelTranslateY.value }],
                    };
                });

                return (
                    <Pressable
                        key={`route-${index}`}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.item}
                    >
                        <Animated.View style={animatedIconStyle}>
                            <AntDesign
                                name={icon as any}
                                size={24}
                                color={isFocused ? 'black' : '#f54848'}
                            />
                        </Animated.View>
                        {!isFocused && (
                            <Animated.Text style={[styles.label, animatedLabelStyle]}>
                                {label}
                            </Animated.Text>
                        )}
                    </Pressable>
                );
            })}
        </>
    );
};

export default TabBarComponent;

const styles = StyleSheet.create({
    container: {
        width: TAB_WIDTH,
        height: 40,
        backgroundColor: '#f54848',
        zIndex: 0,
        position: 'absolute',
        marginHorizontal: 20,
        borderRadius: 20,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        color: '#f54848',
        marginTop: 5, // space between the icon and the label
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
