import 'package:flutter/foundation.dart';

class StartupDebugEntry {
  final DateTime timestamp;
  final Duration elapsed;
  final String message;
  final Map<String, String> details;

  const StartupDebugEntry({
    required this.timestamp,
    required this.elapsed,
    required this.message,
    required this.details,
  });

  String get line {
    final elapsedMs = elapsed.inMilliseconds.toString().padLeft(5, ' ');
    if (details.isEmpty) return '+${elapsedMs}ms $message';

    final detailText =
        details.entries.map((entry) => '${entry.key}=${entry.value}').join(' ');
    return '+${elapsedMs}ms $message $detailText';
  }
}

class StartupDebugLog extends ChangeNotifier {
  StartupDebugLog({this.maxEntries = 160}) {
    _stopwatch.start();
  }

  static final StartupDebugLog instance = StartupDebugLog();

  final int maxEntries;
  final Stopwatch _stopwatch = Stopwatch();
  final List<StartupDebugEntry> _entries = [];

  List<StartupDebugEntry> get entries => List.unmodifiable(_entries);

  void add(String message, [Map<String, Object?> details = const {}]) {
    final entry = StartupDebugEntry(
      timestamp: DateTime.now(),
      elapsed: _stopwatch.elapsed,
      message: message,
      details: _normalizeDetails(details),
    );

    _entries.add(entry);
    if (_entries.length > maxEntries) {
      _entries.removeRange(0, _entries.length - maxEntries);
    }

    debugPrint('[startup] ${entry.line}');
    notifyListeners();
  }

  void clear() {
    _entries.clear();
    notifyListeners();
  }

  String dump() => entries.map((entry) => entry.line).join('\n');

  Map<String, String> _normalizeDetails(Map<String, Object?> details) {
    return details.map((key, value) => MapEntry(key, _formatValue(key, value)));
  }

  String _formatValue(String key, Object? value) {
    if (value == null) return 'null';
    final text = value.toString();
    if (text.isEmpty) return 'empty';

    final lowerKey = key.toLowerCase();
    if (lowerKey.contains('uid') ||
        lowerKey.contains('userid') ||
        lowerKey.contains('email') ||
        lowerKey.contains('token')) {
      return maskIdentifier(text);
    }

    return text;
  }

  static String maskIdentifier(String? value) {
    if (value == null) return 'null';
    if (value.isEmpty) return 'empty';
    if (value.length <= 10) return 'set';
    return '${value.substring(0, 6)}...${value.substring(value.length - 4)}';
  }
}
