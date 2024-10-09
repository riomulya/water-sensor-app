import { StyleSheet, View } from 'react-native';
import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import TabBarComponent from './TabBarComponent';

const TabBar = ({ state, navigation, descriptors }: BottomTabBarProps) => {
    return (
        <View style={styles.tabBarStyle}>
            <TabBarComponent
                state={state}
                navigation={navigation}
                descriptors={descriptors}
            />
        </View>
    );
};

export default TabBar;

const styles = StyleSheet.create({
    tabBarStyle: {
        backgroundColor: 'white',
        flexDirection: 'row',
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        bottom: 40,
        left: 20,
        right: 20,
        height: 60,
        flex: 1,
        borderRadius: 15,
        shadowColor: '#7F5DF0',
        shadowOffset: {
            width: 10,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        elevation: 5,
    },
    // shadow: {
    //     shadowOffset: {
    //         width: 0,
    //         height: 10,
    //     },
    //     shadowOpacity: 0.25,
    //     shadowRadius: 3.5,
    //     elevation: 5,
    // },
});