import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  String read(String relativePath) => File(relativePath).readAsStringSync();

  test('news and encyclopedia models persist view counts', () {
    final newsModel = read('lib/models/news_model.dart');
    final encyclopediaModel = read('lib/models/encyclopedia_model.dart');

    for (final source in [newsModel, encyclopediaModel]) {
      expect(source, contains('final int viewCount'));
      expect(source, contains('this.viewCount = 0'));
      expect(source, contains('viewCount: data[\'viewCount\'] ?? 0'));
      expect(source, contains('\'viewCount\': viewCount'));
      expect(source, contains('int? viewCount'));
      expect(source, contains('viewCount: viewCount ?? this.viewCount'));
    }
  });

  test('news and encyclopedia services increment view counts atomically', () {
    final newsService = read('lib/services/news_service.dart');
    final encyclopediaService = read('lib/services/encyclopedia_service.dart');

    for (final source in [newsService, encyclopediaService]) {
      expect(source, contains('Future<void> incrementViewCount'));
      expect(source, contains('FieldValue.increment(1)'));
    }
  });

  test('member content opens increment view counts but guest opens do not', () {
    final newsScreen = read('lib/screens/user/news_screen.dart');
    final encyclopediaScreen = read('lib/screens/user/encyclopedia_screen.dart');

    for (final source in [newsScreen, encyclopediaScreen]) {
      expect(source, contains('Provider.of<AuthProvider>(context, listen: false)'));
      expect(source, contains('if (!authProvider.isGuest)'));
      expect(source, contains('incrementViewCount('));
    }
  });
}
