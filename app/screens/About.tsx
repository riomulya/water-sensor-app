import { View, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

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

const About = () => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <LinearGradient
                colors={['#FFF0F0', '#FFE5E5', '#FFDADA']}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <MotiView
                        style={styles.header}
                        from={{ opacity: 0, translateY: -20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 300 }}
                    >
                        <Heading style={styles.title}>FAQ</Heading>
                        <Text style={styles.subtitle}>Pertanyaan yang Sering Diajukan</Text>
                    </MotiView>

                    {faqData.map((item, index) => (
                        <MotiView
                            key={index}
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 50 }}
                        >
                            <TouchableOpacity
                                onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                activeOpacity={0.9}
                            >
                                <Card style={styles.card}>
                                    <MotiView
                                        animate={{
                                            height: expandedIndex === index ? 300 : 70,
                                            backgroundColor: expandedIndex === index ? '#FEF2F2' : '#FFFFFF'
                                        }}
                                        transition={{ type: 'spring' }}
                                        style={styles.cardContent}
                                    >
                                        <View style={styles.cardHeader}>
                                            <Heading
                                                style={styles.question}
                                                numberOfLines={expandedIndex === index ? 3 : 2}
                                            >
                                                {item.question}
                                            </Heading>
                                            <MotiView
                                                animate={{ rotate: expandedIndex === index ? '180deg' : '0deg' }}
                                                transition={{ type: 'timing', duration: 200 }}
                                            >
                                                <MaterialIcons
                                                    name="keyboard-arrow-down"
                                                    size={28}
                                                    color="#EF4444"
                                                />
                                            </MotiView>
                                        </View>

                                        <MotiView
                                            animate={{
                                                opacity: expandedIndex === index ? 1 : 0,
                                                translateY: expandedIndex === index ? 0 : -10
                                            }}
                                            style={styles.answerContainer}
                                        >
                                            <View style={styles.divider} />
                                            <Text style={styles.answer}>
                                                {item.answer}
                                            </Text>
                                        </MotiView>
                                    </MotiView>
                                </Card>
                            </TouchableOpacity>
                        </MotiView>
                    ))}
                </ScrollView>
                <View style={{ height: 100 }} />
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    header: {
        marginBottom: 20,
        height: 100,
    },
    title: {
        fontSize: 34,
        color: '#B91C1C',
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '800',
        paddingTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#DC2626',
        textAlign: 'center',
    },
    card: {
        borderRadius: 15,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardContent: {
        padding: 20,
        minHeight: 100,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'visible',
    },
    question: {
        fontSize: 16,
        color: '#7F1D1D',
        flex: 1,
        marginRight: 15,
        fontWeight: '600',
        lineHeight: 22, // Tambahkan line height
        flexShrink: 1,
    },
    answerContainer: {
        paddingTop: 10,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#FECACA',
        marginVertical: 8,
    },
    answer: {
        fontSize: 14,
        color: '#57534E',
        lineHeight: 20,
    },
});

export default About;
