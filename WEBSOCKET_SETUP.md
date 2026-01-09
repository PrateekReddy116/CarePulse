# WebSocket Live Location Setup Guide

Complete guide for setting up WhatsApp-style live location sharing in CarePulse.

## 📋 Overview

The live location system uses WebSockets for real-time GPS sharing:
- **Backend**: Node.js WebSocket server (RAM-based, ultra-low latency)
- **Frontend**: React Native with native WebSocket API
- **Updates**: Every 2 seconds
- **Storage**: RAM only (no database for GPS data)

## 🚀 Quick Start

### 1. Backend Setup (WebSocket Server)

```bash
cd server
npm install
npm start
```

Server runs on `ws://localhost:8080` by default.

### 2. Frontend Configuration

Add to `.env`:
```env
EXPO_PUBLIC_WS_SERVER_URL=ws://YOUR_SERVER_IP:8080
```

**For different environments:**

| Environment | URL |
|------------|-----|
| iOS Simulator | `ws://localhost:8080` |
| Android Emulator | `ws://10.0.2.2:8080` |
| Physical Device (Same Network) | `ws://192.168.1.X:8080` |
| Production | `wss://your-server.com` |

### 3. Usage

#### **Volunteer (Sender):**

1. Go to **Safety Tools → Monitor Me**
2. Click **"Start Sharing"**
3. WebSocket connection established
4. Location updates sent every 2 seconds automatically
5. Click **"Stop Sharing"** to end session

#### **Viewer (Receiver):**

1. Navigate to contact who is sharing
2. Open live location viewer
3. WebSocket subscribes to session
4. Map marker updates in real-time
5. Smooth animations and automatic map centering

## 📱 How It Works

### Flow Diagram

```
Volunteer Phone              WebSocket Server              Viewer Phone
     |                              |                            |
     |-- START_LIVE_LOCATION ------>|                            |
     |<-- LIVE_LOCATION_STARTED ----|                            |
     |                              |                            |
     |-- LOCATION_UPDATE ---------->|                            |
     |                              |---- LIVE_LOCATION -------->|
     |                              |<--- SUBSCRIBE -------------|
     |                              |                            |
     |-- LOCATION_UPDATE ---------->|                            |
     |                              |---- LIVE_LOCATION -------->|
     |                              |                            |
     |-- STOP_LIVE_LOCATION ------->|                            |
     |                              |---- LIVE_LOCATION_ENDED -->|
```

### Message Types

1. **START_LIVE_LOCATION**
   ```json
   {
     "type": "START_LIVE_LOCATION",
     "sessionId": "session_123",
     "volunteerId": "user_456"
   }
   ```

2. **LOCATION_UPDATE** (sent every 2 seconds)
   ```json
   {
     "type": "LOCATION_UPDATE",
     "sessionId": "session_123",
     "lat": 17.3850,
     "lng": 78.4867
   }
   ```

3. **SUBSCRIBE_LIVE_LOCATION**
   ```json
   {
     "type": "SUBSCRIBE_LIVE_LOCATION",
     "sessionId": "session_123"
   }
   ```

4. **LIVE_LOCATION** (broadcast to viewers)
   ```json
   {
     "type": "LIVE_LOCATION",
     "sessionId": "session_123",
     "lat": 17.3850,
     "lng": 78.4867,
     "timestamp": 1234567890
   }
   ```

5. **STOP_LIVE_LOCATION**
   ```json
   {
     "type": "STOP_LIVE_LOCATION",
     "sessionId": "session_123"
   }
   ```

## 🔧 Technical Details

### Backend (`server/websocket-server.js`)

- **Port**: 8080 (configurable via `WS_PORT`)
- **Session Timeout**: 30 minutes
- **Heartbeat**: 30 seconds
- **Storage**: In-memory Map (no database)
- **Cleanup**: Automatic on disconnect/timeout

### Frontend (`src/services/liveLocationService.ts`)

- **Reconnection**: Exponential backoff (max 5 attempts)
- **Update Interval**: 2 seconds
- **Background Handling**: Stops on app background
- **Error Recovery**: Automatic retry with user feedback

### Integration Points

1. **Monitor Me Service** (`src/services/monitorMeService.ts`)
   - Integrates WebSocket with existing Monitor Me feature
   - Maintains local location history
   - Creates session IDs automatically

2. **Live Location Viewer** (`src/screens/LiveLocationViewerScreen.tsx`)
   - Real-time map updates
   - Smooth marker animations
   - Connection status indicators
   - Error handling with retry

## 🌐 Deployment

### Development (Local)

1. Run server: `cd server && npm start`
2. Get your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update `.env`: `EXPO_PUBLIC_WS_SERVER_URL=ws://YOUR_IP:8080`
4. Test on physical device

### Production (Cloud)

#### Option 1: Heroku

```bash
cd server
heroku create carepulse-ws
heroku config:set WS_PORT=$PORT
git push heroku main
```

Update `.env`:
```
EXPO_PUBLIC_WS_SERVER_URL=wss://carepulse-ws.herokuapp.com
```

#### Option 2: AWS EC2 / DigitalOcean

```bash
# On server
git clone <your-repo>
cd server
npm install
npm install -g pm2
pm2 start websocket-server.js --name "carepulse-ws"
pm2 save
pm2 startup  # Follow instructions
```

Configure firewall (port 8080).

Update `.env`:
```
EXPO_PUBLIC_WS_SERVER_URL=wss://your-domain.com
```

#### Option 3: Railway / Render

1. Connect GitHub repository
2. Set root directory: `server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment variable: `WS_PORT=$PORT`

## 🔒 Security (Production)

### Current Implementation

⚠️ **Basic security only** - Suitable for development/testing.

### Production Hardening Required:

1. **Authentication**
   - Add JWT token validation
   - Verify session ownership
   - Prevent unauthorized subscriptions

2. **Rate Limiting**
   - Limit messages per client
   - Prevent spam/abuse

3. **Input Validation**
   - Validate coordinates (lat: -90 to 90, lng: -180 to 180)
   - Sanitize all inputs
   - Reject invalid messages

4. **WSS (Secure WebSocket)**
   - Use TLS/SSL certificate
   - Update URL to `wss://`
   - Required for production

5. **Origin Validation**
   - Check Origin header
   - Whitelist allowed domains

## 📊 Monitoring

### Server Logs

The server logs:
- New connections/disconnections
- Session creation/updates
- Broadcast statistics
- Errors

Example output:
```
🔌 New WebSocket connection from ::1
📍 [session_123] Live location session started by volunteer user_456
📡 [session_123] Broadcasted location (17.385000, 78.486700) to 3 viewers
👁️  [session_123] Viewer subscribed. Total viewers: 4
🛑 [session_123] Live location session ended
```

### Frontend Debugging

Enable WebSocket logs:
```javascript
// In liveLocationService.ts, logs are already enabled
// Check console for:
// ✅ WebSocket connected
// 📍 Started live location session: session_123
// 📡 Sent location update
// 👁️  Subscribed to live location session: session_123
```

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to server
- Check server is running: `curl http://localhost:8080` (should fail, but server running)
- Verify IP address in `.env`
- Check firewall allows port 8080
- For physical device, ensure same Wi-Fi network

**Problem**: Connection drops frequently
- Check network stability
- Verify server has sufficient resources
- Check server logs for errors
- Increase heartbeat interval if needed

### Location Not Updating

**Problem**: Location updates not appearing
- Verify GPS permissions granted
- Check location services enabled
- Verify WebSocket connection is open
- Check server logs for received updates

**Problem**: Viewers not receiving updates
- Verify subscription message sent
- Check server has session
- Verify WebSocket connection on viewer side
- Check network connectivity

### Performance Issues

**Problem**: High latency
- Use local server for testing
- Check network speed
- Reduce update interval (not recommended below 1 second)
- Optimize map rendering

**Problem**: High memory usage
- Check for session leaks (dead connections)
- Reduce session timeout
- Monitor server memory

## 🧪 Testing

### Manual Testing

1. **Start server**: `cd server && npm start`
2. **Start Monitor Me** on Device A
3. **View Live Location** on Device B (use sessionId from logs)
4. **Verify**: Marker moves in real-time
5. **Stop sharing** on Device A
6. **Verify**: Viewer receives session ended message

### Automated Testing

Use WebSocket testing tools:
- [WebSocket King](https://websocketking.com/)
- [Postman](https://www.postman.com/)
- Custom test script (see `server/README.md`)

## 📚 Additional Resources

- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Native WebSocket](https://reactnative.dev/docs/network#websocket-support)
- [ws Library Documentation](https://github.com/websockets/ws)

## ✅ Checklist

- [ ] Backend server installed and running
- [ ] WebSocket URL configured in `.env`
- [ ] Server accessible from mobile device
- [ ] Tested on iOS and Android
- [ ] Reconnection logic working
- [ ] Error handling tested
- [ ] Production deployment configured (if applicable)
- [ ] Security measures implemented (if production)

---

**Need Help?** Check `server/README.md` for server-specific details.
