import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useLocationPermission } from '../hooks/useLocationPermission';
import { useNavigation } from './useNavigation';

interface NavigationLayerProps {
  destination: {
    latitude: number | string;
    longitude: number | string;
    name: string;
    address?: string;
  };
  onClose: () => void;
  onReturn: () => void;
}

const NavigationLayer: React.FC<NavigationLayerProps> = ({
  destination,
  onClose,
  onReturn,
}) => {
  const insets = useSafeAreaInsets();
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<string>('Menghitung...');
  const [distance, setDistance] = useState<string>('Menghitung...');
  const webViewRef = useRef<WebView>(null);
  const { hasLocationPermission } = useLocationPermission();
  const [locationWatchId, setLocationWatchId] = useState<Location.LocationSubscription | null>(null);
  const [isNavigationInitialized, setIsNavigationInitialized] = useState(false);

  // Ensure coordinates are valid numbers
  const destLatitude = typeof destination.latitude === 'string'
    ? parseFloat(destination.latitude)
    : destination.latitude || 0;

  const destLongitude = typeof destination.longitude === 'string'
    ? parseFloat(destination.longitude)
    : destination.longitude || 0;

  // Validate coordinates before proceeding
  useEffect(() => {
    if (isNaN(destLatitude) || isNaN(destLongitude)) {
      console.error('Invalid destination coordinates:', { destLatitude, destLongitude });
      Alert.alert(
        'Error Navigasi',
        'Koordinat tujuan tidak valid, navigasi tidak dapat dimulai.',
        [{ text: 'OK', onPress: () => onClose() }]
      );
    }
  }, [destLatitude, destLongitude, onClose]);

  // Navigation HTML content - embeds a lightweight Leaflet routing component
  const navigationHTML = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
      <style>
        html, body, #map {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
        }
        .leaflet-routing-container {
          background: white;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          max-height: 200px;
          overflow-y: auto;
          width: 300px;
          position: absolute;
          bottom: 20px;
          left: 10px;
          z-index: 1000;
        }
        .leaflet-routing-alt {
          max-height: 150px;
        }
        .current-location-marker {
          border-radius: 50%;
          border: 3px solid #fff;
          background-color: #2563eb;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .destination-marker {
          animation: pulse 1.5s infinite;
          transform-origin: center bottom;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
      <script>
        // Map setup
        const map = L.map('map').fitWorld();
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Markers
        let currentMarker = null;
        let destinationMarker = null;
        let routingControl = null;
        
        // Custom icons
        const currentLocationIcon = L.divIcon({
          className: 'current-location-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        const destinationIcon = L.icon({
          iconUrl: 'https://dlvmrafkpmwfitrvgpgc.supabase.co/storage/v1/object/public/marker/waterways.png',
          iconSize: [35, 35],
          iconAnchor: [17, 35],
          className: 'destination-marker'
        });

        // Initialize navigation with destination coordinates
        const destination = {
          lat: ${destLatitude},
          lng: ${destLongitude},
          name: "${(destination.name || 'Tujuan').replace(/"/g, '\\"')}",
          address: "${(destination.address || '').replace(/"/g, '\\"')}"
        };
        
        // Add destination marker
        destinationMarker = L.marker([destination.lat, destination.lng], { 
          icon: destinationIcon 
        }).addTo(map)
          .bindPopup(
            '<div style="min-width: 200px; text-align: center;">' +
            '<strong>Tujuan: ' + destination.name + '</strong>' + 
            (destination.address ? '<br><small>' + destination.address + '</small>' : '') +
            '</div>'
          );
          
        // Fit to current view
        map.fitBounds([
          [destination.lat, destination.lng],
          [destination.lat, destination.lng]
        ]);
        
        // Function to update current position from React Native
        window.updateCurrentPosition = function(lat, lng, accuracy) {
          if (currentMarker) {
            currentMarker.setLatLng([lat, lng]);
          } else {
            currentMarker = L.marker([lat, lng], { 
              icon: currentLocationIcon,
              zIndexOffset: 1000
            }).addTo(map);
          }
          
          // Update routing if destination is set
          if (destinationMarker) {
            updateRoute(lat, lng);
          }
          
          // Fit bounds to show both markers
          if (currentMarker && destinationMarker) {
            const bounds = L.latLngBounds(
              currentMarker.getLatLng(),
              destinationMarker.getLatLng()
            );
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        };
        
        // Function to update the route
        function updateRoute(startLat, startLng) {
          // Remove previous control if exists
          if (routingControl) {
            map.removeControl(routingControl);
          }
          
          // Create new routing control
          routingControl = L.Routing.control({
            waypoints: [
              L.latLng(startLat, startLng),
              L.latLng(destination.lat, destination.lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            showAlternatives: false,
            lineOptions: {
              styles: [
                { color: '#2563eb', weight: 5, opacity: 0.7 }
              ]
            },
            createMarker: function() { return null; } // Don't create markers from routing
          }).addTo(map);
          
          // Get route information
          routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            const summary = routes[0].summary;
            
            // Send route information back to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'routeInfo',
              data: {
                distance: summary.totalDistance,
                time: summary.totalTime
              }
            }));
          });
        }
        
        // Custom control to recenter the map
        L.Control.Recenter = L.Control.extend({
          onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = L.DomUtil.create('a', '', container);
            button.innerHTML = '⌖';
            button.title = 'Pusatkan ke rute';
            button.style.fontSize = '18px';
            button.style.fontWeight = 'bold';
            button.style.textAlign = 'center';
            button.style.lineHeight = '30px';
            button.style.width = '30px';
            button.style.height = '30px';
            button.style.backgroundColor = '#fff';
            button.style.display = 'block';
            
            L.DomEvent.on(button, 'click', function() {
              if (currentMarker && destinationMarker) {
                const bounds = L.latLngBounds(
                  currentMarker.getLatLng(),
                  destinationMarker.getLatLng()
                );
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            });
            
            return container;
          }
        });
        
        // Add recenter control
        new L.Control.Recenter({ position: 'topright' }).addTo(map);
      </script>
    </body>
    </html>
  `;

  // Start location tracking
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    async function startLocationTracking() {
      if (hasLocationPermission && destination) {
        try {
          // Get initial location
          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });

          setCurrentLocation(initialLocation);

          // Start watching location
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              distanceInterval: 5, // Update every 5 meters
              timeInterval: 3000, // Or every 3 seconds
            },
            (location) => {
              setCurrentLocation(location);

              // Send location update to WebView if navigation is initialized
              if (isNavigationInitialized && webViewRef.current) {
                const locationData = {
                  type: 'updateUserLocation',
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  accuracy: location.coords.accuracy,
                };

                webViewRef.current.postMessage(JSON.stringify(locationData));
              }
            }
          );

          setLocationWatchId(locationSubscription);
        } catch (error) {
          console.error('Error setting up location tracking:', error);
        }
      }
    }

    startLocationTracking();

    // Cleanup location watching
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [hasLocationPermission, destination, isNavigationInitialized]);

  // Initialize navigation once we have user location and destination
  useEffect(() => {
    if (webViewRef.current && currentLocation && destination && !isNavigationInitialized) {
      // Ensure we have valid coordinates
      if (
        !currentLocation.coords ||
        isNaN(currentLocation.coords.latitude) ||
        isNaN(currentLocation.coords.longitude) ||
        isNaN(destLatitude) ||
        isNaN(destLongitude)
      ) {
        console.error('Invalid coordinates for navigation:', {
          userLat: currentLocation.coords?.latitude,
          userLng: currentLocation.coords?.longitude,
          destLat: destLatitude,
          destLng: destLongitude
        });
        return;
      }

      // Format navigation data with number validation
      const navigationData = {
        type: 'navigationData',
        userLatitude: currentLocation.coords.latitude,
        userLongitude: currentLocation.coords.longitude,
        destinationLatitude: destLatitude,
        destinationLongitude: destLongitude,
        destinationName: destination.name || 'Tujuan',
        destinationAddress: destination.address || ''
      };

      console.log('Sending navigation data to WebView:', navigationData);

      webViewRef.current.postMessage(JSON.stringify(navigationData));
      setIsNavigationInitialized(true);
    }
  }, [currentLocation, destination, isNavigationInitialized, destLatitude, destLongitude]);

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'exitNavigation') {
        // Clean up and exit navigation
        if (locationWatchId) {
          locationWatchId.remove();
          setLocationWatchId(null);
        }
        onClose();
      } else if (data.type === 'returnToMainMap') {
        // Return to main map but keep navigation active in background
        onReturn();
      } else if (data.type === 'routeInfo') {
        // Safely format distance to km with 1 decimal place
        const distanceValue = typeof data.data?.distance === 'number' ? data.data.distance : 0;
        const distanceInKm = (distanceValue / 1000).toFixed(1);
        setDistance(`${distanceInKm} km`);

        // Safely format time to minutes or hours and minutes
        const timeValue = typeof data.data?.time === 'number' ? data.data.time : 0;
        const totalMinutes = Math.floor(timeValue / 60);
        if (totalMinutes < 60) {
          setEstimatedTime(`${totalMinutes} menit`);
        } else {
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          setEstimatedTime(`${hours} jam ${minutes} menit`);
        }

        setNavigationStarted(true);
      } else if (data.type === 'routingError') {
        // Handle routing errors
        console.error('Routing error from WebView:', data.error);
        Alert.alert(
          'Error Navigasi',
          'Tidak dapat menghitung rute ke tujuan. Silakan coba lagi nanti.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  // Open external navigation app
  const openExternalNavigation = () => {
    const { name } = destination;
    const label = encodeURIComponent(name || 'Destination');

    let url;
    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${destLatitude},${destLongitude}&dname=${label}`;
    } else {
      url = `google.navigation:q=${destLatitude},${destLongitude}&title=${label}`;
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps in browser
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLatitude},${destLongitude}&travelmode=driving`);
      }
    });
  };

  // Get the correct asset URI based on platform
  const getAssetUri = () => {
    if (Platform.OS === 'android') {
      return { uri: 'file:///android_asset/navigation-leaflet.html' };
    } else {
      return require('../../assets/navigation-leaflet.html');
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={getAssetUri()}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        onMessage={handleWebViewMessage}
        onError={(e) => console.error('WebView error:', e)}
        cacheEnabled={false}
      />

      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top > 0 ? insets.top : 10 }
        ]}
      >
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Navigasi ke {destination.name}</Text>
      </View>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }
        ]}
      >
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color="#2563eb" />
            <Text style={styles.infoText}>{estimatedTime}</Text>
          </View>
          <View style={styles.infoSeparator} />
          <View style={styles.infoItem}>
            <Ionicons name="map-outline" size={20} color="#2563eb" />
            <Text style={styles.infoText}>{distance}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.externalNavButton}
          onPress={openExternalNavigation}
        >
          <Ionicons name="navigate" size={20} color="#fff" />
          <Text style={styles.externalNavText}>Buka di Aplikasi Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  infoSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
  },
  externalNavButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalNavText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NavigationLayer; 