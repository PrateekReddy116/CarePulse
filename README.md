# Sahara

A modern, Apple-inspired safety companion app built with React Native and Expo. Sahara provides real-time location sharing, emergency SOS functionality, and peace of mind for users and their loved ones.

## Features

### Core Safety Tools

* **Monitor Me:** Share your live location and status with trusted contacts for real-time companionship until you feel safe or reach your destination. Location history is securely saved.
* **SOS Timers:** Set countdown timers for your safety. If you do not check in before the timer expires, the app sends automatic emergency alerts.
* **Geofencing:** Create virtual safe zones on the map. The app triggers automatic notifications when you enter or leave designated areas, supporting multiple geofences simultaneously.

### Additional Features

* **Emergency Contacts:** Pre-configured emergency services (Police, Ambulance, Fire Department), custom contact management, and quick access to trusted individuals.
* **Live Chat:** Real-time messaging with contacts, featuring live location sharing and direct access to safety tools within conversations.
* **Communities:** Network with other users by creating and joining safety communities with dedicated community-based safety features.
* **Guardian Angel Network:** A volunteer-based emergency response system. Automatically assigns and tracks nearby volunteers on the map during an active emergency.
* **System-Aware Theme:** Beautiful UI in both Dark and Light modes, respecting the user's persistent system preferences.
* **Medical Profile:** Securely store crucial medical information (blood group, allergies, conditions) for quick access by first responders during emergencies.

---

## Tech Stack

* **Framework**: React Native with Expo (~54.0.27)
* **Language**: TypeScript
* **Navigation**: React Navigation (Stack Navigator)
* **Backend**: Supabase (Authentication, Database, Real-time)
* **Maps**: React Native Maps
* **State Management**: React Context API
* **Storage**: AsyncStorage for local data persistence
* **Notifications**: Expo Notifications
* **Location Services**: Expo Location
* **UI Components**: Custom components utilizing an Apple-inspired design language
* **Icons**: Lucide React Native

---

## Prerequisites

Before you begin, ensure your development environment meets the following requirements:

* Node.js (v18 or higher)
* npm or yarn
* Expo CLI (`npm install -g expo-cli`)
* iOS Simulator (Mac only) or Android Emulator / Physical device
* Supabase account (for backend services)
* Google Maps API key (for map functionality)

---

## Installation

1. **Clone the repository**
```bash

```



git clone https://github.com/PrateekReddy116/sahara.git
cd sahara

```

2. **Install dependencies**
   ```bash
npm install

```

3. **Set up environment variables**
Create a `.env` file in the root directory and add the following:
```env

```



EXPO_PUBLIC_SARVAM_API_KEY=your_sarvam_api_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

```

4. **Set up Supabase**
   Follow the instructions in `SUPABASE_SETUP.md` to:
   *   Create necessary database tables (`users`, `communities`, `notifications`)
   *   Set up Row Level Security (RLS) policies
   *   Configure authentication

5. **Start the development server**
   ```bash
npm start

```

6. **Run on device/simulator**
* Press `i` for iOS Simulator
* Press `a` for Android Emulator
* Scan the QR code with the Expo Go app on a physical device



---

## Project Structure

```text
Sahara/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BottomNav.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── SafetyToolsScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   └── ...
│   ├── context/             # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── EmergencyContext.tsx
│   │   └── ThemeContext.tsx
│   ├── services/            # Business logic services
│   │   ├── commsService.ts
│   │   ├── monitorMeService.ts
│   │   ├── sosTimerService.ts
│   │   └── ...
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── constants/           # Constants and theme
│   │   ├── theme.ts
│   │   └── mockData.ts
│   └── lib/                 # Library configurations
│       └── supabase.ts
├── assets/                  # Images and static assets
├── App.tsx                  # Root component
├── app.json                 # Expo configuration
└── package.json             # Dependencies

```

---

## Usage Guide

### Setting Up Your Profile

1. Launch the app and create an account.
2. Complete your profile with relevant medical information.
3. Add emergency contacts from your phone or by searching app users.

### Using Monitor Me

1. Navigate to **Safety Tools > Monitor Me**.
2. Select the contacts you wish to share your location with.
3. Start monitoring to share your live location.
4. Stop the monitor when you reach your destination safely.

### Setting SOS Timers

1. Go to **Safety Tools > SOS Timers**.
2. Create a new timer with your desired duration.
3. If you do not manually check in before the timer expires, the app will automatically dispatch emergency alerts.

### Creating Geofences

1. Navigate to **Safety Tools > Geofencing**.
2. Tap on the map to define a geofence boundary.
3. Set your preferences for entry and exit notifications.
4. The monitor will automatically notify your contacts when you cross these boundaries.

### Emergency SOS

1. Press the primary **SOS** button on the Home screen.
2. A 5-second cancellation countdown begins.
3. Once triggered, emergency contacts and nearby Guardian Angel volunteers are notified.
4. Evidence capture begins automatically (if enabled in settings).
5. Tap "I AM SAFE" when the situation is resolved to stand down the alert.

---

## Security Features

* **Secure Authentication**: Powered by Supabase Auth utilizing JWT tokens.
* **Encrypted Storage**: Sensitive local data is securely persisted.
* **Privacy Controls**: Strict, user-controlled location sharing permissions.
* **Emergency Fallback**: SMS fallback functionality ensures alerts are sent even to non-registered contacts.

---

## API Integration

Sahara relies on the following external services:

* **Supabase**: Backend-as-a-Service handling authentication, PostgreSQL database, and real-time subscriptions.
* **Google Maps API**: Core map rendering, geocoding, and location services.
* **Expo Notifications**: Push notification delivery for alerts and messages.
* **SMS Gateway**: Handles emergency message fallbacks (requires additional backend setup).

---

## Platform Support

* **iOS**: Supported via Expo Go or Custom Development Build.
* **Android**: Supported via Expo Go or Custom Development Build.
* **Web**: Partial support (some native modules may be unavailable).

---

## Development

### Running the Linter

```bash
npm run lint

```

### Building for Production

```bash
# Android
npm run android

# iOS
npm run ios

```

---

## Notes

* **Permissions:** This application requires explicit location permissions to function. Background location access is strictly necessary for Geofencing and SOS timer features to operate when the app is minimized.
* **SMS Services:** For automatic SMS dispatch, a backend SMS provider (e.g., Twilio, AWS SNS) must be configured and connected to the backend.
* **Advanced Features:** Certain hardware integrations (like the ESP32 Mesh Network) require a compiled development build and cannot be tested via standard Expo Go.

---

## Contributing

Contributions are welcome. Please adhere to the following workflow when submitting changes:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/FeatureName`).
3. Commit your changes (`git commit -m 'Add FeatureName'`).
4. Push to the branch (`git push origin feature/FeatureName`).
5. Open a Pull Request for review.

---

## License

This project is private and proprietary.

## Author

**Prateek Reddy**

* GitHub: [@PrateekReddy116](https://www.google.com/search?q=https://github.com/PrateekReddy116)

## Acknowledgments

* Design inspiration drawn from Apple's Human Interface Guidelines.
* Icons provided by Lucide.
* Mapping capabilities powered by React Native Maps.
* Backend infrastructure provided by Supabase.
