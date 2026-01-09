import * as FileSystem from 'expo-file-system/legacy';
import { EvidencePackage } from './evidenceCaptureService';

export interface EvidenceFileInfo {
    fileName: string;
    filePath: string;
    incidentId: string;
    createdAt: string;
    recordingDuration: number;
    hasVideo: boolean;
    hasAudio: boolean;
    hasLocation: boolean;
    locationCount: number;
}

/**
 * Get the evidence directory path
 */
export const getEvidenceDirectory = (): string => {
    return `${FileSystem.documentDirectory}evidence/`;
};

/**
 * List all evidence files
 */
export const listEvidenceFiles = async (): Promise<EvidenceFileInfo[]> => {
    try {
        const evidenceDir = getEvidenceDirectory();
        const dirInfo = await FileSystem.getInfoAsync(evidenceDir);
        
        if (!dirInfo.exists) {
            return [];
        }

        // Read directory contents
        const files = await FileSystem.readDirectoryAsync(evidenceDir);
        
        // Filter for JSON files and get their info
        const evidenceFiles: EvidenceFileInfo[] = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    // Build file path - don't add file:// prefix, FileSystem handles it
                    const filePath = `${evidenceDir}${file}`;
                    
                    // Check if file exists
                    const fileInfo = await FileSystem.getInfoAsync(filePath);
                    if (!fileInfo.exists) {
                        console.warn('Evidence file listed but does not exist:', filePath);
                        continue;
                    }
                    
                    const fileContent = await FileSystem.readAsStringAsync(filePath);
                    if (!fileContent) {
                        console.warn('Evidence file is empty:', filePath);
                        continue;
                    }
                    
                    const evidence: EvidencePackage = JSON.parse(fileContent);
                    
                    evidenceFiles.push({
                        fileName: file,
                        filePath: filePath,
                        incidentId: evidence.incidentId,
                        createdAt: evidence.createdAt,
                        recordingDuration: evidence.metadata.recordingDuration,
                        hasVideo: evidence.videoUri !== null || (evidence.videoUris && evidence.videoUris.length > 0),
                        hasAudio: evidence.audioUri !== null,
                        hasLocation: evidence.locationLog.length > 0,
                        locationCount: evidence.locationLog.length,
                    });
                } catch (error) {
                    console.error(`Error reading evidence file ${file}:`, error);
                }
            }
        }

        // Sort by creation date (newest first)
        evidenceFiles.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return evidenceFiles;
    } catch (error) {
        console.error('Failed to list evidence files:', error);
        return [];
    }
};

/**
 * Load a specific evidence package by file path
 */
export const loadEvidencePackage = async (filePath: string): Promise<EvidencePackage | null> => {
    try {
        // Normalize file path (remove file:// prefix if present)
        let normalizedPath = filePath;
        if (normalizedPath.startsWith('file://')) {
            normalizedPath = normalizedPath.replace('file://', '');
        }
        
        // Check if file exists first
        const fileInfo = await FileSystem.getInfoAsync(normalizedPath);
        if (!fileInfo.exists) {
            console.error('Evidence file does not exist:', normalizedPath);
            return null;
        }
        
        const fileContent = await FileSystem.readAsStringAsync(normalizedPath);
        if (!fileContent) {
            console.error('Evidence file is empty:', normalizedPath);
            return null;
        }
        
        return JSON.parse(fileContent) as EvidencePackage;
    } catch (error) {
        console.error('Failed to load evidence package:', error);
        console.error('File path:', filePath);
        return null;
    }
};

/**
 * Delete an evidence file
 */
export const deleteEvidenceFile = async (filePath: string): Promise<boolean> => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            
            // Also try to delete associated media files if they exist
            const evidence = await loadEvidencePackage(filePath);
            if (evidence) {
                if (evidence.audioUri) {
                    try {
                        const audioInfo = await FileSystem.getInfoAsync(evidence.audioUri);
                        if (audioInfo.exists) {
                            await FileSystem.deleteAsync(evidence.audioUri, { idempotent: true });
                        }
                    } catch (error) {
                        console.error('Failed to delete audio file:', error);
                    }
                }
                if (evidence.videoUri) {
                    try {
                        const videoInfo = await FileSystem.getInfoAsync(evidence.videoUri);
                        if (videoInfo.exists) {
                            await FileSystem.deleteAsync(evidence.videoUri, { idempotent: true });
                        }
                    } catch (error) {
                        console.error('Failed to delete video file:', error);
                    }
                }
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to delete evidence file:', error);
        return false;
    }
};

/**
 * Get total storage used by evidence files
 */
export const getEvidenceStorageSize = async (): Promise<number> => {
    try {
        const evidenceFiles = await listEvidenceFiles();
        let totalSize = 0;
        
        for (const file of evidenceFiles) {
            try {
                const fileInfo = await FileSystem.getInfoAsync(file.filePath);
                if (fileInfo.exists && 'size' in fileInfo) {
                    totalSize += fileInfo.size || 0;
                }
                
                // Also check media files
                const evidence = await loadEvidencePackage(file.filePath);
                if (evidence) {
                    if (evidence.audioUri) {
                        try {
                            const audioInfo = await FileSystem.getInfoAsync(evidence.audioUri);
                            if (audioInfo.exists && 'size' in audioInfo) {
                                totalSize += audioInfo.size || 0;
                            }
                        } catch (error) {
                            // Ignore errors for missing files
                        }
                    }
                    if (evidence.videoUri) {
                        try {
                            const videoInfo = await FileSystem.getInfoAsync(evidence.videoUri);
                            if (videoInfo.exists && 'size' in videoInfo) {
                                totalSize += videoInfo.size || 0;
                            }
                        } catch (error) {
                            // Ignore errors for missing files
                        }
                    }
                }
            } catch (error) {
                // Ignore errors for individual files
            }
        }
        
        return totalSize;
    } catch (error) {
        console.error('Failed to calculate storage size:', error);
        return 0;
    }
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

