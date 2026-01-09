import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setCameraRef, startVideoRecording, isEvidenceCaptureActive, checkEvidencePermissions } from '../services/evidenceCaptureService';

/**
 * Background camera component for evidence capture
 * This component is hidden but active to enable video recording
 */
export const BackgroundCamera: React.FC = () => {
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const recordingStarted = useRef(false);

    useEffect(() => {
        // Set the camera ref for the evidence capture service
        // Use a small delay to ensure camera is mounted
        const timer = setTimeout(() => {
            if (cameraRef.current) {
                setCameraRef(cameraRef.current as any);
                console.log('Camera ref set for evidence capture');
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            setCameraRef(null);
        };
    }, []);

    useEffect(() => {
        // Start video recording when evidence capture becomes active
        const checkAndStartRecording = async () => {
            if (isEvidenceCaptureActive() && !recordingStarted.current && cameraRef.current && permission?.granted) {
                try {
                    // Don't check permissions again - we already have permission from the hook
                    recordingStarted.current = true;
                    await startVideoRecording();
                    console.log('Background video recording started');
                } catch (error) {
                    console.error('Failed to start video recording:', error);
                    recordingStarted.current = false;
                }
            } else if (!isEvidenceCaptureActive()) {
                recordingStarted.current = false;
            }
        };

        // Check periodically if recording should start
        const interval = setInterval(checkAndStartRecording, 1000);

        return () => clearInterval(interval);
    }, [permission]);

    // Request permission if not granted
    useEffect(() => {
        if (permission && !permission.granted && !permission.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    // Don't render if permission not granted
    if (!permission?.granted) {
        return null;
    }

    // Render a minimal hidden camera view
    return (
        <View style={styles.container} pointerEvents="none">
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                video={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
    },
    camera: {
        width: 1,
        height: 1,
    },
});

