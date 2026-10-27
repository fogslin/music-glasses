import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'ble/glasses_client.dart';
import 'state/glasses_state.dart';
import 'screens/scan_screen.dart';
import 'screens/control_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => GlassesState(GlassesClient()),
      child: const MuseApp(),
    ),
  );
}

class MuseApp extends StatelessWidget {
  const MuseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Muse Glasses',
      theme: ThemeData(colorSchemeSeed: const Color(0xFFC9967A), useMaterial3: true),
      home: Consumer<GlassesState>(
        builder: (_, s, __) => s.connected ? const ControlScreen() : const ScanScreen(),
      ),
    );
  }
}
