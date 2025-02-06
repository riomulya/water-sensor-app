// import React, { useEffect, useState, useRef } from 'react';
// import { View, StyleSheet } from 'react-native';
// import { io, Socket } from 'socket.io-client';
// import Donut from '@/components/Donut';


// const SOCKET_URL = 'http://192.168.1.22:3000/'; // Ganti dengan IP server kamu

// const SensorsLayout: React.FC = () => {
//     const [sensorData, setSensorData] = useState({
//         accel_x: 0,
//         accel_y: 0,
//         accel_z: 0,
//         ph: 7, // Default pH 7
//         turbidity: 0,
//         temperature: 0,
//     });

//     const socketRef = useRef<Socket | null>(null);

//     useEffect(() => {
//         socketRef.current = io(SOCKET_URL);

//         socketRef.current.on('mqttData', (data) => {
//             console.log('📡 Data diterima:', data);

//             if (data?.msg) {
//                 setSensorData({
//                     accel_x: data.msg.accel_x || 0,
//                     accel_y: data.msg.accel_y || 0,
//                     accel_z: data.msg.accel_z || 0,
//                     ph: data.msg.ph || 7,
//                     turbidity: data.msg.turbidity || 0,
//                     temperature: data.msg.temperature || 0,
//                 });
//             }
//         });

//         return () => {
//             socketRef.current?.disconnect();
//         };
//     }, []);

//     return (
//         <View style={styles.container}>
//             <Donut
//                 percentage={(sensorData.accel_x)}
//                 radius={80}
//                 strokeWidth={12}
//                 duration={800}
//                 color="blue"
//                 textColor="black"
//                 suffix=" pH"
//                 max={100}
//             />
//             <Donut
//                 percentage={(sensorData.accel_y)}
//                 radius={80}
//                 strokeWidth={12}
//                 duration={800}
//                 color="blue"
//                 textColor="black"
//                 suffix=" pH"
//                 max={100}
//             /> <Donut
//                 percentage={(sensorData.accel_z)}
//                 radius={80}
//                 strokeWidth={12}
//                 duration={800}
//                 color="blue"
//                 textColor="black"
//                 suffix=" pH"
//                 max={100}
//             />
//             <Donut
//                 percentage={(sensorData.ph / 14) * 100} // pH 0-14 → % animasi
//                 radius={80}
//                 strokeWidth={12}
//                 duration={800}
//                 color="blue"
//                 textColor="black"
//                 suffix=" pH"
//                 max={100}
//             />
//             <Donut
//                 percentage={(sensorData.turbidity / 100) * 100} // Turbidity 0-100
//                 radius={80}
//                 strokeWidth={12}
//                 duration={800}
//                 color="green"
//                 textColor="black"
//                 suffix=" NTU"
//                 max={100}
//             />
//             <Donut
//                 percentage={(sensorData.temperature / 100) * 100} // Temperatur 0-100
//                 radius={80}
//                 strokeWidth={12}
//                 duration={800}
//                 color="red"
//                 textColor="black"
//                 suffix="°C"
//                 max={100}
//             />
//         </View>
//     );
// };

// export default SensorsLayout;

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: '#f4f4f4',
//     },
// });
