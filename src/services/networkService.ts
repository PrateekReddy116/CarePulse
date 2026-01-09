import * as Network from 'expo-network';

/**
 * Checks if the device is currently connected to the internet.
 * @returns Promise resolving to true if connected, false otherwise.
 */
export const isOnline = async (): Promise<boolean> => {
    try {
        const state = await Network.getNetworkStateAsync();
        return !!state.isConnected && !!state.isInternetReachable;
    } catch (error) {
        console.error('Error checking network status:', error);
        return false;
    }
};
