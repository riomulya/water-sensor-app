import * as React from 'react';
import {
    TextInput,
    View,
    StyleSheet,
} from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';

interface DonutProps {
    percentage?: number;
    radius?: number;
    strokeWidth?: number;
    color?: string;
    textColor?: string;
    max?: number;
    suffix?: string;
}

const Donut: React.FC<DonutProps> = ({
    percentage = 75,
    radius = 60,
    strokeWidth = 10,
    color = "tomato",
    textColor,
    max = 100,
    suffix = '',  // Default tidak ada satuan
}) => {
    const circleRef = React.useRef<Circle>(null);
    const inputRef = React.useRef<TextInput>(null);
    const circumference = 2 * Math.PI * radius;
    const halfCircle = radius + strokeWidth;

    React.useEffect(() => {
        const maxPerc = (100 * percentage) / max;
        const strokeDashoffset = circumference - (circumference * maxPerc) / 100;

        if (inputRef.current) {
            inputRef.current.setNativeProps({
                text: `${Math.round(percentage)}${suffix}`,
            });
        }

        if (circleRef.current) {
            circleRef.current.setNativeProps({
                strokeDashoffset,
            });
        }
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
            <TextInput
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
