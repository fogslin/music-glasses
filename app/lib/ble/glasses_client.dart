// BLE client for the Music Glasses GATT service (Bluedroid server on the QT Py ESP32 Pico).
// Audio itself goes over classic Bluetooth A2DP (pair "Muse Glasses" in the phone's BT settings);
// this link only carries control + status.
import 'dart:async';
import 'dart:convert';

import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class GattIds {
  static final service = Guid('9f3c0001-2b6e-4c1a-8f5d-6a7e0b1c2d3e');
  static final volume = Guid('9f3c0002-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); // uint8 0..127   R/W/N
  static final play = Guid('9f3c0003-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); //   uint8 0/1      R/W/N
  static final track = Guid('9f3c0004-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); //  "title\u001Fartist" R/N
  static final eq = Guid('9f3c0005-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); //     uint8 0..3     R/W/N
  static final link = Guid('9f3c0006-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); //   uint8 0/1/2    R/N
  static final config = Guid('9f3c0007-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); // uint8 bits     W
  static final findChime = Guid('9f3c0008-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); // uint8 seconds (0 = stop)  W
  static final callState = Guid('9f3c0009-2b6e-4c1a-8f5d-6a7e0b1c2d3e'); // uint8 0 idle 1 in 2 out 3 active  R/N
  static final batteryService = Guid('180f');
  static final batteryLevel = Guid('2a19');
}

class GlassesClient {
  static const deviceName = 'Muse Glasses';
  BluetoothDevice? _dev;
  final Map<Guid, BluetoothCharacteristic> _ch = {};
  final _subs = <StreamSubscription>[];

  final volume = StreamController<int>.broadcast();
  final playing = StreamController<bool>.broadcast();
  final track = StreamController<(String, String)>.broadcast();
  final eq = StreamController<int>.broadcast();
  final link = StreamController<int>.broadcast();
  final battery = StreamController<int>.broadcast();
  final connection = StreamController<bool>.broadcast();
  final call = StreamController<int>.broadcast();
  final rssi = StreamController<int>.broadcast();       // dBm, from readRssi() or advertising
  Timer? _rssiTimer;

  Stream<List<ScanResult>> scan({Duration timeout = const Duration(seconds: 8)}) {
    FlutterBluePlus.startScan(withServices: [GattIds.service], timeout: timeout);
    return FlutterBluePlus.scanResults;
  }

  Future<void> connect(BluetoothDevice d) async {
    await FlutterBluePlus.stopScan();
    _dev = d;
    await d.connect(autoConnect: false);
    _subs.add(d.connectionState.listen((s) => connection.add(s == BluetoothConnectionState.connected)));
    _rssiTimer?.cancel();
    _rssiTimer = Timer.periodic(const Duration(milliseconds: 500), (_) async {
      try { rssi.add(await d.readRssi()); } catch (_) {}
    });
    try {
      await d.requestMtu(185); // Android only; iOS negotiates on its own
    } catch (_) {}
    for (final svc in await d.discoverServices()) {
      for (final c in svc.characteristics) {
        _ch[c.uuid] = c;
      }
    }
    await _listenU8(GattIds.volume, volume);
    await _listenU8(GattIds.eq, eq);
    await _listenU8(GattIds.link, link);
    await _listenU8(GattIds.batteryLevel, battery);
    await _listenU8(GattIds.callState, call);
    await _listen(GattIds.play, (v) => playing.add(v.isNotEmpty && v[0] == 1));
    await _listen(GattIds.track, (v) {
      final parts = utf8.decode(v, allowMalformed: true).split('\u001F');
      track.add((parts.first, parts.length > 1 ? parts[1] : ''));
    });
  }

  Future<void> _listenU8(Guid id, StreamController<int> out) =>
      _listen(id, (v) { if (v.isNotEmpty) out.add(v[0]); });

  Future<void> _listen(Guid id, void Function(List<int>) onValue) async {
    final c = _ch[id];
    if (c == null) return;
    _subs.add(c.onValueReceived.listen(onValue));
    if (c.properties.notify) await c.setNotifyValue(true);
    if (c.properties.read) onValue(await c.read());
  }

  Future<void> _write(Guid id, int v) async => _ch[id]?.write([v & 0xFF], withoutResponse: false);

  Future<void> setVolume(int v) => _write(GattIds.volume, v.clamp(0, 127));
  Future<void> setPlaying(bool p) => _write(GattIds.play, p ? 1 : 0);
  Future<void> setEq(int preset) => _write(GattIds.eq, preset.clamp(0, 3));
  /// Find my glasses: chime for [seconds] at a fixed level, even if the media volume is 0. 0 stops it.
  Future<void> playFindSound([int seconds = 10]) => _write(GattIds.findChime, seconds.clamp(0, 60));

  /// While NOT connected: scan for the service and report the advertising RSSI ("hotter / colder").
  StreamSubscription<List<ScanResult>> watchAdvertisedRssi() {
    FlutterBluePlus.startScan(withServices: [GattIds.service], continuousUpdates: true, removeIfGone: const Duration(seconds: 6));
    return FlutterBluePlus.scanResults.listen((rs) {
      for (final r in rs) {
        rssi.add(r.rssi);
      }
    });
  }

  Future<void> setConfig({bool invertSwipe = false, bool recalibrate = false}) =>
      _write(GattIds.config, (invertSwipe ? 1 : 0) | (recalibrate ? 2 : 0));

  Future<void> disconnect() async {
    _rssiTimer?.cancel();
    for (final s in _subs) {
      await s.cancel();
    }
    _subs.clear();
    _ch.clear();
    await _dev?.disconnect();
  }
}
