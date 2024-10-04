import React, { useEffect, useState } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const Loadinganimation = () => {
  const [active, setActive] = useState(false);
  const animatedFill = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(animatedFill, {
      toValue: active ? 1 : 0,
      duration: 900,
      delay: active ? 1200 : 0,
      useNativeDriver: false,
    }).start();
  }, [active]);

  const fillInterpolation = animatedFill.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgb(230, 47, 42)'],
  });

  return (
    <TouchableOpacity onPress={() => setActive(!active)}>
      <Svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
      >
        <AnimatedPath
          d="M10 10 H 90 V 90 H 10 L 10 10" // Example path
          fill={fillInterpolation}
        />
      </Svg>
    </TouchableOpacity>
  );
};

export default Loadinganimation;
