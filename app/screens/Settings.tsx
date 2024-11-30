import { View } from 'react-native'
import React, { Component } from 'react'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Progress, ProgressFilledTrack } from '@/components/ui/progress'
import { VStack } from '@/components/ui/vstack'
import { Text } from '@/components/ui/text'

const data = [
    {
        title: 'Accel X',
        value: 46,
        unit: 'm/s^2'
    }, {
        title: 'Accel Y',
        value: 46,
        unit: 'm/s^2'
    }, {
        title: 'Accel Z',
        value: 46,
        unit: 'm/s^2'
    }, {
        title: 'pH',
        value: 46,
        unit: 'pH'
    }, {
        title: 'Temperature',
        value: 6,
        unit: '°C'
    }, {
        title: 'Turbidity',
        value: 46,
        unit: 'NTU'
    },
]

export default class Settings extends Component {

    render() {
        return (
            <View>
                <Card size="lg" variant="outline" className='m-5'
                >
                    {data.map((item, index) => (
                        <VStack space="lg" key={index}>
                            <Heading>{item.title}</Heading>
                            <Progress value={item.title === "pH" ? Math.round((Number(item.value / 14)) * 100) : Number(item.value)} className="w-96 h-2" size="sm">
                                <ProgressFilledTrack className="bg-red-600" />
                            </Progress>
                            <Text size="md">{item.title === "pH" ? Math.round((Number(item.value / 14)) * 100) : Number(item.value) + ' ' + item.unit}</Text>
                        </VStack>
                    ))}
                </Card>
            </View>
        )
    }
}