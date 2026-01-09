# CarePulse 🛡️

A modern, Apple-inspired safety companion app built with React Native and Expo. CarePulse provides real-time location sharing, emergency SOS functionality, and peace of mind for users and their loved ones.

## 📱 Features

### Core Safety Tools

- **Monitor Me** 👁️
  - Share your live location and status with trusted contacts
  - Real-time companionship until you feel safe or reach your destination
  - Location history saved for safety

- **SOS Timers** ⏱️
  - Set countdown timers for your safety
  - Automatic emergency alerts if you don't check in
  - Customizable timer durations

- **Geofencing** 📍
  - Create virtual safe zones on the map
  - Automatic notifications when entering or leaving designated areas
  - Multiple geofences support

### Additional Features

- **Emergency Contacts** 📞
  - Pre-configured emergency services (Police, Ambulance, Fire Department)
  - Custom contact management
  - Quick access to trusted individuals

- **Live Chat** 💬
  - Real-time messaging with contacts
  - Share live location within chat
  - Access safety tools directly from conversations

- **Communities** 👥
  - Create and join safety communities
  - Network with other users
  - Community-based safety features

- **Guardian Angel Network** 👼
  - Volunteer-based emergency response system
  - Automatic volunteer assignment during emergencies
  - Real-time volunteer tracking on map

- **Dark/Light Mode** 🌓
  - System-aware theme switching
  - Persistent theme preference
  - Beautiful UI in both modes

- **User Profile & Health Info** 🏥
  - Store medical information (blood group, allergies, conditions)
  - Quick access during emergencies
  - Profile customization

## 🛠️ Tech Stack

- **Framework**: React Native with Expo (~54.0.27)
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack Navigator)
- **Backend**: Supabase (Authentication, Database, Real-time)
- **Maps**: React Native Maps
- **State Management**: React Context API
- **Storage**: AsyncStorage for local data persistence
- **Notifications**: Expo Notifications
- **Location Services**: Expo Location
- **UI Components**: Custom components with Apple-inspired design
- **Icons**: Lucide React Native

## 📋 Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator / Physical device
- Supabase account (for backend services)
- Google Maps API key (for map functionality)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PrateekReddy116/sahara.git
   cd sahara
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SARVAM_API_KEY=your_sarvam_api_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**
   
   Follow the instructions in `SUPABASE_SETUP.md` to:
   - Create necessary database tables (`users`, `communities`, `notifications`)
   - Set up Row Level Security (RLS) policies
   - Configure authentication

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on physical device

## 📁 Project Structure

```
CarePulse/
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

## 🎯 Usage

### Setting Up Your Profile

1. Launch the app and create an account
2. Complete your profile with medical information
3. Add emergency contacts from your phone or by searching app users

### Using Monitor Me

1. Navigate to Safety Tools → Monitor Me
2. Select contacts to share with
3. Start monitoring to share live location
4. Stop when you reach your destination safely

### Setting SOS Timers

1. Go to Safety Tools → SOS Timers
2. Create a new timer with duration
3. If you don't check in before timer expires, emergency alerts are sent automatically

### Creating Geofences

1. Navigate to Safety Tools → Geofencing
2. Tap on the map to create a geofence
3. Set entry/exit notifications
4. Monitor will automatically notify when you cross boundaries

### Emergency SOS

1. Press the SOS button on the Home screen
2. Countdown starts (5 seconds)
3. Emergency contacts and nearby volunteers are notified
4. Evidence capture begins automatically (if enabled)
5. Tap "I AM SAFE" when the situation is resolved

## 🔒 Security Features

- **Secure Authentication**: Supabase Auth with JWT tokens
- **Encrypted Storage**: Sensitive data stored securely
- **Privacy Controls**: User-controlled location sharing
- **Emergency Fallback**: SMS fallback for non-registered contacts

## 🌐 API Integration

The app integrates with:
- **Supabase**: Backend-as-a-Service for authentication, database, and real-time features
- **Google Maps API**: Map rendering and location services
- **Expo Notifications**: Push notifications for alerts
- **SMS Gateway**: Emergency message fallback (requires backend setup)

## 📱 Platform Support

- ✅ iOS (via Expo Go or Development Build)
- ✅ Android (via Expo Go or Development Build)
- ⚠️ Web (partial support)

## 🔧 Development

### Running Linter
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

## 📝 Notes

- This app requires location permissions to function properly
- Background location access is needed for geofencing and SOS features
- For automatic SMS sending, a backend SMS service (Twilio, AWS SNS, etc.) needs to be configured
- Some features (like ESP32 Mesh Network) require a development build, not Expo Go

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👨‍💻 Author

**Prateek Reddy**
- GitHub: [@PrateekReddy116](https://github.com/PrateekReddy116)

## 🙏 Acknowledgments

- Design inspiration from Apple Human Interface Guidelines
- Icons provided by Lucide
- Maps powered by React Native Maps
- Backend infrastructure by Supabase

---

**Stay Safe. Stay Connected. CarePulse.** 🛡️
