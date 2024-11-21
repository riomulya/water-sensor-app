import { View, StyleSheet } from 'react-native';
import React from 'react';
import { Input, InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

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
    ];

    return (
        <View style={styles.container}>
            <View style={{ ...styles.searchBox }} >
                <View style={{ ...styles.inputContainer }}>
                    <Input variant="outline" size="md" isDisabled={false} isInvalid={false} isReadOnly={false} className='flex-1'  >
                        <InputField
                            placeholder='Cari Data ...'
                        />
                    </Input>
                </View>
            </View>

            <Card size="lg" variant="outline" className="m-3">
                <Heading size="md" className="mb-1">
                    Quick Start
                </Heading>
                <Text size="sm">Start building your next project in minutes</Text>
            </Card>

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
});