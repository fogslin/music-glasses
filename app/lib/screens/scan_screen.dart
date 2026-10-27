import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:provider/provider.dart';

import '../state/glasses_state.dart';
import 'find_screen.dart';

class ScanScreen extends StatelessWidget {
  const ScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.read<GlassesState>();
    return Scaffold(
      appBar: AppBar(title: const Text('Connect your Muse Glasses'), actions: [
        IconButton(icon: const Icon(Icons.travel_explore), tooltip: 'Find my glasses (last seen + hotter/colder)',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FindScreen()))),
      ]),
      body: Column(children: [
        const Padding(
          padding: EdgeInsets.all(16),
          child: Text('1. Pair "Muse Glasses" in the phone\'s Bluetooth settings for audio.\n'
              '2. Allow calls / contacts when the phone asks, so calls ring on the glasses.\n'
              '3. Then connect here for controls, call state, EQ, battery and Find my glasses.'),
        ),
        Expanded(
          child: StreamBuilder<List<ScanResult>>(
            stream: s.scan(),
            builder: (_, snap) {
              final r = snap.data ?? const [];
              if (r.isEmpty) return const Center(child: CircularProgressIndicator());
              return ListView(children: [
                for (final x in r)
                  ListTile(
                    leading: const Icon(Icons.headphones),
                    title: Text(x.device.platformName.isEmpty ? 'Muse Glasses' : x.device.platformName),
                    subtitle: Text('RSSI ${x.rssi} dBm'),
                    onTap: () => s.connect(x.device),
                  ),
              ]);
            },
          ),
        ),
      ]),
    );
  }
}
