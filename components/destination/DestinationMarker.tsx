import React, { useState } from 'react';
import { Marker } from 'react-native-maps';
import { Text, } from '@/components/ui/text';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { CloseIcon, Icon } from '@/components/ui/icon';

interface DestinationMarkerProps {
    destination: { latitude: number, longitude: number } | null;
    address: string | null;
}

const DestinationMarker: React.FC<DestinationMarkerProps> = ({ destination, address }) => {
    const [showModal, setShowModal] = useState<boolean>(false);

    const handleMarkerPress = () => {
        setShowModal(true);
    };

    return (
        <>
            {destination && (
                <Marker
                    coordinate={destination}
                    onPress={handleMarkerPress} // Menampilkan modal saat marker diklik
                />
            )}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false)
                }}
                size="md"
            >
                <ModalBackdrop />
                <ModalContent>
                    <ModalHeader>
                        <Heading size="md" className="text-typography-950">
                            Lokasi
                        </Heading>
                        <ModalCloseButton onPress={() => setShowModal(false)}>
                            <Icon
                                as={CloseIcon}
                                size="md"
                                className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
                            />
                        </ModalCloseButton>
                    </ModalHeader>
                    <ModalBody>
                        <Text size="sm" className="text-typography-500">
                            {address}
                        </Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="outline"
                            action="secondary"
                            onPress={() => {
                                setShowModal(false)
                            }}
                        >
                            <ButtonText>Cancel</ButtonText>
                        </Button>
                        <Button
                            onPress={() => {
                                setShowModal(false)
                            }}
                        >
                            <ButtonText>Explore</ButtonText>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default DestinationMarker;
