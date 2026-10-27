import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../ble/glasses_client.dart';

const eqNames = ['Flat', 'Bass+', 'Vocal', 'Treble'];
const linkNames = ['Not connected', 'Connected', 'Streaming'];
const callNames = ['No call', 'Incoming call: tap to answer, hold to reject', 'Calling…', 'In a call: tap to hang up'];

class LastSeen {
  LastSeen(this.when, this.lat, this.lon);
  final DateTime when;
  final double? lat, lon;
}

class GlassesState extends ChangeNotifier {
  GlassesState(this.client) {
    _subs.addAll([
      client.connection.stream.listen((c) {
        if (connected && !c) _rememberDisconnect(); // link just dropped: save time + phone location
        connected = c;
        if (c) lastRssiAt = DateTime.now();
        notifyListeners();
      }),
      client.call.stream.listen((v) { callState = v; notifyListeners(); }),
      client.rssi.stream.listen((r) {
        rssi = rssi == null ? r.toDouble() : rssi! * 0.7 + r * 0.3; // smooth the ±5–10 dB jitter
        lastRssiAt = DateTime.now();
        notifyListeners();
      }),
      client.volume.stream.listen((v) { volume = v; notifyListeners(); }),
      client.playing.stream.listen((p) { playing = p; notifyListeners(); }),
      client.track.stream.listen((t) { title = t.$1; artist = t.$2; notifyListeners(); }),
      client.eq.stream.listen((e) { eq = e; notifyListeners(); }),
      client.link.stream.listen((l) { audioLink = l; notifyListeners(); }),
      client.battery.stream.listen((b) { battery = b; notifyListeners(); }),
    ]);
    _loadLastSeen();
  }

  final GlassesClient client;
  final _subs = <StreamSubscription>[];

  bool connected = false;
  int volume = 64, eq = 0, audioLink = 0, battery = 0;
  bool playing = false, invertSwipe = false;
  String title = '', artist = '';
  int callState = 0;
  double? rssi;          // smoothed dBm
  DateTime? lastRssiAt;  // last time we heard the glasses at all
  LastSeen? lastSeen;    // phone location at the last disconnect

  bool get inRange => lastRssiAt != null && DateTime.now().difference(lastRssiAt!) < const Duration(seconds: 8);

  /// 0 = cold … 1 = hot. −95 dBm ≈ edge of range, −45 dBm ≈ right next to the phone.
  double get warmth => rssi == null ? 0 : ((rssi! + 95) / 50).clamp(0.0, 1.0);

  /// Very rough distance from a log-distance model (txPower −59 dBm @ 1 m, n = 2.5). Indoors it is only a hint.
  String get distanceHint {
    if (rssi == null || !inRange) return 'out of range';
    final d = math.pow(10, (-59 - rssi!) / 25).toDouble();
    if (d < 1) return 'within ~1 m';
    if (d < 3) return '≈ 1–3 m';
    if (d < 8) return '≈ 3–8 m';
    return '> 8 m';
  }

  Future<void> playFindSound() => client.playFindSound(10);
  Future<void> stopFindSound() => client.playFindSound(0);
  StreamSubscription<List<ScanResult>> watchWhileDisconnected() => client.watchAdvertisedRssi();

  Future<void> _rememberDisconnect() async {
    double? lat, lon;
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.whileInUse || perm == LocationPermission.always) {
        final p = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 10)));
        lat = p.latitude; lon = p.longitude;
      }
    } catch (_) {/* no fix: keep the time only */}
    lastSeen = LastSeen(DateTime.now(), lat, lon);
    final sp = await SharedPreferences.getInstance(); // stored on this phone only
    await sp.setString('lastSeen.when', lastSeen!.when.toIso8601String());
    if (lat != null && lon != null) { await sp.setDouble('lastSeen.lat', lat); await sp.setDouble('lastSeen.lon', lon); }
    else { await sp.remove('lastSeen.lat'); await sp.remove('lastSeen.lon'); }
    notifyListeners();
  }

  Future<void> _loadLastSeen() async {
    final sp = await SharedPreferences.getInstance();
    final w = sp.getString('lastSeen.when');
    if (w != null) { lastSeen = LastSeen(DateTime.parse(w), sp.getDouble('lastSeen.lat'), sp.getDouble('lastSeen.lon')); notifyListeners(); }
  }

  Stream<List<ScanResult>> scan() => client.scan();
  Future<void> connect(BluetoothDevice d) => client.connect(d);
  Future<void> disconnect() => client.disconnect();

  Future<void> setVolume(int v) { volume = v; notifyListeners(); return client.setVolume(v); }
  Future<void> togglePlay() => client.setPlaying(!playing);
  Future<void> setEq(int e) { eq = e; notifyListeners(); return client.setEq(e); }
  Future<void> setInvertSwipe(bool v) { invertSwipe = v; notifyListeners(); return client.setConfig(invertSwipe: v); }
  Future<void> recalibrate() => client.setConfig(invertSwipe: invertSwipe, recalibrate: true);

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}
