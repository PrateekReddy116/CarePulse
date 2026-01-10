import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface OpenStreetMapProps {
    latitude: number;
    longitude: number;
    markers?: Array<{ lat: number; lng: number; label: string; color?: string }>;
    zoom?: number;
    style?: any;
    isDark?: boolean;
}

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
    latitude,
    longitude,
    markers = [],
    zoom = 15,
    style,
    isDark = false,
}) => {
    // Choose tile layer based on theme
    const tileLayer = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // Dark mode tiles
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // Light mode tiles

    const attribution = isDark
        ? '© OpenStreetMap contributors © CARTO'
        : '© OpenStreetMap contributors';

    // Generate HTML with Leaflet.js for OpenStreetMap
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; background: ${isDark ? '#1a1a1a' : '#ffffff'}; }
            #map { width: 100%; height: 100vh; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map').setView([${latitude}, ${longitude}], ${zoom});
            
            L.tileLayer('${tileLayer}', {
                attribution: '${attribution}',
                maxZoom: 19
            }).addTo(map);
            
            // Add user location marker
            var userIcon = L.divIcon({
                className: 'user-marker',
                html: '<div style="background: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20]
            });
            L.marker([${latitude}, ${longitude}], { icon: userIcon })
                .addTo(map)
                .bindPopup('You are here');
            
            // Add additional markers
            ${markers.map((marker) => `
                var icon${marker.label.replace(/\s/g, '')} = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background: ${marker.color || '#FF0000'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [16, 16]
                });
                L.marker([${marker.lat}, ${marker.lng}], { icon: icon${marker.label.replace(/\s/g, '')} })
                    .addTo(map)
                    .bindPopup('${marker.label}');
            `).join('\n')}
        </script>
    </body>
    </html>
    `;

    return (
        <View style={[styles.container, style]}>
            <WebView
                source={{ html: htmlContent }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
});
