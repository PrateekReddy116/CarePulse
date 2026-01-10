# ESP32 BLE Setup Guide for Android

## Overview
ESP32 BLE (Bluetooth Low Energy) requires a **development build** because it uses native modules that aren't available in Expo Go.

## Prerequisites

1. **Expo Development Build** - Not Expo Go
2. **Android Device** - Physical device (BLE doesn't work well on emulators)
3. **ESP32 Device** - Your Sathi device with BLE enabled

## Step 1: Install BLE Library

We'll use `react-native-ble-plx` which is the most popular and well-maintained BLE library for React Native.

```bash
npm install react-native-ble-plx
```

Then install the Expo config plugin:

```bash
npx expo install expo-build-properties
```

## Step 2: Configure app.json

Add the BLE permissions and config plugin to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 34,
            "targetSdkVersion": 34
          }
        }
      ],
      [
        "@config-plugins/react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "isBleRequired": true
        }
      ]
    ],
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

## Step 3: Create Development Build for Android

Since you already have `expo-dev-client` installed, you can create a development build:

### Option A: Using EAS Build (Recommended - Cloud Build)
```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (if first time)
eas build:configure

# Build for Android
eas build --profile development --platform android
```

### Option B: Local Build (Requires Android Studio)
```bash
# Install Android Studio and set up Android SDK

# Prebuild native code
npx expo prebuild

# Build and run on Android
npx expo run:android
```

## Step 4: Install on Your Android Device

After building:
- Download the APK from EAS (if using cloud build)
- Install on your Android device
- Or connect device via USB and run `npx expo run:android`

## Step 5: Important Notes

### Android 12+ Permissions
Android 12+ requires additional runtime permissions for BLE scanning. These need to be requested at runtime.

### Testing Requirements
- **Physical Device Required**: BLE doesn't work reliably on Android emulators
- **Location Permission**: Android requires location permission for BLE scanning
- **Android Version**: Works on Android 5.0+ (API 21+), but Android 12+ has stricter permissions

## Step 6: Implementation

Once the build is ready, we'll implement:
1. BLE Manager initialization
2. Scanning for nearby devices
3. Filtering ESP32 devices (by name/UUID)
4. Connecting to ESP32
5. Reading/writing characteristics
6. Handling disconnections

## Next Steps

After completing the setup above, I'll help you:
1. Create a BLE service file
2. Implement scanning functionality
3. Update the SathiScreen to use real BLE
4. Handle ESP32 communication
