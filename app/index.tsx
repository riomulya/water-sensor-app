import React from 'react';
import Tabs from '@/components/navigation/Tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Index() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs />
    </GestureHandlerRootView>
  );
}
