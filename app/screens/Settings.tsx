import { View, Button } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
// import MQTTConnection from '@/components/mqtt/MqttConnection';
// import { MqttxOptions } from '../../constants/Mqttx';
// import init from 'react_native_mqtt';

const data = [
    { title: 'Accel X', value: 46, unit: 'm/s^2' },
    { title: 'Accel Y', value: 46, unit: 'm/s^2' },
    { title: 'Accel Z', value: 46, unit: 'm/s^2' },
    { title: 'pH', value: 6, unit: 'pH' },
    { title: 'Temperature', value: 46, unit: '°C' },
    { title: 'Turbidity', value: 46, unit: 'NTU' },
];

const Settings = () => {
    const [mqttConnected, setMqttConnected] = useState(false);
    const [mqttMessage, setMqttMessage] = useState('default');
    // const mqttConnect = new MQTTConnection();

    // useEffect(() => {
    //     // Menghubungkan ke broker MQTT
    //     mqttConnect.onMQTTConnect = onMQTTConnect;
    //     mqttConnect.onMQTTLost = onMQTTLost;
    //     mqttConnect.onMQTTMessageArrived = onMQTTMessageArrived;
    //     mqttConnect.onMQTTMessageDelivered = onMQTTMessageDelivered;

    //     mqttConnect.connect(MqttxOptions.host, MqttxOptions.port);

    //     // Cleanup koneksi MQTT ketika komponen di-unmount
    //     return () => {
    //         mqttConnect.close();
    //     };
    // }, []);

    // const onMQTTConnect = () => {
    //     console.log('App onMQTTConnect');
    //     // Setelah terkoneksi, subscribe ke topik 'testtopic/react'
    //     mqttConnect.subscribeChannel('testtopic/react');
    //     setMqttConnected(true);
    // };

    // const onMQTTLost = () => {
    //     console.log('App onMQTTLost');
    //     setMqttConnected(false);
    // };

    // const onMQTTMessageArrived = (message: any) => {
    //     console.log('App onMQTTMessageArrived: ', message);
    //     console.log('App onMQTTMessageArrived payloadString: ', message.payloadString);
    //     setMqttMessage(message.payloadString); // Menyimpan pesan yang diterima
    // };

    // const onMQTTMessageDelivered = (message: any) => {
    //     console.log('App onMQTTMessageDelivered: ', message);
    // };

    // // Fungsi untuk mengirim pesan (publish)
    // const sendMessage = () => {
    //     if (mqttConnect && mqttConnected) {
    //         const message = 'Message sent to channel testtopic/react'; // Pesan yang akan dikirim
    //         const topic = 'testtopic/react'; // Topik untuk publish

    //         mqttConnect.send(topic, message); // Mengirimkan pesan ke topik
    //         console.log(`Message "${message}" sent to topic "${topic}"`);
    //     }
    // };

    return (
        <View>
            <Card size="lg" variant="outline" className="m-5">
                {data.map((item, index) => (
                    <VStack space="lg" key={index}>
                        <Heading>{item.title}</Heading>
                        <Progress
                            value={Number(item.value)}
                            className="w-96 h-2"
                            size="sm"
                        >
                            <ProgressFilledTrack className="bg-red-600" />
                        </Progress>
                        <Text size="md">
                            {Number(item.value)} {item.unit}
                        </Text>
                    </VStack>
                ))}
            </Card>

            {/* <Text>{mqttConnected ? 'Connected to MQTT' : 'Disconnected from MQTT'}</Text>

            <Button
                title="Send Message"
                onPress={sendMessage} // Menggunakan sendMessage yang sudah didefinisikan
            /> */}
        </View>
    );
};

export default Settings;
