import * as React from 'react';
import {
    Easing,
    TextInput,
    Animated,
    View,
    StyleSheet,
} from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface DonutProps {
    percentage?: number;
    radius?: number;
    strokeWidth?: number;
    duration?: number;
    color?: string;
    delay?: number;
    textColor?: string;
    max?: number;
    suffix?: string;
}

const Donut: React.FC<DonutProps> = ({
    percentage = 75,
    radius = 60,
    strokeWidth = 10,
    duration = 1000,
    color = "tomato",
    delay = 0,
    textColor,
    max = 100,
    suffix = '',  // Default tidak ada satuan
}) => {
    const animated = React.useRef(new Animated.Value(0)).current;
    const circleRef = React.useRef<Circle>(null);
    const inputRef = React.useRef<TextInput>(null);
    const circumference = 2 * Math.PI * radius;
    const halfCircle = radius + strokeWidth;

    const animation = (toValue: number) => {
        return Animated.timing(animated, {
            delay,
            toValue,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start(() => {
            animation(toValue === 0 ? percentage : 0);
        });
    };

    React.useEffect(() => {
        animation(percentage);
        animated.addListener((v) => {
            const maxPerc = (100 * v.value) / max;
            const strokeDashoffset = circumference - (circumference * maxPerc) / 100;
            if (inputRef.current) {
                // Tambahkan format angka dengan prefix dan suffix
                inputRef.current.setNativeProps({
                    text: `${Math.round(v.value)}${suffix}`,
                });
            }
            if (circleRef.current) {
                circleRef.current.setNativeProps({
                    strokeDashoffset,
                });
            }
        });

        return () => {
            animated.removeAllListeners();
        };
    }, [max, percentage]);

    return (
        <View style={{ width: radius * 2, height: radius * 2 }}>
            <Svg
                height={radius * 2}
                width={radius * 2}
                viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}>
                <G
                    rotation="-90"
                    origin={`${halfCircle}, ${halfCircle}`}>
                    <Circle
                        ref={circleRef}
                        cx="50%"
                        cy="50%"
                        r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDashoffset={circumference}
                        strokeDasharray={circumference}
                    />
                    <Circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinejoin="round"
                        strokeOpacity=".1"
                    />
                </G>
            </Svg>
            <AnimatedTextInput
                ref={inputRef}
                underlineColorAndroid="transparent"
                editable={false}
                defaultValue="0"
                style={[
                    StyleSheet.absoluteFillObject,
                    { fontSize: radius / 2, color: textColor ?? color },
                    styles.text,
                ]}
            />
        </View>
    );
};

export default Donut;

const styles = StyleSheet.create({
    text: { fontWeight: '900', textAlign: 'center' },
});
