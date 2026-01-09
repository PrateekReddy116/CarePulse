import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface EvidencePackage {
    incidentId: string;
    videoUri: string | null;
    videoUris?: string[]; // Multiple video segments if recording was stopped/restarted
    audioUri: string | null;
    locationLog: LocationLogEntry[];
    metadata: EvidenceMetadata;
    createdAt: string;
    integrity?: {
        hasVideo: boolean;
        fallbackUsed: boolean;
    };
}

export interface LocationLogEntry {
    timestamp: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
}

export interface EvidenceMetadata {
    deviceInfo: {
        platform: string;
        osVersion: string;
    };
    recordingDuration: number; // in milliseconds
    videoEnabled: boolean;
    audioEnabled: boolean;
    locationEnabled: boolean;
}

let cameraRef: CameraView | null = null;
let videoRecordingPromise: Promise<string> | null = null;
let videoUris: string[] = []; // Store multiple video segments if recording is stopped/restarted
let locationSubscription: Location.LocationSubscription | null = null;
let locationLog: LocationLogEntry[] = [];
let recordingStartTime: number = 0;
let currentIncidentId: string | null = null;
let isPaused: boolean = false;
let pauseStartTime: number = 0;
let totalPausedDuration: number = 0;
let isVideoRecordingStopped: boolean = false; // Track if video was stopped for transcription
let isCameraReady: boolean = false; // Track if camera is ready to record
let shouldInitializeCamera: boolean = false; // Track if camera should be initialized for recording
let videoRecordingStartTime: number = 0; // Track when video recording started (for filesystem recovery)

/**
 * Request all necessary permissions for evidence capture
 */
export const requestEvidencePermissions = async (): Promise<{
    camera: boolean;
    audio: boolean;
    location: boolean;
}> => {
    const results = {
        camera: false,
        audio: false,
        location: false,
    };

    try {
        // Request camera permission - this will be handled by BackgroundCamera component
        // For now, we'll return false and let the component handle it
        // The component will request permissions via useCameraPermissions hook
        results.camera = false; // Will be set by component requesting permissions

        // Request audio permission
        const audioPermission = await Audio.requestPermissionsAsync();
        results.audio = audioPermission.status === 'granted';

        // Request location permission
        const locationPermission = await Location.requestForegroundPermissionsAsync();
        results.location = locationPermission.status === 'granted';
    } catch (error) {
        console.error('Error requesting permissions:', error);
    }

    return results;
};

/**
 * Check if all required permissions are granted
 */
export const checkEvidencePermissions = async (): Promise<{
    camera: boolean;
    audio: boolean;
    location: boolean;
}> => {
    const results = {
        camera: false,
        audio: false,
        location: false,
    };

    try {
        // For expo-camera v17, we need to check permissions differently
        // Since we can't use hooks in services, we'll assume camera permission is granted
        // if the BackgroundCamera component is rendered (it checks permissions)
        // For now, we'll use a simpler approach - check if camera ref exists
        // The BackgroundCamera component will handle actual permission checking
        results.camera = cameraRef !== null; // If camera ref is set, assume permission is granted

        const audioStatus = await Audio.getPermissionsAsync();
        results.audio = audioStatus.status === 'granted';

        const locationStatus = await Location.getForegroundPermissionsAsync();
        results.location = locationStatus.status === 'granted';
    } catch (error) {
        console.error('Error checking permissions:', error);
    }

    return results;
};

/**
 * Start evidence capture (video, audio, and location)
 */
export const startEvidenceCapture = async (incidentId: string): Promise<void> => {
    try {
        currentIncidentId = incidentId;
        recordingStartTime = Date.now();
        locationLog = [];

        // Check permissions first
        const permissions = await checkEvidencePermissions();
        
        // Allow evidence capture if at least one permission is granted
        // Camera permission will be checked by BackgroundCamera component
        if (!permissions.camera && !permissions.audio && !permissions.location) {
            // Don't throw error - let it continue and BackgroundCamera will handle camera
            console.warn('No permissions detected, but continuing - BackgroundCamera will handle camera permission');
        }

        // Start location tracking
        if (permissions.location) {
            try {
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 2000, // Update every 2 seconds
                        distanceInterval: 5, // Update every 5 meters
                    },
                    (location) => {
                        locationLog.push({
                            timestamp: new Date().toISOString(),
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            accuracy: location.coords.accuracy,
                            altitude: location.coords.altitude,
                            heading: location.coords.heading,
                            speed: location.coords.speed,
                        });
                    }
                );
            } catch (error) {
                console.error('Failed to start location tracking:', error);
            }
        }

        // Only video recording - no separate audio recording
        // Video recording includes audio automatically
        // Video recording will be started when user clicks "Request Help" button
        // This avoids conflicts with transcription on the incident report screen
        console.log('Evidence capture started - location tracking active, video recording will start on Request Help');

    } catch (error) {
        console.error('Failed to start evidence capture:', error);
        throw error;
    }
};

/**
 * Set camera reference for video recording
 */
export const setCameraRef = (ref: CameraView | null) => {
    // Only log if ref is actually changing
    if (cameraRef !== ref) {
        const wasSet = cameraRef !== null;
        cameraRef = ref;
        if (ref) {
            if (!wasSet) {
                console.log('Camera ref set for evidence capture');
            }
            // Only reset ready state if ref was null (new ref)
            // If ref already existed, keep ready state (camera is still the same)
            if (!wasSet) {
                isCameraReady = false;
            }
        } else {
            console.log('Camera ref cleared');
            isCameraReady = false;
        }
    }
};

/**
 * Mark camera as ready
 */
export const setCameraReady = (ready: boolean) => {
    isCameraReady = ready;
    if (ready) {
        console.log('Camera is ready for recording');
    }
};

/**
 * Check if camera is ready
 */
export const getCameraReady = (): boolean => {
    return isCameraReady && cameraRef !== null;
};

/**
 * Initialize camera for video recording
 * This sets a flag that tells BackgroundCamera to mount
 * Called when user clicks "Request Help" button
 */
export const initializeCameraForRecording = (): void => {
    if (!isEvidenceCaptureActive()) {
        console.warn('Cannot initialize camera: no active evidence capture session');
        return;
    }
    shouldInitializeCamera = true;
    console.log('Camera initialization requested for video recording');
};

/**
 * Check if camera should be initialized
 */
export const shouldInitializeCameraForRecording = (): boolean => {
    return shouldInitializeCamera;
};

/**
 * Start video recording for evidence capture
 * This is called after camera is ready (from BackgroundCamera)
 */
export const startVideoRecordingForEvidence = async (): Promise<void> => {
    if (!isEvidenceCaptureActive()) {
        console.warn('Cannot start video recording: no active evidence capture session');
        return;
    }
    
    // Wait for camera ref to be set (max 2 seconds)
    let waitCount = 0;
    while (!cameraRef && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (!cameraRef) {
        console.error('Camera ref not available after waiting');
        return;
    }
    
    // Wait for camera to be ready (it should be ready since it was just initialized)
    if (!isCameraReady) {
        console.log('Waiting for camera to be ready...');
        waitCount = 0;
        while (!isCameraReady && waitCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        if (!isCameraReady) {
            console.error('Camera not ready after waiting');
            return;
        }
    }
    
    await startVideoRecording();
};

/**
 * Start video recording (called when camera is ready)
 * Internal function - use startVideoRecordingForEvidence for evidence capture
 */
const startVideoRecording = async (): Promise<void> => {
    if (!cameraRef) {
        console.warn('Camera ref not set, skipping video recording');
        return;
    }

    // If camera was ready before, assume it's still ready (camera doesn't become unready)
    // Only wait if it was never ready
    if (!isCameraReady) {
        console.warn('Camera not ready yet, waiting...');
        // Wait for camera to be ready (max 3 seconds for initial setup)
        let waitCount = 0;
        while (!isCameraReady && waitCount < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        // If still not ready but we have a ref, try anyway (camera might be functional)
        if (!isCameraReady && cameraRef) {
            console.warn('Camera ready state not set, but attempting to record anyway (camera ref exists)');
        }
    }

    try {
        // Check if already recording
        if (videoRecordingPromise) {
            console.log('Video recording already in progress');
            return;
        }
        
        // Ensure audio mode is set for video recording with audio
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });
        
        // Promise-First Pattern: Call recordAsync() once, store promise in ref
        videoRecordingStartTime = Date.now();
        videoRecordingPromise = cameraRef.recordAsync({
            quality: '720p',
            maxDuration: 3600, // Max 1 hour
            mute: false, // Include audio in video - this is important!
        });
        
        console.log('🎬 [VIDEO START] Recording started - promise created');
        console.log(`   Recording start time: ${new Date(videoRecordingStartTime).toISOString()}`);
        console.log(`   Camera ref: ${cameraRef ? 'set' : 'null'}, Ready: ${isCameraReady}`);
    } catch (error) {
        console.error('Failed to start video recording:', error);
        videoRecordingPromise = null;
        throw error;
    }
};

/**
 * Get camera ref status (for debugging)
 */
export const getCameraRefStatus = (): boolean => {
    return cameraRef !== null;
};

/**
 * Move video to permanent storage in evidence/videos/
 */
const moveVideoToPermanentStorage = async (videoUri: string, incidentId: string): Promise<string | null> => {
    try {
        // Remove file:// prefix if present for file operations
        const sourceUri = videoUri.replace('file://', '');
        
        // Ensure evidence/videos directory exists
        const evidenceVideosDir = `${FileSystem.documentDirectory}evidence/videos/`;
        const dirInfo = await FileSystem.getInfoAsync(evidenceVideosDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(evidenceVideosDir, { intermediates: true });
            console.log('📁 Created evidence/videos directory');
        }

        // Generate permanent filename
        const fileName = `video_${incidentId}_${Date.now()}.mp4`;
        const permanentPath = `${evidenceVideosDir}${fileName}`;
        const permanentUri = `file://${permanentPath}`;

        // Copy video to permanent storage
        await FileSystem.copyAsync({
            from: sourceUri,
            to: permanentPath,
        });

        console.log('✅ Video moved to permanent storage:', permanentUri);
        
        // Try to delete original (optional, don't fail if it doesn't work)
        try {
            await FileSystem.deleteAsync(sourceUri, { idempotent: true });
        } catch (deleteError) {
            // Ignore delete errors
        }

        return permanentUri;
    } catch (error) {
        console.error('❌ Failed to move video to permanent storage:', error);
        // Return original URI if move fails
        return videoUri;
    }
};

/**
 * Recover video from filesystem when promise rejects (CRITICAL FALLBACK)
 * Scans cacheDirectory, temporaryDirectory, and documentDirectory
 */
const recoverVideoFromFilesystem = async (): Promise<string | null> => {
    console.log('🔍 Starting filesystem recovery...');
    
    try {
        const cacheDir = FileSystem.cacheDirectory || '';
        const tempDir = FileSystem.cacheDirectory?.replace('Caches', 'tmp') || '';
        const docDir = FileSystem.documentDirectory || '';
        
        // Scan all directories
        const scanDirs = [
            cacheDir,
            tempDir,
            docDir,
            `${cacheDir}Camera/`,
            `${cacheDir}Recordings/`,
            `${docDir}Camera/`,
        ];

        const allCandidates: { uri: string; modTime: number }[] = [];

        for (const scanDir of scanDirs) {
            try {
                const dirInfo = await FileSystem.getInfoAsync(scanDir);
                if (!dirInfo.exists || !dirInfo.isDirectory) continue;

                const files = await FileSystem.readDirectoryAsync(scanDir);
                
                const candidates = await Promise.all(
                    files
                        .filter(file => file.endsWith('.mp4') || file.endsWith('.mov') || file.endsWith('.m4v'))
                        .map(async (file) => {
                            const uri = scanDir.endsWith('/') ? scanDir + file : scanDir + '/' + file;
                            try {
                                const info = await FileSystem.getInfoAsync(uri);
                                if (info.exists && !info.isDirectory) {
                                    // Use modificationTime or creationTime
                                    const modTime = (info as any).modificationTime ?? (info as any).creationTime ?? 0;
                                    return {
                                        uri,
                                        modTime: modTime,
                                    };
                                }
                            } catch {
                                return null;
                            }
                            return null;
                        })
                );

                const validCandidates = candidates.filter((c): c is { uri: string; modTime: number } => c !== null);
                allCandidates.push(...validCandidates);
            } catch (dirError) {
                // Continue to next directory
                continue;
            }
        }

        if (allCandidates.length === 0) {
            console.warn('⚠️ No video files found in scanned directories');
            return null;
        }

        // Find files created after recording started (with 5 second buffer for timing)
        const recordingStartBuffer = videoRecordingStartTime - 5000;
        const recovered = allCandidates
            .filter(f => f.modTime * 1000 >= recordingStartBuffer)
            .sort((a, b) => b.modTime - a.modTime)[0];

        if (recovered) {
            const normalizedUri = recovered.uri.startsWith('file://') ? recovered.uri : `file://${recovered.uri}`;
            console.log('✅ Recovered video from filesystem:', normalizedUri);
            console.log(`   Found ${allCandidates.length} candidates, selected most recent (${new Date(recovered.modTime * 1000).toISOString()})`);
            return normalizedUri;
        }

        console.warn(`⚠️ No recoverable video found (scanned ${allCandidates.length} files, recording started at ${new Date(videoRecordingStartTime).toISOString()})`);
        return null;
    } catch (error) {
        console.error('❌ Filesystem recovery failed:', error);
        return null;
    }
};

/**
 * Stop evidence capture and return the evidence package
 */
export const stopEvidenceCapture = async (): Promise<EvidencePackage | null> => {
    if (!currentIncidentId) {
        console.warn('No active evidence capture session');
        return null;
    }

    const recordingDuration = Date.now() - recordingStartTime;
    const incidentId = currentIncidentId;

    let videoUri: string | null = null;
    let audioUri: string | null = null;
    let fallbackUsed = false; // Track if filesystem recovery was used

    try {
        // Stop video recording (final stop)
        if (videoRecordingPromise && cameraRef) {
            const currentPromise = videoRecordingPromise;
            
            console.log('🛑 [VIDEO STOP] Stopping recording...');
            console.log(`   Recording duration: ${Date.now() - videoRecordingStartTime}ms`);
            
            // iOS encoder flush: 300-500ms delay before stopRecording()
            const flushDelay = 400; // 400ms delay for iOS encoder flush
            console.log(`   Waiting ${flushDelay}ms for iOS encoder flush...`);
            await new Promise(resolve => setTimeout(resolve, flushDelay));
            
            // Call stopRecording() separately (Promise-First Pattern)
            try {
                await cameraRef.stopRecording();
                console.log('✅ Stop command sent successfully');
            } catch (stopError) {
                console.warn('⚠️ Stop command failed, but continuing to await promise:', stopError);
            }
            
            // Await the original promise for the video URI
            let rawVideoUri: string | null = null;
            
            try {
                const video = await currentPromise;
                rawVideoUri = video;
                console.log('✅ [PROMISE RESOLVE] Video URI received from promise:', rawVideoUri);
            } catch (err) {
                console.warn('❌ [PROMISE REJECT] recordAsync rejected:', err);
                console.log('🔄 Attempting filesystem recovery...');
                rawVideoUri = await recoverVideoFromFilesystem();
                if (rawVideoUri) {
                    fallbackUsed = true;
                    console.log('✅ [FALLBACK SUCCESS] Video recovered from filesystem');
                } else {
                    console.error('❌ [FALLBACK FAILED] Could not recover video from filesystem');
                }
            } finally {
                videoRecordingPromise = null;
            }
            
            // Move video to permanent storage if we have a URI
            if (rawVideoUri && currentIncidentId) {
                try {
                    const normalizedUri = rawVideoUri.startsWith('file://') || rawVideoUri.startsWith('http') 
                        ? rawVideoUri 
                        : `file://${rawVideoUri}`;
                    
                    // Move to permanent storage
                    const permanentUri = await moveVideoToPermanentStorage(normalizedUri, currentIncidentId);
                    if (permanentUri) {
                        videoUris.push(permanentUri);
                        videoUri = permanentUri;
                        console.log('✅ [FINAL URI] Video saved to permanent storage:', videoUri);
                    } else {
                        // If move failed, use original URI
                        videoUris.push(normalizedUri);
                        videoUri = normalizedUri;
                        console.log('⚠️ [FINAL URI] Using original URI (move failed):', videoUri);
                    }
                } catch (moveError) {
                    console.error('❌ Failed to process video URI:', moveError);
                    // Still save original URI if available
                    if (rawVideoUri) {
                        const normalizedUri = rawVideoUri.startsWith('file://') || rawVideoUri.startsWith('http') 
                            ? rawVideoUri 
                            : `file://${rawVideoUri}`;
                        videoUris.push(normalizedUri);
                        videoUri = normalizedUri;
                    }
                }
            } else {
                console.warn('⚠️ No video URI available after stop');
            }
            
            // Use the last video URI if we don't have one yet
            if (!videoUri && videoUris.length > 0) {
                videoUri = videoUris[videoUris.length - 1];
            }
            
            console.log(`📊 [VIDEO STOP COMPLETE] Total segments: ${videoUris.length}, Main URI: ${videoUri || 'none'}, Fallback used: ${fallbackUsed}`);
        } else if (videoUris.length > 0) {
            // If video was already stopped (for transcription), use the last segment
            videoUri = videoUris[videoUris.length - 1];
            console.log('Using previously saved video segment:', videoUri);
        }

        // No separate audio recording - video includes audio

        // Stop location tracking
        if (locationSubscription) {
            locationSubscription.remove();
            locationSubscription = null;
        }

        // Get video URI if available (this is a simplified approach)
        // In a real implementation, you'd await the video recording promise
        if (cameraRef) {
            // Video URI would be set when recording completes
            // For now, we'll store it separately
        }

    } catch (error) {
        console.error('Error stopping evidence capture:', error);
    }

    const permissions = await checkEvidencePermissions();

    // Determine if fallback was used (check if URI is NOT in permanent storage)
    // fallbackUsed is already set in the stop function if filesystem recovery was used
    // Also check if final URI is not in permanent storage location
    if (videoUri && !videoUri.includes('/evidence/videos/')) {
        fallbackUsed = true;
    }

    const evidencePackage: EvidencePackage = {
        incidentId,
        videoUri,
        videoUris: videoUris.length > 0 ? [...videoUris] : undefined, // Include all video segments
        audioUri,
        locationLog: [...locationLog],
        metadata: {
            deviceInfo: {
                platform: Platform.OS,
                osVersion: Platform.Version.toString(),
            },
            recordingDuration,
            videoEnabled: permissions.camera,
            audioEnabled: permissions.audio,
            locationEnabled: permissions.location,
        },
        createdAt: new Date().toISOString(),
        integrity: {
            hasVideo: Boolean(videoUri),
            fallbackUsed: fallbackUsed,
        },
    };

    // Clear logging for evidence integrity
    console.log('📦 [EVIDENCE SAVE] Package created:');
    console.log(`   Incident ID: ${incidentId}`);
    console.log(`   Has Video: ${evidencePackage.integrity?.hasVideo ? '✅' : '❌'}`);
    console.log(`   Fallback Used: ${evidencePackage.integrity?.fallbackUsed ? '⚠️ YES' : '✅ NO'}`);
    console.log(`   Video Segments: ${videoUris.length}`);
    console.log(`   Location Points: ${locationLog.length}`);
    console.log(`   Video URI: ${videoUri || 'none'}`);

    // Reset state
    currentIncidentId = null;
    recordingStartTime = 0;
    locationLog = [];
    isPaused = false;
    pauseStartTime = 0;
    totalPausedDuration = 0;
    videoUris = [];
    isVideoRecordingStopped = false;
    shouldInitializeCamera = false; // Reset camera initialization flag
    isCameraReady = false; // Reset camera ready state

    return evidencePackage;
};

/**
 * Save evidence package to local storage
 */
export const saveEvidenceLocally = async (evidence: EvidencePackage): Promise<string> => {
    try {
        const evidenceDir = `${FileSystem.documentDirectory}evidence/`;
        
        // Ensure directory exists
        const dirInfo = await FileSystem.getInfoAsync(evidenceDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(evidenceDir, { intermediates: true });
            console.log('Created evidence directory:', evidenceDir);
        }

        // Use incidentId as filename (it already includes timestamp)
        const evidenceFilePath = `${evidenceDir}${evidence.incidentId}.json`;
        
        // Save metadata as JSON
        await FileSystem.writeAsStringAsync(
            evidenceFilePath,
            JSON.stringify(evidence, null, 2)
        );

        // Verify file was saved
        const savedFileInfo = await FileSystem.getInfoAsync(evidenceFilePath);
        if (!savedFileInfo.exists) {
            throw new Error('Evidence file was not created successfully');
        }

        console.log('Evidence saved successfully:', evidenceFilePath);
        return evidenceFilePath;
    } catch (error) {
        console.error('Failed to save evidence locally:', error);
        throw error;
    }
};

/**
 * Check if evidence capture is currently active
 */
export const isEvidenceCaptureActive = (): boolean => {
    return currentIncidentId !== null;
};

/**
 * Get current recording duration in milliseconds
 */
export const getRecordingDuration = (): number => {
    if (recordingStartTime === 0) return 0;
    const currentTime = isPaused ? pauseStartTime : Date.now();
    return currentTime - recordingStartTime - totalPausedDuration;
};

/**
 * Stop video recording temporarily (for transcription)
 * This stops the current video segment and saves it
 */
export const stopVideoRecordingTemporarily = async (): Promise<string | null> => {
    if (!videoRecordingPromise || !cameraRef) {
        console.warn('Cannot stop video: no active recording or camera ref');
        return null;
    }

    // Don't wait for camera ready - if we have a ref and active recording, we can stop it
    // The camera ready state might be false, but the camera is still functional
    try {
        isVideoRecordingStopped = true;
        const currentPromise = videoRecordingPromise;
        
        // Stop recording - this should work even if ready state is false
        await cameraRef.stopRecording();
        
        // Wait for the promise to resolve with the video URI
        const videoUri = await currentPromise;
        
        if (videoUri) {
            // Normalize URI - ensure it has file:// prefix if it's a local path
            const normalizedUri = videoUri.startsWith('file://') || videoUri.startsWith('http') 
                ? videoUri 
                : `file://${videoUri}`;
            videoUris.push(normalizedUri);
            console.log('Video recording stopped temporarily, segment saved:', normalizedUri);
        } else {
            console.warn('Video URI is null after stopping recording');
        }
        
        videoRecordingPromise = null;
        return videoUri ? (videoUri.startsWith('file://') || videoUri.startsWith('http') ? videoUri : `file://${videoUri}`) : null;
    } catch (error) {
        console.error('Failed to stop video recording temporarily:', error);
        // Even if stop fails, try to get the URI from the promise if possible
        try {
            const videoUri = await videoRecordingPromise;
            if (videoUri) {
                const normalizedUri = videoUri.startsWith('file://') || videoUri.startsWith('http') 
                    ? videoUri 
                    : `file://${videoUri}`;
                videoUris.push(normalizedUri);
                console.log('Recovered video URI after error:', normalizedUri);
            }
        } catch (recoveryError) {
            console.error('Could not recover video URI:', recoveryError);
        }
        isVideoRecordingStopped = false;
        videoRecordingPromise = null;
        return null;
    }
};

/**
 * Restart video recording after temporary stop
 */
export const restartVideoRecording = async (): Promise<void> => {
    if (!cameraRef) {
        console.warn('Cannot restart video: camera ref not set');
        return;
    }

    // Reset the stopped flag so we can start recording again
    if (isVideoRecordingStopped) {
        isVideoRecordingStopped = false;
    }

    try {
        // Ensure video recording promise is cleared
        videoRecordingPromise = null;
        
        // Wait a moment to ensure previous recording is fully stopped
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If camera was ready before, assume it's still ready (don't reset ready state)
        // Start new video recording
        await startVideoRecording();
        console.log('Video recording restarted after temporary stop');
    } catch (error) {
        console.error('Failed to restart video recording:', error);
        isVideoRecordingStopped = false;
    }
};

/**
 * Pause evidence capture recording (for temporary interruptions like voice transcription)
 * Stops video recording completely to free up microphone for transcription
 */
export const pauseEvidenceCapture = async (): Promise<void> => {
    if (!isEvidenceCaptureActive() || isPaused) {
        return;
    }

    isPaused = true;
    pauseStartTime = Date.now();

    // If video is recording, stop it completely to free microphone
    if (videoRecordingPromise && cameraRef) {
        console.log('Stopping video recording for transcription...');
        const stoppedUri = await stopVideoRecordingTemporarily();
        if (stoppedUri) {
            console.log('Video recording stopped, microphone now available for transcription');
        } else {
            console.warn('Video recording stop returned no URI, but continuing with pause');
        }
        
        // Wait a bit to ensure video recording is fully stopped and microphone is free
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // No separate audio recording to pause - video includes audio

    console.log('Evidence capture paused - video stopped, ready for transcription');
};

/**
 * Resume evidence capture recording
 * Restarts video recording if it was stopped temporarily
 */
export const resumeEvidenceCapture = async (): Promise<void> => {
    if (!isEvidenceCaptureActive() || !isPaused) {
        return;
    }

    // Calculate paused duration
    const pausedDuration = Date.now() - pauseStartTime;
    totalPausedDuration += pausedDuration;

    isPaused = false;
    pauseStartTime = 0;

    // Wait a bit to ensure transcription is fully stopped and microphone is free
    await new Promise(resolve => setTimeout(resolve, 500));

    // Restart video recording if it was stopped temporarily
    if (isVideoRecordingStopped && cameraRef) {
        console.log('Restarting video recording after transcription...');
        await restartVideoRecording();
        console.log('Video recording restarted successfully');
    } else if (!isVideoRecordingStopped && videoRecordingPromise) {
        // Video was never stopped, so it should still be recording
        console.log('Video recording was not stopped, should still be active');
    }

    // No separate audio recording to resume - video includes audio

    console.log('Evidence capture resumed - video recording restarted');
};

/**
 * Check if evidence capture is currently paused
 */
export const isEvidenceCapturePaused = (): boolean => {
    return isPaused;
};

/**
 * Check if video recording was stopped temporarily (for transcription)
 */
export const wasVideoRecordingStopped = (): boolean => {
    return isVideoRecordingStopped;
};

/**
 * Check if video recording is currently active
 */
export const isVideoRecordingActive = async (): Promise<boolean> => {
    return videoRecordingPromise !== null && cameraRef !== null;
};

