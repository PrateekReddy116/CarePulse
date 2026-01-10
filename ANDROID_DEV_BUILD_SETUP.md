# Android Development Build Setup via USB Debugging

## Prerequisites

### 1. Install Android Studio
1. Download Android Studio from: https://developer.android.com/studio
2. Install it (includes Android SDK)
3. Open Android Studio and let it complete setup

### 2. Install Android SDK Components
In Android Studio:
1. Go to **Tools > SDK Manager**
2. Install:
   - **Android SDK Platform 34** (or latest)
   - **Android SDK Build-Tools 34**
   - **Android SDK Command-line Tools**
   - **Android Emulator** (optional, but useful)

### 3. Set Environment Variables (Windows)

Add to your System Environment Variables:

```
ANDROID_HOME = C:\Users\YourUsername\AppData\Local\Android\Sdk
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

### 4. Enable USB Debugging on Your Android Device

1. On your Android phone, go to **Settings > About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go back to **Settings > Developer Options**
4. Enable **USB Debugging**
5. Enable **Install via USB** (if available)

### 5. Connect Your Device

1. Connect your Android phone to computer via USB
2. On your phone, when prompted, allow USB debugging and remember the computer
3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed

## Build and Install Development Build

### Step 1: Install BLE Library

```bash
npx expo install expo-ble
npx expo install expo-build-properties
```

### Step 2: Update app.json

I'll update app.json with the required BLE permissions and plugins.

### Step 3: Prebuild Native Code

This generates the Android project:

```bash
npx expo prebuild --platform android
```

### Step 4: Build and Install on Device

This will build the app and install it directly on your connected device:

```bash
npx expo run:android
```

Or if you want to select a specific device:

```bash
npx expo run:android --device
```

### Step 5: Start Development Server

After installation, start the dev server (if not already running):

```bash
npx expo start --dev-client
```

## Troubleshooting

### Device Not Detected
- Make sure USB debugging is enabled
- Try different USB cable/port
- Run `adb kill-server` then `adb start-server`
- Check if device appears in `adb devices`

### Build Errors
- Make sure Android SDK is properly installed
- Check that JAVA_HOME is set (Android Studio usually handles this)
- Try cleaning: `cd android && ./gradlew clean && cd ..`

### Permission Issues
- Make sure all permissions are in `app.json`
- Check AndroidManifest.xml after prebuild

## After Successful Installation

Once installed, the app will:
- Connect to your development server automatically
- Hot reload when you make code changes
- Allow you to test BLE functionality

## Next Steps

After successfully installing the dev build:
1. Implement BLE scanning
2. Test ESP32 device connection
3. Add device pairing functionality
