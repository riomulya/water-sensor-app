import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
    dialogContainer: {
        backgroundColor: 'white',
        padding: 24,
        margin: 20,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    actionButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 8,
        overflow: 'hidden',
    },
    buttonText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        textAlign: 'center',
    },
});

interface AlertDialogProps {
    visible: boolean;
    title: string;
    message: string;
    primaryAction?: {
        label: string;
        onPress: () => void;
    };
    secondaryAction?: {
        label: string;
        onPress: () => void;
    };
    icon?: React.ReactNode;
}

export const AlertDialog = ({
    visible,
    title,
    message,
    primaryAction,
    secondaryAction,
    icon,
}: AlertDialogProps) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={secondaryAction?.onPress}
        >
            <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center' }}
                activeOpacity={1}
                onPressOut={secondaryAction?.onPress}
            >
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ flex: 1, justifyContent: 'center' }}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.dialogContainer}>
                        <LinearGradient
                            colors={['#ff6b6b', '#ff4757']}
                            style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
                        />

                        <MaterialIcons
                            name="battery-charging-full"
                            size={56}
                            color="#ff4757"
                            style={{ marginBottom: 16 }}
                        />

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    {
                                        backgroundColor: '#f8f9fa',
                                        borderWidth: 1,
                                        borderColor: '#e9ecef'
                                    }
                                ]}
                                onPress={secondaryAction?.onPress}
                            >
                                <Text style={[styles.buttonText, { color: '#495057' }]}>
                                    {secondaryAction?.label}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={primaryAction?.onPress}
                            >
                                <LinearGradient
                                    colors={['#ff6b6b', '#ff4757']}
                                    style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                                />
                                <Text style={[styles.buttonText, { color: 'white' }]}>
                                    {primaryAction?.label}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </MotiView>
            </TouchableOpacity>
        </Modal>
    );
};

// Contoh implementasi untuk battery optimization dialog
export const BatteryOptimizationDialog = ({ visible, onClose, onConfirm }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) => (
    <AlertDialog
        visible={visible}
        title="Optimasi Baterai Diperlukan 🔋" message="Aplikasi membutuhkan pengaturan optimasi baterai dimatikan untuk memastikan monitoring sensor berjalan lancar."
        icon={<MaterialIcons name="battery-charging-full" size={48} color="#ff4757" />}
        primaryAction={{
            label: 'Buka Pengaturan',
            onPress: onConfirm
        }}
        secondaryAction={{
            label: 'Nanti Saja',
            onPress: onClose
        }}
    />
);
