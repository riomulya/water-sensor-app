// DestinationMarker.tsx
import React from 'react';
import { Text } from 'react-native';
import { Marker, Callout } from 'react-native-maps';

interface DestinationMarkerProps {
    destination: { latitude: number, longitude: number } | null;
    address: string | null;  // Tambahkan alamat sebagai props
}

const DestinationMarker: React.FC<DestinationMarkerProps> = ({ destination, address }) => {
    return (
        <>
            {destination && (
                <Marker coordinate={destination}>
                    <Callout>
                        <React.Fragment>
                            <Text>Destinasi</Text>
                            {address ? <Text>{address}</Text> : <Text>Memuat alamat...</Text>}
                        </React.Fragment>
                    </Callout>
                </Marker>
            )}
        </>
    );
};

export default DestinationMarker;
