# Muse Glasses companion app (Flutter skeleton) — Mark 1

```
flutter create --platforms=android,ios .   # generates the platform folders around lib/
flutter pub get
flutter run
```

Screens: Scan/connect → Control (now playing, call state, volume, EQ, settings) → Find my glasses
(hotter/colder RSSI meter, last seen = phone location at the last disconnect, Play sound).

Permissions
- Android: BLUETOOTH_SCAN / BLUETOOTH_CONNECT (API 31+), ACCESS_FINE_LOCATION (scan on ≤ API 30 and for the
  last-seen location), see the flutter_blue_plus and geolocator READMEs.
- iOS Info.plist: NSBluetoothAlwaysUsageDescription, NSLocationWhenInUseUsageDescription
  (+ NSLocationAlwaysAndWhenInUseUsageDescription and UIBackgroundModes `bluetooth-central` / `location`
  if you want the disconnect location recorded while the app is in the background; iOS throttles background scans).

Audio and calls are classic Bluetooth (A2DP + HFP): pair "Muse Glasses" in system settings. The app only talks BLE to
the GATT service 9f3c0001-2b6e-4c1a-8f5d-6a7e0b1c2d3e (see the build guide → Docs → GATT table):
9f3c0008 = Find chime (write seconds, 0 = stop), 9f3c0009 = Call state (0 idle, 1 incoming, 2 outgoing, 3 active).
"Last seen" is stored only on the phone (shared_preferences). Not compiled here: Flutter isn't installed on the build box.
Check the flutter_blue_plus licence on pub.dev before distributing the app.
