import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Line, G, Text as SvgText } from 'react-native-svg';

interface GaugeProps {
    value: number;
    min?: number;
    max?: number;
    segments?: Array<number | { value: number; color: string; label: string }>;
    colors?: string[];
    width?: number;
    height?: number;
    unit?: string;
    size?: number;
    thickness?: number;
    color?: string;
    endAngle?: number;
}

const Gauge: React.FC<GaugeProps> = ({
    value,
    min = 0,
    max = 100,
    segments = [25, 50, 75],
    colors = ['#00FF00', '#FFA500', '#FF0000'],
    width = 200,
    height = 200,
    unit = '',
    size,
    thickness = 20,
    color,
    endAngle = 180
}) => {
    const finalWidth = size || width;
    const finalHeight = size || height;
    const radius = finalWidth / 2 - 10;
    const center = finalWidth / 2;
    const strokeWidth = thickness;
    const angle = endAngle === 330 ? 270 : 180;
    const startAngle = -90;
    const finalEndAngle = endAngle || 180;

    const useColors = color ? [color] : colors;

    const clampedValue = Math.min(Math.max(value, min), max);
    const valueAngle = ((clampedValue - min) / (max - min)) * angle;

    const needleAngle = startAngle + valueAngle;
    const needleLength = radius - strokeWidth - 10;
    const needleX = center + needleLength * Math.cos((needleAngle * Math.PI) / 180);
    const needleY = center + needleLength * Math.sin((needleAngle * Math.PI) / 180);

    const createArcPath = (start: number, end: number) => {
        const startRad = (start * Math.PI) / 180;
        const endRad = (end * Math.PI) / 180;

        return `
            M ${center + radius * Math.cos(startRad)} ${center + radius * Math.sin(startRad)}
            A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1
            ${center + radius * Math.cos(endRad)} ${center + radius * Math.sin(endRad)}
        `;
    };

    return (
        <View style={styles.container}>
            <Svg width={finalWidth} height={finalHeight}>
                <Path
                    d={createArcPath(startAngle, finalEndAngle)}
                    stroke="#e0e0e0"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                />

                {/* Segments */}
                {color ? (
                    <Path
                        d={createArcPath(startAngle, startAngle + valueAngle)}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                    />
                ) : (
                    segments.map((segment, index) => {
                        const segmentValue = typeof segment === 'number' ? segment : segment.value;
                        const segmentAngle = ((segmentValue - min) / (max - min)) * angle;
                        return (
                            <Path
                                key={index}
                                d={createArcPath(
                                    startAngle,
                                    startAngle + segmentAngle
                                )}
                                stroke={useColors[index]}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeLinecap="round"
                            />
                        );
                    })
                )}

                <G>
                    <Line
                        x1={center}
                        y1={center}
                        x2={needleX}
                        y2={needleY}
                        stroke="#2c3e50"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <Circle cx={center} cy={center} r="4" fill="#2c3e50" />
                </G>

                <SvgText
                    x={center}
                    y={center + 30}
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#2c3e50"
                >
                    {clampedValue.toFixed(1)}{unit}
                </SvgText>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default Gauge; 