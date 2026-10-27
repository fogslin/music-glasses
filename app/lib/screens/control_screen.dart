import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/glasses_state.dart';
import 'find_screen.dart';

class ControlScreen extends StatelessWidget {
  const ControlScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.watch<GlassesState>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Muse Glasses'),
        actions: [
          Padding(padding: const EdgeInsets.only(right: 12), child: Center(child: Text('🔋 ${s.battery}%'))),
          IconButton(icon: const Icon(Icons.travel_explore), tooltip: 'Find my glasses',
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FindScreen()))),
          IconButton(icon: const Icon(Icons.link_off), onPressed: s.disconnect),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text(linkNames[s.audioLink.clamp(0, 2)], style: Theme.of(context).textTheme.labelLarge),
        if (s.callState != 0)
          Card(
            color: Theme.of(context).colorScheme.primaryContainer,
            child: ListTile(leading: const Icon(Icons.call), title: Text(callNames[s.callState.clamp(0, 3)])),
          ),
        const SizedBox(height: 12),
        Text(s.title.isEmpty ? '—' : s.title, style: Theme.of(context).textTheme.headlineSmall),
        Text(s.artist),
        const SizedBox(height: 8),
        Center(
          child: IconButton.filled(
            iconSize: 48,
            icon: Icon(s.playing ? Icons.pause : Icons.play_arrow),
            onPressed: s.togglePlay,
          ),
        ),
        const SizedBox(height: 16),
        Text('Volume ${s.volume}/127'),
        Slider(value: s.volume.toDouble(), max: 127, divisions: 127, onChanged: (v) => s.setVolume(v.round())),
        const SizedBox(height: 8),
        const Text('EQ'),
        Wrap(spacing: 8, children: [
          for (var i = 0; i < eqNames.length; i++)
            ChoiceChip(label: Text(eqNames[i]), selected: s.eq == i, onSelected: (_) => s.setEq(i)),
        ]),
        const Divider(height: 32),
        SwitchListTile(title: const Text('Invert swipe direction'), value: s.invertSwipe, onChanged: s.setInvertSwipe),
        ListTile(
          title: const Text('Recalibrate touch pads'),
          subtitle: const Text('Take the glasses off, keep fingers away, then tap'),
          trailing: const Icon(Icons.touch_app),
          onTap: s.recalibrate,
        ),
      ]),
    );
  }
}
