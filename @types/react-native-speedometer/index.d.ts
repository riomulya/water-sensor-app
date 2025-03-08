declare module 'react-native-speedometer-chart' {
    import { Component } from 'react';
    interface SpeedometerProps {
        value: number;
        totalValue: number;
        size?: number;
        outerColor?: string;
        internalColor?: string;
        showText?: boolean;
        text?: string;
        textStyle?: object;
        showLabels?: boolean;
        labelStyle?: object;
        showPercent?: boolean;
        percentStyle?: object;
    }
    export default class Speedometer extends Component<SpeedometerProps> { }
} 