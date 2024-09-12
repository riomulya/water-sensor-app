import { useReducer } from 'react';
import { StyleSheet, Pressable, View, Image, StatusBar } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';

const HomeScreen = () => {
  const [dark, toggle] = useReducer((s) => !s, true);

  const colorMode = dark ? 'dark' : 'light';
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle={dark ? 'light-content' : 'dark-content'} />

      <Pressable onPress={toggle} style={styles.container}>
        <MotiView
          transition={{
            type: 'timing',
          }}
          style={[styles.container, styles.padded]}
          animate={{ backgroundColor: dark ? '#fc0335' : '#ffffff' }}
        >
          <Skeleton colorMode={colorMode} radius="round" height={75} width={75} />
          <Spacer />
          <Skeleton colorMode={colorMode} width={250} />
          <Spacer height={8} />
          <Skeleton colorMode={colorMode} width={'100%'} />
          <Spacer height={8} />
          <Skeleton colorMode={colorMode} width={'100%'} />
        </MotiView>
      </Pressable>
    </>
  )
}

export default HomeScreen

const Spacer = ({ height = 16 }) => <View style={{ height }} />;

const styles = StyleSheet.create({
  shape: {
    justifyContent: 'center',
    height: 250,
    width: 250,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  padded: {
    padding: 16,
  },
});