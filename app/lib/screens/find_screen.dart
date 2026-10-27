import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:provider/provider.dart';

import '../state/glasses_state.dart';

/// Find my glasses: hotter/colder RSSI meter, "last seen" (phone location at the last disconnect) and Play sound.
class FindScreen extends StatefulWidget {
  const FindScreen({super.key});
  @override
  State<FindScreen> createState() => _FindScreenState();
}

class _FindScreenState extends State<FindScreen> {
  StreamSubscription<List<ScanResult>>? _scan;

  @override
  void initState() {
    super.initState();
    final s = context.read<GlassesState>();
    if (!s.connected) _scan = s.watchWhileDisconnected(); // advertising RSSI while not connected
  }

  @override
  void dispose() {
    if (_scan != null) { _scan!.cancel(); FlutterBluePlus.stopScan(); }
    super.dispose();
  }

  String _ago(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'just now';
    if (d.inHours < 1) return '${d.inMinutes} min ago';
    if (d.inDays < 1) return '${d.inHours} h ago';
    return '${d.inDays} d ago';
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<GlassesState>();
    final w = s.inRange ? s.warmth : 0.0;
    final label = !s.inRange ? 'Not in range' : w > 0.75 ? 'Hot' : w > 0.5 ? 'Warmer' : w > 0.25 ? 'Cool' : 'Cold';
    final last = s.lastSeen;
    return Scaffold(
      appBar: AppBar(title: const Text('Find my glasses')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text(s.inRange ? '● in range · ${s.rssi?.round()} dBm' : '○ not heard for a while',
            style: TextStyle(color: s.inRange ? Colors.teal : Colors.grey)),
        const SizedBox(height: 24),
        Center(
          child: SizedBox(
            width: 220, height: 220,
            child: Stack(alignment: Alignment.center, children: [
              SizedBox.expand(child: CircularProgressIndicator(value: w, strokeWidth: 18,
                  color: Color.lerp(Colors.lightBlue, Colors.deepOrange, w), backgroundColor: Colors.black12)),
              Column(mainAxisSize: MainAxisSize.min, children: [
                Text(label, style: Theme.of(context).textTheme.headlineMedium),
                Text(s.distanceHint),
              ]),
            ]),
          ),
        ),
        const SizedBox(height: 24),
        Card(
          child: ListTile(
            leading: const Icon(Icons.place_outlined),
            title: Text(s.connected ? 'Connected now' : 'Last seen'),
            subtitle: Text(last == null
                ? 'No disconnect recorded yet'
                : 'Disconnected ${_ago(last.when)}'
                    '${last.lat != null ? '\nPhone was at ${last.lat!.toStringAsFixed(5)}, ${last.lon!.toStringAsFixed(5)}' : '\n(no location permission / fix)'}'),
            isThreeLine: last != null,
            // Open last.lat/lon in a maps app with url_launcher if you like (geo: or https://maps.google.com/?q=lat,lon).
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          icon: const Icon(Icons.notifications_active),
          label: const Text('Play sound'),
          onPressed: s.connected ? s.playFindSound : null, // needs the BLE link: connect from the scan screen first
        ),
        TextButton(onPressed: s.connected ? s.stopFindSound : null, child: const Text('Stop')),
        const SizedBox(height: 8),
        const Text('The chime plays at a fixed level even if the volume is at zero. The glasses must be switched on and within Bluetooth range.',
            style: TextStyle(fontSize: 12, color: Colors.grey)),
      ]),
    );
  }
}
