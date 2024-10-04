import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Tabs from '@/components/navigation/Tabs';

export default function Index() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs />
    </GestureHandlerRootView>
  );
}
