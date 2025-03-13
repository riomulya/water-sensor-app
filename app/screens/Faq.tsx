import { View, ScrollView, StyleSheet } from 'react-native';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { MotiView } from 'moti';

const faqData = [
    {
        question: "Apa tujuan dari platform ini?",
        answer: "Platform ini bertujuan untuk memfasilitasi pemantauan kualitas air sungai secara real-time dengan memanfaatkan teknologi sensor dan IoT (Internet of Things). Tujuannya adalah menyediakan data yang akurat, terkini, dan relevan untuk mendukung penelitian, analisis, serta pengambilan keputusan terkait pengelolaan sumber daya air."
    },
    {
        question: "Bagaimana cara mengakses data kualitas air?",
        answer: "Data kualitas air dapat diakses dengan mudah melalui platform ini. Pengguna dapat melihat berbagai parameter kualitas air, seperti tingkat kekeruhan (turbidity), pH, suhu, dan parameter lainnya yang ditampilkan secara real-time pada antarmuka platform."
    },
    {
        question: "Siapa yang dapat menggunakan platform ini?",
        answer: "Platform ini dirancang untuk digunakan oleh berbagai pihak, termasuk peneliti, instansi pemerintah, organisasi lingkungan, dan masyarakat umum yang tertarik untuk memantau dan memahami kondisi kualitas air sungai."
    },
    {
        question: "Apa keunggulan platform ini?",
        answer: "Keunggulan platform ini terletak pada kemampuannya menyajikan data secara real-time. Selain itu, platform ini dilengkapi dengan fitur prediksi kualitas air sungai untuk memberikan perkiraan kondisi air di masa mendatang."
    },
    {
        question: "Kekeruhan (Turbidity)",
        answer: "Kekeruhan mengukur tingkat kejernihan air yang dipengaruhi oleh partikel tersuspensi seperti lumpur, plankton, atau bahan organik. Satuan yang umum digunakan adalah NTU (Nephelometric Turbidity Units)."
    },
    {
        question: "pH (Tingkat Keasaman atau Kebasaan)",
        answer: "pH mengukur tingkat keasaman atau kebasaan air pada skala 0–14. Air sungai dengan pH netral (sekitar 7) dianggap ideal untuk mendukung kehidupan akuatik."
    },
    {
        question: "Temperature (Suhu)",
        answer: "Suhu air memengaruhi metabolisme organisme air, kelarutan oksigen, dan keseimbangan ekosistem."
    },
];

const Faq = () => {
    return (
        <ScrollView style={styles.container}>
            <View>
                {faqData.map((item, index) => (
                    <MotiView
                        key={index}
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 300 }}
                    >
                        <Card style={styles.card}>
                            <Heading style={styles.question}>{item.question}</Heading>
                            <Text style={styles.answer}>{item.answer}</Text>
                        </Card>
                    </MotiView>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 16,
    },
    card: {
        marginVertical: 10,
        padding: 16,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    question: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    answer: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
});

export default Faq;
