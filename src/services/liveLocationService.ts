/**
 * WebSocket Live Location Service
 * 
 * Handles real-time location sharing via WebSocket
 * - Sender (volunteer) side
 * - Receiver (viewer) side
 * - Auto-reconnection
 * - Background handling
 */

// Get WebSocket server URL from environment or use default
const WS_SERVER_URL = process.env.EXPO_PUBLIC_WS_SERVER_URL || 'ws://localhost:8080';
const RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_ATTEMPTS = 5;
const LOCATION_UPDATE_INTERVAL = 2000; // 2 seconds

export type LiveLocationRole = 'volunteer' | 'viewer';

export interface LiveLocationSession {
    sessionId: string;
    volunteerId: string;
    role: LiveLocationRole;
    isActive: boolean;
}

export interface LocationUpdate {
    sessionId: string;
    lat: number;
    lng: number;
    timestamp: number;
}

type MessageHandler = (data: any) => void;
type LocationUpdateHandler = (update: LocationUpdate) => void;
type ErrorHandler = (error: Error) => void;
type ConnectionHandler = () => void;

class LiveLocationWebSocket {
    private ws: WebSocket | null = null;
    private sessionId: string | null = null;
    private volunteerId: string | null = null;
    private role: LiveLocationRole | null = null;
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isReconnecting = false;
    private shouldReconnect = true;
    
    // Handlers
    private onLocationUpdateHandler: LocationUpdateHandler | null = null;
    private onSessionStartedHandler: ConnectionHandler | null = null;
    private onSessionEndedHandler: ConnectionHandler | null = null;
    private onErrorHandler: ErrorHandler | null = null;
    private onConnectedHandler: ConnectionHandler | null = null;
    private onDisconnectedHandler: ConnectionHandler | null = null;
    
    // Location tracking interval (for volunteer)
    private locationInterval: NodeJS.Timeout | null = null;
    
    /**
     * Connect to WebSocket server
     */
    connect(url: string = WS_SERVER_URL): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    resolve();
                    return;
                }
                
                console.log(`🔌 Connecting to WebSocket: ${url}`);
                this.ws = new WebSocket(url);
                this.isReconnecting = false;
                
                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.isReconnecting = false;
                    if (this.onConnectedHandler) {
                        this.onConnectedHandler();
                    }
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('❌ Error parsing WebSocket message:', error);
                        if (this.onErrorHandler) {
                            this.onErrorHandler(new Error('Failed to parse message'));
                        }
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    if (this.onErrorHandler) {
                        this.onErrorHandler(new Error('WebSocket connection error'));
                    }
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    if (this.onDisconnectedHandler) {
                        this.onDisconnectedHandler();
                    }
                    
                    // Auto-reconnect if not intentionally closed
                    if (this.shouldReconnect && !this.isReconnecting) {
                        this.reconnect();
                    }
                };
            } catch (error) {
                console.error('❌ Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: any) {
        switch (message.type) {
            case 'LIVE_LOCATION':
                if (this.onLocationUpdateHandler && message.sessionId && message.lat !== undefined && message.lng !== undefined) {
                    this.onLocationUpdateHandler({
                        sessionId: message.sessionId,
                        lat: message.lat,
                        lng: message.lng,
                        timestamp: message.timestamp || Date.now(),
                    });
                }
                break;
                
            case 'LIVE_LOCATION_STARTED':
                if (this.onSessionStartedHandler) {
                    this.onSessionStartedHandler();
                }
                break;
                
            case 'LIVE_LOCATION_ENDED':
                if (this.onSessionEndedHandler) {
                    this.onSessionEndedHandler();
                }
                break;
                
            case 'ERROR':
                console.error('❌ WebSocket server error:', message.message);
                if (this.onErrorHandler) {
                    this.onErrorHandler(new Error(message.message || 'Unknown error'));
                }
                break;
                
            case 'PONG':
                // Heartbeat response
                break;
                
            default:
                console.warn('⚠️  Unknown message type:', message.type);
        }
    }
    
    /**
     * Start live location sharing (volunteer)
     */
    async startLiveLocation(sessionId: string, volunteerId: string): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this.connect();
        }
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        this.sessionId = sessionId;
        this.volunteerId = volunteerId;
        this.role = 'volunteer';
        
        const message = {
            type: 'START_LIVE_LOCATION',
            sessionId,
            volunteerId,
        };
        
        this.ws.send(JSON.stringify(message));
        console.log(`📍 Started live location session: ${sessionId}`);
    }
    
    /**
     * Subscribe to live location (viewer)
     */
    async subscribeToLiveLocation(sessionId: string): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this.connect();
        }
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        this.sessionId = sessionId;
        this.role = 'viewer';
        
        const message = {
            type: 'SUBSCRIBE_LIVE_LOCATION',
            sessionId,
        };
        
        this.ws.send(JSON.stringify(message));
        console.log(`👁️  Subscribed to live location session: ${sessionId}`);
    }
    
    /**
     * Send location update (volunteer)
     */
    sendLocationUpdate(lat: number, lng: number): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️  WebSocket not connected, cannot send location update');
            return;
        }
        
        if (!this.sessionId) {
            console.warn('⚠️  No active session, cannot send location update');
            return;
        }
        
        const message = {
            type: 'LOCATION_UPDATE',
            sessionId: this.sessionId,
            lat,
            lng,
        };
        
        this.ws.send(JSON.stringify(message));
    }
    
    /**
     * Stop live location sharing
     */
    stopLiveLocation(): void {
        if (this.locationInterval) {
            clearInterval(this.locationInterval);
            this.locationInterval = null;
        }
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.sessionId) {
            const message = {
                type: 'STOP_LIVE_LOCATION',
                sessionId: this.sessionId,
            };
            this.ws.send(JSON.stringify(message));
        }
        
        this.sessionId = null;
        this.volunteerId = null;
        this.role = null;
        console.log('🛑 Stopped live location sharing');
    }
    
    /**
     * Start location tracking (volunteer)
     */
    startLocationTracking(
        getCurrentLocation: () => Promise<{ latitude: number; longitude: number }>
    ): void {
        if (this.locationInterval) {
            clearInterval(this.locationInterval);
        }
        
        // Send initial location
        getCurrentLocation().then((loc) => {
            this.sendLocationUpdate(loc.latitude, loc.longitude);
        }).catch((error) => {
            console.error('❌ Failed to get initial location:', error);
        });
        
        // Send updates every 2 seconds
        this.locationInterval = setInterval(async () => {
            try {
                const location = await getCurrentLocation();
                this.sendLocationUpdate(location.latitude, location.longitude);
            } catch (error) {
                console.error('❌ Failed to get location:', error);
            }
        }, LOCATION_UPDATE_INTERVAL);
    }
    
    /**
     * Stop location tracking
     */
    stopLocationTracking(): void {
        if (this.locationInterval) {
            clearInterval(this.locationInterval);
            this.locationInterval = null;
        }
    }
    
    /**
     * Reconnect to WebSocket server
     */
    private reconnect(): void {
        if (this.isReconnecting || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('❌ Max reconnection attempts reached');
            if (this.onErrorHandler) {
                this.onErrorHandler(new Error('Failed to reconnect after multiple attempts'));
            }
            return;
        }
        
        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
                
                // Re-subscribe if we had an active session
                if (this.sessionId) {
                    if (this.role === 'volunteer' && this.volunteerId) {
                        await this.startLiveLocation(this.sessionId, this.volunteerId);
                    } else if (this.role === 'viewer') {
                        await this.subscribeToLiveLocation(this.sessionId);
                    }
                }
            } catch (error) {
                console.error('❌ Reconnection failed:', error);
                this.reconnect();
            }
        }, delay);
    }
    
    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.shouldReconnect = false;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        this.stopLocationTracking();
        this.stopLiveLocation();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.sessionId = null;
        this.volunteerId = null;
        this.role = null;
    }
    
    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
    
    /**
     * Get current session
     */
    getSession(): LiveLocationSession | null {
        if (!this.sessionId || !this.volunteerId || !this.role) {
            return null;
        }
        
        return {
            sessionId: this.sessionId,
            volunteerId: this.volunteerId,
            role: this.role,
            isActive: this.isConnected(),
        };
    }
    
    // Event handlers
    onLocationUpdate(handler: LocationUpdateHandler): void {
        this.onLocationUpdateHandler = handler;
    }
    
    onSessionStarted(handler: ConnectionHandler): void {
        this.onSessionStartedHandler = handler;
    }
    
    onSessionEnded(handler: ConnectionHandler): void {
        this.onSessionEndedHandler = handler;
    }
    
    onError(handler: ErrorHandler): void {
        this.onErrorHandler = handler;
    }
    
    onConnected(handler: ConnectionHandler): void {
        this.onConnectedHandler = handler;
    }
    
    onDisconnected(handler: ConnectionHandler): void {
        this.onDisconnectedHandler = handler;
    }
}

// Singleton instance
let wsInstance: LiveLocationWebSocket | null = null;

/**
 * Get WebSocket instance (singleton)
 */
export const getLiveLocationWS = (): LiveLocationWebSocket => {
    if (!wsInstance) {
        wsInstance = new LiveLocationWebSocket();
    }
    return wsInstance;
};

/**
 * Start live location sharing (volunteer)
 */
export const startLiveLocationSharing = async (
    sessionId: string,
    volunteerId: string,
    getCurrentLocation: () => Promise<{ latitude: number; longitude: number }>
): Promise<void> => {
    const ws = getLiveLocationWS();
    await ws.connect();
    await ws.startLiveLocation(sessionId, volunteerId);
    ws.startLocationTracking(getCurrentLocation);
};

/**
 * Stop live location sharing
 */
export const stopLiveLocationSharing = (): void => {
    const ws = getLiveLocationWS();
    ws.stopLocationTracking();
    ws.stopLiveLocation();
};

/**
 * Subscribe to live location (viewer)
 */
export const subscribeToLiveLocationSharing = async (sessionId: string): Promise<void> => {
    const ws = getLiveLocationWS();
    await ws.connect();
    await ws.subscribeToLiveLocation(sessionId);
};

/**
 * Unsubscribe from live location
 */
export const unsubscribeFromLiveLocation = (): void => {
    const ws = getLiveLocationWS();
    ws.disconnect();
};
