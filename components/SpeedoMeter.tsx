import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import Svg, { Defs, Path, Stop, LinearGradient } from 'react-native-svg'
import Animated, {
    useSharedValue,
    withTiming,
    useAnimatedProps,
    Easing
} from 'react-native-reanimated'

const AnimatedPath = Animated.createAnimatedComponent(Path)

interface SpeedoMeterProps {
    value: number
    min: number
    max: number
    segments: Array<{ value: number; color: string; label: string }>
    unit: string
    size?: number
}

const SpeedoMeter = ({
    value,
    min = 0,
    max = 100,
    segments,
    unit,
    size = 200
}: SpeedoMeterProps) => {
    const progress = useSharedValue(0)
    const cx = size / 2
    const cy = size / 2
    const strokeWidth = 20
    const { PI, cos, sin } = Math
    const r = (size - strokeWidth) / 2
    const startAngle = PI + PI * 0.3
    const endAngle = 2 * PI - PI * 0.3
    const circumference = r * (PI - 0.6 * PI)

    const normalizedValue = Math.min(Math.max(value, min), max)
    const progressPercentage = ((normalizedValue - min) / (max - min)) * 100

    useEffect(() => {
        progress.value = withTiming(progressPercentage, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease)
        })
    }, [value])

    const animatedProps = useAnimatedProps(() => {
        const alpha = (progress.value / 100) * circumference
        return {
            strokeDashoffset: circumference - alpha,
        }
    })

    // Calculate current segment
    const currentSegment = segments.reduce((prev, curr) =>
        normalizedValue >= curr.value ? curr : prev
    )

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                {/* Background track */}
                <Path
                    d={`M ${cx - r * cos(startAngle)} ${cy - r * sin(startAngle)}
            A ${r} ${r} 0 1 0 ${cx - r * cos(endAngle)} ${cy - r * sin(endAngle)}`}
                    stroke="#e2e2e8"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                />

                {/* Progress track */}
                <AnimatedPath
                    d={`M ${cx - r * cos(startAngle)} ${cy - r * sin(startAngle)}
            A ${r} ${r} 0 1 0 ${cx - r * cos(endAngle)} ${cy - r * sin(endAngle)}`}
                    stroke="url(#grad)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    animatedProps={animatedProps}
                />

                <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                        {segments.map((segment, index) => (
                            <Stop
                                key={index}
                                offset={`${((segment.value - min) / (max - min)) * 100}%`}
                                stopColor={segment.color}
                            />
                        ))}
                    </LinearGradient>
                </Defs>
            </Svg>

            {/* Center Text */}
            <View style={styles.textContainer}>
                <Text style={styles.valueText}>
                    {normalizedValue.toFixed(1)}
                    <Text style={styles.unitText}>{unit}</Text>
                </Text>
                <Text style={[styles.statusText, { color: currentSegment.color }]}>
                    {currentSegment.label}
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        position: 'absolute',
        alignItems: 'center'
    },
    valueText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    unitText: {
        fontSize: 16,
        color: '#666',
    },
    statusText: {
        fontSize: 14,
        marginTop: 4,
        fontWeight: '500',
    }
})

export default SpeedoMeter