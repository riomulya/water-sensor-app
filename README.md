# 🌊 FLUVIX - Water Sensor Monitoring App

<div align="center">

![FLUVIX Logo](./assets/images/adaptive-icon.png)

**Real-time Water Quality Monitoring System**

[![React Native](https://img.shields.io/badge/React%20Native-0.76.9-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-52.0.46-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

## 🎯 Overview

**FLUVIX** adalah aplikasi mobile untuk pemantauan kualitas air sungai secara real-time menggunakan teknologi IoT (Internet of Things). Aplikasi ini memungkinkan pengguna memantau berbagai parameter kualitas air seperti pH, turbiditas, suhu, dan gerakan sensor dengan visualisasi data yang menarik dan notifikasi real-time.

### ✨ Fitur Utama

- 📊 **Monitoring Real-time**: Pantau data sensor secara langsung dengan WebSocket
- 🗺️ **Interactive Maps**: Visualisasi lokasi sensor pada peta interaktif
- 📈 **Data Analytics**: Analisis statistik dan tren data historis
- 🔔 **Smart Notifications**: Notifikasi otomatis untuk parameter kritis
- 📱 **Cross Platform**: Tersedia untuk Android dan iOS
- 🌙 **Background Monitoring**: Pemantauan tetap berjalan di background
- 📍 **Geofencing**: Monitoring lokasi dengan teknologi geofencing
- 📋 **Data Export**: Export data ke format Excel/CSV

## 🔬 Parameter Yang Dipantau

| Parameter               | Deskripsi                     | Satuan                              |
| ----------------------- | ----------------------------- | ----------------------------------- |
| **pH**                  | Tingkat keasaman/kebasaan air | pH Units (0-14)                     |
| **Turbidity**           | Tingkat kekeruhan air         | NTU (Nephelometric Turbidity Units) |
| **Temperature**         | Suhu air                      | °C (Celsius)                        |
| **Accelerometer X/Y/Z** | Gerakan dan orientasi sensor  | m/s²                                |
| **Speed**               | Kecepatan aliran              | m/s                                 |

## 🚀 Quick Start

### Prerequisites

Pastikan Anda telah menginstall:

- [Node.js](https://nodejs.org/) (v18 atau lebih baru)
- [npm](https://www.npmjs.com/) atau [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Android Studio](https://developer.android.com/studio) (untuk Android development)
- [Xcode](https://developer.apple.com/xcode/) (untuk iOS development - Mac only)

### Installation

1. **Clone repository**

   ```bash
   git clone https://github.com/your-username/water-sensor-app.git
   cd water-sensor-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm start
   # atau
   npx expo start
   ```

4. **Run on device/emulator**

   ```bash
   # Android
   npm run android

   # iOS
   npm run ios

   # Web
   npm run web
   ```

## 📱 Development

### Available Scripts

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm start`       | Start Expo development server  |
| `npm run clean`   | Start with cleared cache       |
| `npm run android` | Run on Android device/emulator |
| `npm run ios`     | Run on iOS device/simulator    |
| `npm run web`     | Run on web browser             |
| `npm test`        | Run tests                      |
| `npm run lint`    | Run ESLint                     |

### Project Structure

```
water-sensor-app/
├── app/                    # Main application screens
│   ├── screens/           # Screen components
│   ├── auth/              # Authentication screens
│   ├── admin/             # Admin management
│   └── detail/            # Detail views
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── map/              # Map-related components
│   ├── notification/     # Notification services
│   └── statistics/       # Analytics components
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── constants/            # App constants
├── context/              # React context providers
├── assets/               # Static assets (images, fonts)
└── workers/              # Background workers
```

## 🛠️ Tech Stack

### Frontend

- **React Native** - Mobile app framework
- **Expo** - Development platform
- **TypeScript** - Type-safe programming
- **React Navigation** - Navigation library
- **React Hook Form** - Form management
- **Zustand** - State management

### UI/UX

- **Gluestack UI** - Component library
- **NativeWind** - Tailwind CSS for React Native
- **React Native Paper** - Material Design components
- **Moti** - Animation library
- **Lottie** - Complex animations

### Maps & Location

- **React Native Maps** - Native maps
- **Expo Location** - Location services
- **Geofencing** - Location-based triggers

### Data & Communication

- **Socket.IO** - Real-time communication
- **React Native Charts** - Data visualization
- **AsyncStorage** - Local data storage
- **XLSX** - Excel file handling

### Notifications & Background

- **Expo Notifications** - Push notifications
- **Background Fetch** - Background data updates
- **Task Manager** - Background task management

## 🌐 API Integration

Aplikasi ini terintegrasi dengan backend server untuk:

- Autentikasi pengguna
- Pengambilan data sensor real-time
- Penyimpanan data historis
- Manajemen lokasi monitoring

## 📊 Features Deep Dive

### 1. Real-time Monitoring

- WebSocket connection untuk data real-time
- Auto-refresh setiap 5 detik
- Indikator status koneksi
- Fallback mechanism jika koneksi terputus

### 2. Interactive Maps

- Marker lokasi sensor
- Cluster untuk multiple sensors
- Custom markers dengan status indicators
- Geolocation support

### 3. Data Analytics

- Grafik tren historis
- Statistical summaries (min, max, avg)
- Time range filtering
- Export functionality

### 4. Smart Notifications

- Threshold-based alerts
- Background monitoring
- Custom notification channels
- Persistent notifications

## 🔧 Configuration

### Environment Variables

Buat file `.env` di root directory:

```env
API_BASE_URL=https://your-api-server.com
SOCKET_URL=ws://your-websocket-server.com
MAPS_API_KEY=your_google_maps_api_key
```

### Build Configuration

Edit `app.json` untuk konfigurasi build:

- Bundle identifier
- App permissions
- Notification settings
- Background capabilities

## 📱 Device Permissions

Aplikasi memerlukan permission berikut:

- **Location**: Untuk geofencing dan maps
- **Notifications**: Untuk push notifications
- **Network**: Untuk komunikasi dengan server
- **Storage**: Untuk menyimpan data lokal

## 🚀 Deployment

### Development Build

```bash
eas build --profile development --platform android
```

### Production Build

```bash
eas build --profile production --platform android
```

### Submit to Store

```bash
eas submit --platform android
```

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

### Development Guidelines

- Gunakan TypeScript untuk type safety
- Follow React Native best practices
- Tulis unit tests untuk fitur baru
- Update dokumentasi jika diperlukan

## 📋 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler error**

   ```bash
   npm run clean
   ```

2. **Android build failure**

   ```bash
   cd android && ./gradlew clean
   ```

3. **iOS build failure**
   ```bash
   cd ios && rm -rf Pods && pod install
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Lead Developer**: [Your Name]
- **UI/UX Designer**: [Designer Name]
- **Backend Developer**: [Backend Dev Name]

## 🙏 Acknowledgments

- Expo team untuk development platform yang luar biasa
- React Native community
- Open source libraries yang digunakan dalam project ini

---

<div align="center">

**Made with ❤️ for Water Quality Monitoring**

[Report Bug](https://github.com/your-username/water-sensor-app/issues) • [Request Feature](https://github.com/your-username/water-sensor-app/issues) • [Documentation](https://github.com/your-username/water-sensor-app/wiki)

</div>
