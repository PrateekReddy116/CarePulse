# BLE Troubleshooting Guide

## Issue
Getting error: `BLE.requestDevice is not a function` when trying to scan for BLE devices.

## Root Cause
The `react-native-ble-plx` native module wasn't properly initialized in the development build. This happens when:
1. The native module is added after the initial build
2. The app wasn't rebuilt after adding the BLE plugin to `app.json`

## Solution Applied

### 1. Updated BLE Service with Better Error Handling
Modified `src/services/bleService.ts` to:
- Add null checks for BleManager initialization
- Add logging to track initialization status
- Gracefully handle cases where BLE module fails to load
- Show user-friendly error messages

### 2. Clean Rebuild Process
Ran the following commands:
```bash
# Clean Android build
cd android
.\gradlew clean

# Regenerate native code
npx expo prebuild --clean

# Rebuild and run the app
npx expo run:android
```

## How BLE Works in This App

### Development Build vs Expo Go
- **Development Build**: Full BLE functionality with `react-native-ble-plx`
- **Expo Go**: BLE not available (shows warning message)

### BLE Service Features
- Scan for ESP32 devices (filters by name containing "ESP32" or "Sathi")
- Connect/disconnect to devices
- Send data to ESP32
- Receive data from ESP32
- Monitor for emergency signals

### ESP32 Integration
When ESP32 sends "EMERGENCY" message:
1. App automatically calls `triggerSOS()`
2. Sends SMS to emergency contacts
3. Creates database notifications
4. Assigns volunteers
5. Navigates to SOS Activation screen

## Configuration

### app.json
```json
{
  "plugins": [
    [
      "react-native-ble-plx",
      {
        "isBackgroundEnabled": true,
        "modes": ["peripheral", "central"],
        "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
      }
    ]
  ],
  "android": {
    "permissions": [
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.ACCESS_FINE_LOCATION"
    ]
  }
}
```

### ESP32 UUIDs
```
Service UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
```

## Testing BLE

### 1. Upload ESP32 Code
Use `esp32_switch_ble.ino` with matching UUIDs

### 2. Run Development Build
```bash
npx expo run:android
```

### 3. Test Connection
1. Open app and navigate to Safety Tools > Sathi
2. Tap "Scan for Devices"
3. Grant Bluetooth permissions when prompted
4. Select your ESP32 device from the list
5. Wait for "Connected" status

### 4. Test Emergency Trigger
1. Press the button on ESP32
2. ESP32 sends "EMERGENCY" message
3. App should automatically trigger SOS

## Common Issues

### "BLE functionality requires a development build"
- You're running in Expo Go
- Solution: Use `npx expo run:android` instead of Expo Go

### "Bluetooth permissions are required"
- Android permissions not granted
- Solution: Grant permissions when prompted, or go to Settings > Apps > CarePulse > Permissions

### "Bluetooth is Off"
- Bluetooth is disabled on phone
- Solution: Enable Bluetooth in phone settings

### No devices found
- ESP32 not powered on
- ESP32 not advertising (check Serial Monitor)
- Device name doesn't contain "ESP32" or "Sathi"
- Solution: Check ESP32 code and power, ensure BLE advertising is active

### Connection fails
- ESP32 already connected to another device
- Bluetooth interference
- Solution: Reset ESP32, move closer, try again

## When to Rebuild

You need to rebuild the native app when:
- Adding new native modules (like BLE)
- Changing `app.json` plugins
- Updating native dependencies
- Changing Android permissions

You DON'T need to rebuild for:
- JavaScript/TypeScript code changes
- UI changes
- Business logic updates
- Most React Native code

## Quick Commands

```bash
# Start development build (with hot reload)
npx expo start --dev-client

# Rebuild native app
npx expo prebuild --clean
npx expo run:android

# Clean build
cd android
.\gradlew clean
cd ..
npx expo run:android
```

## Next Steps

1. Wait for the current build to complete
2. Install the app on your Android device
3. Test BLE scanning and connection
4. Upload ESP32 code and test emergency trigger
5. Verify SOS flow works when ESP32 sends emergency signal
