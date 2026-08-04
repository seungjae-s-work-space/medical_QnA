import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  String read(String relativePath) => File(relativePath).readAsStringSync();

  test('content list services use server-side pagination limits', () {
    final serviceFiles = [
      'lib/services/news_service.dart',
      'lib/services/encyclopedia_service.dart',
      'lib/services/notice_service.dart',
      'lib/services/video_service.dart',
    ];

    for (final file in serviceFiles) {
      final source = read(file);
      expect(
        source,
        contains('.limit('),
        reason: '$file must limit Firestore reads instead of loading all docs',
      );
      expect(
        source,
        contains('startAfterDocument'),
        reason: '$file must support cursor pagination for loading more docs',
      );
      expect(
        source,
        contains('.count()'),
        reason: '$file should use Firestore count aggregation for total pages',
      );
    }
  });

  test('user-facing content screens fetch only one visible page at a time', () {
    final screenFiles = [
      'lib/screens/user/news_screen.dart',
      'lib/screens/user/encyclopedia_screen.dart',
      'lib/screens/user/notice_screen.dart',
      'lib/screens/user/video_screen.dart',
    ];

    for (final file in screenFiles) {
      final source = read(file);
      expect(
        source,
        contains('static const int _queryPageSize = _itemsPerPage'),
        reason: '$file should fetch only the visible page size from Firestore',
      );
      expect(
        source,
        isNot(contains('LoadMoreButton')),
        reason:
            '$file should use page navigation instead of a separate load more button',
      );
      expect(
        source,
        contains('hasMore: _hasMore'),
        reason: '$file should let page navigation fetch the next server page',
      );
      expect(
        source,
        contains('_totalItemCount'),
        reason: '$file should know the server-side total count up front',
      );
      expect(
        source,
        contains('_totalPages'),
        reason:
            '$file should render page numbers from total count, not loaded docs',
      );
    }

    final homeScreen = read('lib/screens/user/home_screen.dart');
    expect(homeScreen, contains('getPublishedNoticesPage(pageSize: 1)'));
  });

  test('content storage uploads require admin role', () {
    final rules = read('storage.rules');

    expect(rules, contains('function isAdmin()'));
    expect(rules, contains('request.auth.token.admin == true'));
    expect(rules, contains("request.auth.token.role == 'admin'"));
    expect(rules, isNot(contains('firestore.get(')));
    expect(rules, contains('allow write: if isAdmin()'));
    expect(
      rules,
      isNot(contains(
          'match /news_images/{imageId} {\n      allow read: if request.auth != null;\n      allow write: if request.auth != null')),
    );
    expect(
      rules,
      isNot(contains(
          'match /encyclopedia_images/{imageId} {\n      allow read: if request.auth != null;\n      allow write: if request.auth != null')),
    );
  });

  test('promotion rules allow public published reads and admin-only writes', () {
    final firestoreRules = read('firestore.rules');
    final storageRules = read('storage.rules');

    expect(firestoreRules, contains('match /promotions/{promotionId}'));
    expect(
      firestoreRules,
      contains('allow read: if resource.data.isPublished == true || isAdmin();'),
    );
    expect(firestoreRules, contains('allow create: if isAdmin();'));
    expect(firestoreRules, contains('allow update: if isAdmin();'));
    expect(firestoreRules, contains('allow delete: if isAdmin();'));

    for (final path in ['promotion_banners', 'promotion_images']) {
      expect(
        storageRules,
        contains('''
match /$path/{imageId} {
      allow read: if true;
      allow write: if isAdmin()
                   && isImageUnder(10 * 1024 * 1024);
    }'''),
      );
    }
  });

  test('chat realtime streams are bounded', () {
    final firestoreService = read('lib/services/firestore_service.dart');

    expect(firestoreService, contains('defaultMessagePageSize = 20'));
    expect(firestoreService, contains('.collection(\'messages\')'));
    expect(firestoreService, contains('.limit(pageSize)'));
    expect(firestoreService, contains('getOlderMessagesPage'));
    expect(firestoreService, contains('.startAfter('));
    expect(firestoreService, contains('defaultConversationPageSize = 50'));
    expect(firestoreService, contains('.limit(defaultConversationPageSize)'));
  });
}
