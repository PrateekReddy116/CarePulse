import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeScreen } from '../components/SafeScreen';
import { Card } from '../components/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { 
    listEvidenceFiles, 
    loadEvidencePackage, 
    deleteEvidenceFile, 
    getEvidenceStorageSize,
    formatBytes,
    EvidenceFileInfo 
} from '../services/evidenceStorageService';
import { EvidencePackage } from '../services/evidenceCaptureService';
import { ChevronLeft, Trash2, FileText, Video as VideoIcon, Mic, MapPin, Calendar, Clock } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

type EvidenceViewerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EvidenceViewer'>;

interface Props {
    navigation: EvidenceViewerScreenNavigationProp;
}

export const EvidenceViewerScreen: React.FC<Props> = ({ navigation }) => {
    const { theme } = useTheme();
    const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [storageSize, setStorageSize] = useState(0);
    const [selectedEvidence, setSelectedEvidence] = useState<EvidencePackage | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const videoRef = useRef<Video>(null);
    const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);

    useEffect(() => {
        loadEvidenceFiles();
    }, []);

    // Cleanup video when component unmounts or evidence changes
    useEffect(() => {
        return () => {
            if (videoRef.current) {
                videoRef.current.unloadAsync().catch(console.error);
            }
        };
    }, [selectedEvidence]);

    const loadEvidenceFiles = async () => {
        setLoading(true);
        try {
            const files = await listEvidenceFiles();
            setEvidenceFiles(files);
            const size = await getEvidenceStorageSize();
            setStorageSize(size);
        } catch (error) {
            console.error('Failed to load evidence files:', error);
            Alert.alert('Error', 'Failed to load evidence files');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (filePath: string) => {
        const evidence = await loadEvidencePackage(filePath);
        if (evidence) {
            setSelectedEvidence(evidence);
            setShowDetails(true);
        }
    };

    const handleDelete = (file: EvidenceFileInfo) => {
        Alert.alert(
            'Delete Evidence',
            `Are you sure you want to delete evidence from ${new Date(file.createdAt).toLocaleString()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteEvidenceFile(file.filePath);
                        if (success) {
                            Alert.alert('Success', 'Evidence deleted');
                            loadEvidenceFiles();
                        } else {
                            Alert.alert('Error', 'Failed to delete evidence');
                        }
                    },
                },
            ]
        );
    };

    const handleShare = async (file: EvidenceFileInfo) => {
        try {
            const evidence = await loadEvidencePackage(file.filePath);
            if (!evidence) {
                Alert.alert('Error', 'Failed to load evidence');
                return;
            }

            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            // Create a shareable text summary file
            const summary = `Evidence Report\n\n` +
                `Incident ID: ${evidence.incidentId}\n` +
                `Date: ${new Date(evidence.createdAt).toLocaleString()}\n` +
                `Duration: ${Math.floor(evidence.metadata.recordingDuration / 1000)}s\n` +
                `Location Points: ${evidence.locationLog.length}\n` +
                `Has Audio: ${evidence.audioUri ? 'Yes' : 'No'}\n` +
                `Has Video: ${evidence.videoUri ? 'Yes' : 'No'}\n\n` +
                `Location Log (first 10 points):\n${evidence.locationLog.slice(0, 10).map((l, i) => 
                    `${i + 1}. ${new Date(l.timestamp).toLocaleTimeString()}: ${l.latitude.toFixed(6)}, ${l.longitude.toFixed(6)} (Accuracy: ${l.accuracy ? l.accuracy.toFixed(0) + 'm' : 'N/A'})`
                ).join('\n')}`;

            // Create a temporary file to share
            const shareFilePath = `${FileSystem.cacheDirectory}evidence_${evidence.incidentId}_summary.txt`;
            await FileSystem.writeAsStringAsync(shareFilePath, summary);

            // Share the file
            await Sharing.shareAsync(shareFilePath, {
                mimeType: 'text/plain',
                dialogTitle: 'Share Evidence Report',
            });
        } catch (error) {
            console.error('Failed to share evidence:', error);
            Alert.alert('Error', 'Failed to share evidence');
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const formatDuration = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    if (showDetails && selectedEvidence) {
        return (
            <SafeScreen style={{ backgroundColor: theme.background }}>
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.backButton}>
                        <ChevronLeft size={24} color={theme.primary} />
                        <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Evidence Details</Text>
                </View>

                <ScrollView contentContainerStyle={styles.detailsContent}>
                    <Card style={styles.detailCard}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Incident ID:</Text>
                            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedEvidence.incidentId}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date:</Text>
                            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{formatDate(selectedEvidence.createdAt)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Duration:</Text>
                            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{formatDuration(selectedEvidence.metadata.recordingDuration)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Location Points:</Text>
                            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{selectedEvidence.locationLog.length}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Audio:</Text>
                            <Text style={[styles.detailValue, { color: selectedEvidence.audioUri ? theme.success : theme.textSecondary }]}>
                                {selectedEvidence.audioUri ? 'Recorded' : 'Not available'}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Video:</Text>
                            <Text style={[styles.detailValue, { 
                                color: (selectedEvidence.videoUri || (selectedEvidence.videoUris && selectedEvidence.videoUris.length > 0)) 
                                    ? theme.success 
                                    : theme.textSecondary 
                            }]}>
                                {(selectedEvidence.videoUri || (selectedEvidence.videoUris && selectedEvidence.videoUris.length > 0)) 
                                    ? 'Recorded' 
                                    : 'Not available'}
                            </Text>
                        </View>
                    </Card>

                    {(selectedEvidence.videoUri || (selectedEvidence.videoUris && selectedEvidence.videoUris.length > 0)) && (
                        <Card style={styles.detailCard}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: SPACING.m }]}>
                                Video Preview
                                {selectedEvidence.videoUris && selectedEvidence.videoUris.length > 1 && (
                                    <Text style={[styles.videoSegmentInfo, { color: theme.textSecondary }]}>
                                        {' '}({selectedEvidence.videoUris.length} segments)
                                    </Text>
                                )}
                            </Text>
                            {/* Show the main video or first segment */}
                            <View style={[styles.videoContainer, { backgroundColor: theme.surface }]}>
                                <Video
                                    ref={videoRef}
                                    style={styles.video}
                                    source={{ 
                                        uri: (() => {
                                            // Use main videoUri if available, otherwise use first segment
                                            const videoUri = selectedEvidence.videoUri || (selectedEvidence.videoUris && selectedEvidence.videoUris[0]);
                                            // Ensure URI has file:// prefix if it's a local file path
                                            if (videoUri && !videoUri.startsWith('http') && !videoUri.startsWith('file://')) {
                                                return `file://${videoUri}`;
                                            }
                                            return videoUri || '';
                                        })(),
                                    }}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    isLooping={false}
                                    shouldPlay={false}
                                    onPlaybackStatusUpdate={(status) => {
                                        setVideoStatus(status);
                                        if (status.isLoaded && status.error) {
                                            console.error('Video playback error:', status.error);
                                        }
                                    }}
                                    onError={(error) => {
                                        console.error('Video error:', error);
                                        const videoUri = selectedEvidence.videoUri || (selectedEvidence.videoUris && selectedEvidence.videoUris[0]);
                                        console.error('Video URI:', videoUri);
                                        Alert.alert('Error', 'Failed to load video. The file may not be available.');
                                    }}
                                />
                            </View>
                            {videoStatus && (
                                <View style={styles.videoInfo}>
                                    <Text style={[styles.videoInfoText, { color: theme.textSecondary }]}>
                                        {videoStatus.isLoaded && videoStatus.durationMillis
                                            ? `Duration: ${formatDuration(videoStatus.durationMillis)}`
                                            : videoStatus.isLoaded && videoStatus.error
                                            ? 'Error loading video'
                                            : 'Loading...'}
                                    </Text>
                                </View>
                            )}
                            {/* Show additional video segments if any */}
                            {selectedEvidence.videoUris && selectedEvidence.videoUris.length > 1 && (
                                <View style={styles.videoSegments}>
                                    <Text style={[styles.videoSegmentLabel, { color: theme.textSecondary }]}>
                                        Additional segments (recorded during transcription):
                                    </Text>
                                    {selectedEvidence.videoUris.slice(1).map((uri, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={async () => {
                                                // Switch to this video segment
                                                try {
                                                    if (videoRef.current) {
                                                        await videoRef.current.unloadAsync();
                                                        // Ensure URI has file:// prefix if it's a local file path
                                                        const normalizedUri = uri && !uri.startsWith('http') && !uri.startsWith('file://') 
                                                            ? `file://${uri}` 
                                                            : uri;
                                                        await videoRef.current.loadAsync({ uri: normalizedUri });
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to switch video segment:', error);
                                                    Alert.alert('Error', 'Failed to load video segment');
                                                }
                                            }}
                                            style={[styles.videoSegmentButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                        >
                                            <Text style={[styles.videoSegmentText, { color: theme.textPrimary }]}>
                                                Segment {index + 2}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </Card>
                    )}

                    {selectedEvidence.audioUri && (
                        <Card style={styles.detailCard}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: SPACING.m }]}>Audio Preview</Text>
                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        const { Audio } = await import('expo-av');
                                        const { sound } = await Audio.Sound.createAsync({ uri: selectedEvidence.audioUri! });
                                        await sound.playAsync();
                                        
                                        // Clean up when finished
                                        sound.setOnPlaybackStatusUpdate((status) => {
                                            if (status.isLoaded && status.didJustFinish) {
                                                sound.unloadAsync();
                                            }
                                        });
                                    } catch (error) {
                                        console.error('Failed to play audio:', error);
                                        Alert.alert('Error', 'Failed to play audio');
                                    }
                                }}
                                style={[styles.playButton, { backgroundColor: theme.primary }]}
                            >
                                <Mic size={20} color="#FFF" />
                                <Text style={styles.playButtonText}>Play Audio</Text>
                            </TouchableOpacity>
                        </Card>
                    )}

                    {selectedEvidence.locationLog.length > 0 && (
                        <Card style={styles.detailCard}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Location History</Text>
                            <ScrollView style={styles.locationScroll}>
                                {selectedEvidence.locationLog.slice(0, 20).map((loc, index) => (
                                    <View key={index} style={styles.locationItem}>
                                        <Text style={[styles.locationTime, { color: theme.textSecondary }]}>
                                            {new Date(loc.timestamp).toLocaleTimeString()}
                                        </Text>
                                        <Text style={[styles.locationCoords, { color: theme.textPrimary }]}>
                                            {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                                        </Text>
                                        {loc.accuracy && (
                                            <Text style={[styles.locationAccuracy, { color: theme.textSecondary }]}>
                                                Accuracy: {loc.accuracy.toFixed(0)}m
                                            </Text>
                                        )}
                                    </View>
                                ))}
                                {selectedEvidence.locationLog.length > 20 && (
                                    <Text style={[styles.moreText, { color: theme.textSecondary }]}>
                                        ... and {selectedEvidence.locationLog.length - 20} more locations
                                    </Text>
                                )}
                            </ScrollView>
                        </Card>
                    )}
                </ScrollView>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen style={{ backgroundColor: theme.background }}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.primary} />
                    <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Evidence Files</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <Card style={[styles.storageCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.storageLabel, { color: theme.textSecondary }]}>Total Storage Used</Text>
                        <Text style={[styles.storageValue, { color: theme.textPrimary }]}>{formatBytes(storageSize)}</Text>
                        <Text style={[styles.storageCount, { color: theme.textSecondary }]}>
                            {evidenceFiles.length} {evidenceFiles.length === 1 ? 'file' : 'files'}
                        </Text>
                    </Card>

                    {evidenceFiles.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <FileText size={48} color={theme.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                No evidence files found
                            </Text>
                            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                                Evidence will appear here after SOS activations
                            </Text>
                        </View>
                    ) : (
                        evidenceFiles.map((file) => (
                            <Card key={file.filePath} style={styles.evidenceCard}>
                                <View style={styles.evidenceHeader}>
                                    <View style={styles.evidenceInfo}>
                                        <View style={styles.evidenceRow}>
                                            <Calendar size={16} color={theme.textSecondary} />
                                            <Text style={[styles.evidenceDate, { color: theme.textPrimary }]}>
                                                {formatDate(file.createdAt)}
                                            </Text>
                                        </View>
                                        <View style={styles.evidenceRow}>
                                            <Clock size={16} color={theme.textSecondary} />
                                            <Text style={[styles.evidenceDuration, { color: theme.textSecondary }]}>
                                                {formatDuration(file.recordingDuration)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.evidenceIcons}>
                                        {file.hasVideo && <VideoIcon size={18} color={theme.primary} />}
                                        {file.hasAudio && <Mic size={18} color={theme.primary} />}
                                        {file.hasLocation && (
                                            <View style={styles.locationIconContainer}>
                                                <MapPin size={18} color={theme.primary} />
                                                <Text style={[styles.locationCount, { color: theme.textSecondary }]}>
                                                    {file.locationCount}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.evidenceActions}>
                                    <TouchableOpacity
                                        onPress={() => handleViewDetails(file.filePath)}
                                        style={[styles.actionButton, { backgroundColor: theme.primary }]}
                                    >
                                        <FileText size={16} color="#FFF" />
                                        <Text style={styles.actionButtonText}>View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleShare(file)}
                                        style={[styles.actionButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
                                    >
                                        <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>Share</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(file)}
                                        style={styles.deleteButton}
                                    >
                                        <Trash2 size={18} color={theme.danger} />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeScreen>
    );
};

const styles = StyleSheet.create({
    header: {
        padding: SPACING.l,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    backText: {
        fontSize: FONT_SIZE.m,
        marginLeft: 4,
    },
    title: {
        fontSize: FONT_SIZE.l,
        fontWeight: '700',
    },
    content: {
        padding: SPACING.l,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storageCard: {
        padding: SPACING.m,
        marginBottom: SPACING.l,
        borderRadius: BORDER_RADIUS.m,
    },
    storageLabel: {
        fontSize: FONT_SIZE.s,
        marginBottom: SPACING.xs,
    },
    storageValue: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        marginBottom: 4,
    },
    storageCount: {
        fontSize: FONT_SIZE.xs,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
    },
    emptyText: {
        fontSize: FONT_SIZE.m,
        marginTop: SPACING.m,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: FONT_SIZE.s,
        marginTop: SPACING.s,
        textAlign: 'center',
    },
    evidenceCard: {
        marginBottom: SPACING.m,
        padding: SPACING.m,
    },
    evidenceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.m,
    },
    evidenceInfo: {
        flex: 1,
    },
    evidenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    evidenceDate: {
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
        marginLeft: SPACING.xs,
    },
    evidenceDuration: {
        fontSize: FONT_SIZE.s,
        marginLeft: SPACING.xs,
    },
    evidenceIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    locationIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    locationCount: {
        fontSize: FONT_SIZE.xs,
        marginLeft: 2,
    },
    evidenceActions: {
        flexDirection: 'row',
        gap: SPACING.s,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: BORDER_RADIUS.s,
        gap: SPACING.xs,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    deleteButton: {
        padding: SPACING.s,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailsContent: {
        padding: SPACING.l,
    },
    detailCard: {
        marginBottom: SPACING.m,
        padding: SPACING.m,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    detailLabel: {
        fontSize: FONT_SIZE.s,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: FONT_SIZE.s,
        flex: 1,
        textAlign: 'right',
    },
    sectionTitle: {
        fontSize: FONT_SIZE.m,
        fontWeight: '700',
        marginBottom: SPACING.m,
    },
    locationScroll: {
        maxHeight: 300,
    },
    locationItem: {
        paddingVertical: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    locationTime: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
    },
    locationCoords: {
        fontSize: FONT_SIZE.s,
        marginTop: 2,
    },
    locationAccuracy: {
        fontSize: FONT_SIZE.xs,
        marginTop: 2,
    },
    moreText: {
        fontSize: FONT_SIZE.xs,
        fontStyle: 'italic',
        marginTop: SPACING.s,
        textAlign: 'center',
    },
    videoContainer: {
        width: '100%',
        borderRadius: BORDER_RADIUS.m,
        overflow: 'hidden',
        marginBottom: SPACING.s,
    },
    video: {
        width: '100%',
        height: Dimensions.get('window').width * 0.75, // 4:3 aspect ratio
    },
    videoInfo: {
        marginTop: SPACING.s,
    },
    videoInfoText: {
        fontSize: FONT_SIZE.xs,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: BORDER_RADIUS.m,
        gap: SPACING.s,
    },
    playButtonText: {
        color: '#FFF',
        fontSize: FONT_SIZE.m,
        fontWeight: '600',
    },
    videoSegmentInfo: {
        fontSize: FONT_SIZE.s,
        fontWeight: '400',
    },
    videoSegments: {
        marginTop: SPACING.m,
    },
    videoSegmentLabel: {
        fontSize: FONT_SIZE.xs,
        marginBottom: SPACING.s,
    },
    videoSegmentButton: {
        padding: SPACING.s,
        borderRadius: BORDER_RADIUS.s,
        borderWidth: 1,
        marginBottom: SPACING.xs,
    },
    videoSegmentText: {
        fontSize: FONT_SIZE.s,
    },
});

