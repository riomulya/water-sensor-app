import { View, StyleSheet, ScrollView } from 'react-native';
import React from 'react';
import { Input, InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Image } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Link } from '@/components/ui/link';

const AnalysisScreen = () => {
    const data = [
        {
            title: 'Sungai Nil',
            location: 'Jl. Raya Puspiptek, Buaran...',
            date: 'Monday, 21-5-2024',
            image: 'https://via.placeholder.com/150',
        },
        {
            title: 'Sungai Kapuas',
            location: 'Jl. Raya Puspiptek, Buaran...',
            date: 'Monday, 21-5-2024',
            image: 'https://via.placeholder.com/150',
        },
        {
            title: 'Sungai Mahakam',
            location: 'Jl. Raya Puspiptek, Buaran...',
            date: 'Monday, 21-5-2024',
            image: 'https://via.placeholder.com/150',
        },
        {
            title: 'Sungai Barito',
            location: 'Jl. Raya Puspiptek, Buaran...',
            date: 'Monday, 21-5-2024',
            image: 'https://via.placeholder.com/150',
        },
        {
            title: 'Sungai Barito',
            location: 'Jl. Raya Puspiptek, Buaran...',
            date: 'Monday, 21-5-2024',
            image: 'https://via.placeholder.com/150',
        }, {
            title: 'Sungai Barito',
            location: 'Jl. Raya Puspiptek, Buaran...',
            date: 'Monday, 21-5-2024',
            image: 'https://via.placeholder.com/150',
        }, {
            title: 'Sungai Barito',
            location: 'Jl. Raya Puspiptek, Buaran...',
            date: 'Monday, 21-5-2024',
            image: 'https://via.placeholder.com/150',
        },
    ];

    return (
        <View style={styles.container}>
            <View style={{ ...styles.searchBox, zIndex: 1 }} >
                <View style={{ ...styles.inputContainer }}>
                    <Input variant="outline" size="md" isDisabled={false} isInvalid={false} isReadOnly={false} className='flex-1'  >
                        <InputField
                            placeholder='Cari Data ...'
                        />
                    </Input>
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.scrollViewContainer}>
                {data.map((item, index) => (
                    <Card size="lg" variant="outline" className={`m-3 ${index === data.length - 1 ? 'mb-28' : ''}`}
                    >
                        <View className='flex flex-row'>
                            <Image
                                source={require('../../assets/images/Nature.png')}
                                // className="mb-6 h-[240px] rounded-md"
                                alt="Nature"
                            />
                            <View className='ml-3'>
                                <Heading size="lg" className="mb-1">
                                    {item.title}
                                </Heading>
                                <Text size="sm" className='color-gray-400' >{item.location}</Text>
                                <Text size="sm" className='color-gray-400'>{item.date}</Text>
                                <Link>
                                    <Text size="lg" className='color-red-600'>Cek Selengkapnya <FontAwesome6 name="arrow-right-from-bracket" size={15}></FontAwesome6></Text>
                                </Link>
                            </View>
                        </View>
                    </Card>
                ))}
            </ScrollView>
        </View >
    );
};

export default AnalysisScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    searchBox: {
        position: 'absolute',
        top: 6,
        width: '90%',
        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
        zIndex: 0,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    input: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderColor: '#ccc',
        borderWidth: 1,
    },
    clearButton: {
        marginLeft: 8,
        marginRight: 5,
    },
    suggestions: {
        backgroundColor: 'white',
        marginTop: 5,
        borderRadius: 8,
        padding: 5,
    },
    suggestionText: {
        padding: 10,
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
    },
    scrollViewContainer: {
        paddingTop: 80, // Memberikan padding di atas untuk mencegah konten tertutup oleh search bar
        paddingBottom: 20, // Menambahkan ruang bawah agar lebih nyaman scrollnya
    },
});