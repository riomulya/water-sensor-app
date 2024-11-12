import 'react-native-mapbox-gl';

declare module '@rnmapbox/maps' {
    export namespace MapboxGL {
        namespace TileServers {
            const MapLibre: string;
        }
    }
}
