/**
 * WebSocket Server for WhatsApp-style Live Location Sharing
 * 
 * Architecture:
 * - RAM-based session storage (Map)
 * - Ultra-low latency (< 100ms)
 * - Auto-cleanup on disconnect
 * - Production-ready error handling
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.WS_PORT || 8080;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// In-memory session store
// Map<sessionId, { volunteerId, lat, lng, timestamp, sockets: Set<WebSocket> }>
const liveSessions = new Map();

// Client to session mapping (for quick lookup)
// Map<WebSocket, { sessionId, role: 'volunteer' | 'viewer' }>
const clientSessions = new Map();

// HTTP server for WebSocket upgrade
const server = http.createServer();

const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false, // Disable compression for lower latency
});

/**
 * Parse and validate WebSocket message
 */
function parseMessage(data) {
    try {
        const message = JSON.parse(data.toString());
        
        // Validate message type
        const validTypes = ['START_LIVE_LOCATION', 'LOCATION_UPDATE', 'SUBSCRIBE_LIVE_LOCATION', 'STOP_LIVE_LOCATION', 'PING'];
        if (!validTypes.includes(message.type)) {
            throw new Error(`Invalid message type: ${message.type}`);
        }
        
        return message;
    } catch (error) {
        return { error: error.message };
    }
}

/**
 * Create or update live location session
 */
function startLiveLocation(sessionId, volunteerId, ws) {
    let session = liveSessions.get(sessionId);
    
    if (session) {
        // Update existing session
        session.volunteerId = volunteerId;
        session.volunteerSocket = ws;
        
        // Clear existing timeout
        if (session.timeoutId) {
            clearTimeout(session.timeoutId);
        }
    } else {
        // Create new session
        session = {
            volunteerId,
            lat: null,
            lng: null,
            timestamp: Date.now(),
            volunteerSocket: ws,
            viewerSockets: new Set(),
            lastUpdate: Date.now(),
            timeoutId: null,
        };
        
        liveSessions.set(sessionId, session);
        console.log(`📍 [${sessionId}] Live location session started by volunteer ${volunteerId}`);
    }
    
    clientSessions.set(ws, { sessionId, role: 'volunteer' });
    
    // Set session timeout
    session.timeoutId = setTimeout(() => {
        stopLiveLocation(sessionId);
    }, SESSION_TIMEOUT);
}

/**
 * Update location for a session
 */
function updateLocation(sessionId, lat, lng) {
    const session = liveSessions.get(sessionId);
    
    if (!session) {
        console.warn(`⚠️  [${sessionId}] Attempted to update non-existent session`);
        return false;
    }
    
    // Update location data
    session.lat = lat;
    session.lng = lng;
    session.timestamp = Date.now();
    session.lastUpdate = Date.now();
    
    // Broadcast to all viewers
    const message = JSON.stringify({
        type: 'LIVE_LOCATION',
        sessionId,
        lat,
        lng,
        timestamp: session.timestamp,
    });
    
    let broadcastCount = 0;
    session.viewerSockets.forEach((viewerWs) => {
        if (viewerWs.readyState === WebSocket.OPEN) {
            viewerWs.send(message);
            broadcastCount++;
        }
    });
    
    if (broadcastCount > 0) {
        console.log(`📡 [${sessionId}] Broadcasted location (${lat.toFixed(6)}, ${lng.toFixed(6)}) to ${broadcastCount} viewers`);
    }
    
    // Reset timeout
    if (session.timeoutId) {
        clearTimeout(session.timeoutId);
    }
    session.timeoutId = setTimeout(() => {
        stopLiveLocation(sessionId);
    }, SESSION_TIMEOUT);
    
    return true;
}

/**
 * Subscribe a viewer to a live location session
 */
function subscribeToLiveLocation(sessionId, ws) {
    const session = liveSessions.get(sessionId);
    
    if (!session) {
        const errorMsg = JSON.stringify({
            type: 'ERROR',
            sessionId,
            message: 'Session not found',
        });
        ws.send(errorMsg);
        return false;
    }
    
    // Add viewer to session
    session.viewerSockets.add(ws);
    clientSessions.set(ws, { sessionId, role: 'viewer' });
    
    console.log(`👁️  [${sessionId}] Viewer subscribed. Total viewers: ${session.viewerSockets.size}`);
    
    // Send current location immediately if available
    if (session.lat !== null && session.lng !== null) {
        const message = JSON.stringify({
            type: 'LIVE_LOCATION',
            sessionId,
            lat: session.lat,
            lng: session.lng,
            timestamp: session.timestamp,
        });
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
    
    return true;
}

/**
 * Stop and cleanup live location session
 */
function stopLiveLocation(sessionId) {
    const session = liveSessions.get(sessionId);
    
    if (!session) {
        return;
    }
    
    // Clear timeout
    if (session.timeoutId) {
        clearTimeout(session.timeoutId);
    }
    
    // Notify all viewers that session ended
    const endMessage = JSON.stringify({
        type: 'LIVE_LOCATION_ENDED',
        sessionId,
    });
    
    session.viewerSockets.forEach((viewerWs) => {
        if (viewerWs.readyState === WebSocket.OPEN) {
            viewerWs.send(endMessage);
        }
    });
    
    // Remove session
    liveSessions.delete(sessionId);
    
    console.log(`🛑 [${sessionId}] Live location session ended`);
}

/**
 * Handle client disconnect
 */
function handleDisconnect(ws) {
    const clientInfo = clientSessions.get(ws);
    
    if (!clientInfo) {
        return;
    }
    
    const { sessionId, role } = clientInfo;
    const session = liveSessions.get(sessionId);
    
    if (!session) {
        clientSessions.delete(ws);
        return;
    }
    
    if (role === 'volunteer') {
        // Volunteer disconnected - end session
        console.log(`📴 [${sessionId}] Volunteer disconnected, ending session`);
        stopLiveLocation(sessionId);
    } else if (role === 'viewer') {
        // Viewer disconnected - remove from session
        session.viewerSockets.delete(ws);
        console.log(`👁️  [${sessionId}] Viewer unsubscribed. Remaining viewers: ${session.viewerSockets.size}`);
    }
    
    clientSessions.delete(ws);
}

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log(`🔌 New WebSocket connection from ${clientIP}`);
    
    // Heartbeat to keep connection alive
    let heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(heartbeatInterval);
        }
    }, HEARTBEAT_INTERVAL);
    
    ws.on('pong', () => {
        // Connection is alive
        ws.isAlive = true;
    });
    
    ws.on('message', (data) => {
        const message = parseMessage(data);
        
        if (message.error) {
            console.error(`❌ Message parse error: ${message.error}`);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: message.error,
            }));
            return;
        }
        
        // Handle different message types
        switch (message.type) {
            case 'START_LIVE_LOCATION':
                if (!message.sessionId || !message.volunteerId) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Missing sessionId or volunteerId',
                    }));
                    return;
                }
                startLiveLocation(message.sessionId, message.volunteerId, ws);
                ws.send(JSON.stringify({
                    type: 'LIVE_LOCATION_STARTED',
                    sessionId: message.sessionId,
                }));
                break;
                
            case 'LOCATION_UPDATE':
                if (!message.sessionId || message.lat === undefined || message.lng === undefined) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Missing sessionId, lat, or lng',
                    }));
                    return;
                }
                updateLocation(message.sessionId, message.lat, message.lng);
                break;
                
            case 'SUBSCRIBE_LIVE_LOCATION':
                if (!message.sessionId) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Missing sessionId',
                    }));
                    return;
                }
                subscribeToLiveLocation(message.sessionId, ws);
                break;
                
            case 'STOP_LIVE_LOCATION':
                if (!message.sessionId) {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Missing sessionId',
                    }));
                    return;
                }
                stopLiveLocation(message.sessionId);
                ws.send(JSON.stringify({
                    type: 'LIVE_LOCATION_STOPPED',
                    sessionId: message.sessionId,
                }));
                break;
                
            case 'PING':
                ws.send(JSON.stringify({ type: 'PONG' }));
                break;
                
            default:
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    message: `Unknown message type: ${message.type}`,
                }));
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 WebSocket connection closed from ${clientIP}`);
        clearInterval(heartbeatInterval);
        handleDisconnect(ws);
    });
    
    ws.on('error', (error) => {
        console.error(`❌ WebSocket error from ${clientIP}:`, error);
        clearInterval(heartbeatInterval);
        handleDisconnect(ws);
    });
    
    // Initialize connection alive flag
    ws.isAlive = true;
});

/**
 * Cleanup dead connections periodically
 */
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('🧹 Cleaning up dead connection');
            handleDisconnect(ws);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
    
    // Log session stats
    if (liveSessions.size > 0) {
        console.log(`📊 Active sessions: ${liveSessions.size}`);
        liveSessions.forEach((session, sessionId) => {
            console.log(`  - ${sessionId}: ${session.viewerSockets.size} viewers`);
        });
    }
}, 60000); // Every minute

/**
 * Start server
 */
server.listen(PORT, () => {
    console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
    console.log(`📡 Ready to handle live location sharing`);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    
    // Close all WebSocket connections
    wss.clients.forEach((ws) => {
        ws.close();
    });
    
    // Clear all sessions
    liveSessions.clear();
    clientSessions.clear();
    
    // Close server
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = { wss, server, liveSessions };
