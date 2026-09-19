import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/models/article_section.dart';
import 'package:medical_qa_app/services/encyclopedia_service.dart';
import 'package:medical_qa_app/widgets/home_news_banner.dart';
import 'package:medical_qa_app/screens/admin/admin_encyclopedia_screen.dart';

void main() {
  late FakeFirebaseFirestore firestore;
  late EncyclopediaService maleService;

  setUp(() async {
    firestore = FakeFirebaseFirestore();
    maleService = EncyclopediaService(
      section: ArticleSection.maleInfertility,
      firestore: firestore,
    );
    for (var index = 0; index < 12; index++) {
      await firestore.collection('male_infertility').doc('$index').set({
        'title': '남성난임 $index',
        'content': '<p>본문</p>',
        'isPublished': true,
        'createdAt': Timestamp.fromMillisecondsSinceEpoch(index * 1000),
        'viewCount': 0,
        'references': '참고자료',
        'sourceUrl': 'https://example.com/source',
      });
    }
    await firestore.collection('male_infertility').doc('draft').set({
      'title': '비공개',
      'isPublished': false,
      'createdAt': Timestamp.fromMillisecondsSinceEpoch(99000),
      'viewCount': 0,
    });
    await firestore.collection('encyclopedia').doc('11').set({
      'title': '기존 백과',
      'isPublished': true,
      'createdAt': Timestamp.fromMillisecondsSinceEpoch(0),
      'viewCount': 7,
    });
  });

  test(
      'male infertility pages contain five published articles without encyclopedia data',
      () async {
    expect(await maleService.getPublishedArticlesCount(), 12);
    final first = await maleService.getPublishedArticlesPage(pageSize: 5);
    expect(first.items.map((item) => item.id), ['11', '10', '9', '8', '7']);
    expect(first.hasMore, isTrue);
    final second = await maleService.getPublishedArticlesPage(
        pageSize: 5, startAfter: first.lastDocument);
    expect(second.items.map((item) => item.id), ['6', '5', '4', '3', '2']);
    final last = await maleService.getPublishedArticlesPage(
        pageSize: 5, startAfter: second.lastDocument);
    expect(last.items.map((item) => item.id), ['1', '0']);
    expect(last.hasMore, isFalse);
  });

  test(
      'male infertility editing, view counts, and deletion leave encyclopedia untouched',
      () async {
    final article = (await maleService.getArticle('11'))!;
    await maleService.incrementViewCount(article.id);
    expect((await maleService.getArticle('11'))!.viewCount, 1);
    await maleService.updateArticle(
        article.copyWith(title: '수정', references: '출처 수정', isPublished: false));
    expect((await maleService.getArticle('11'))!.references, '출처 수정');
    expect(await maleService.getPublishedArticlesCount(), 11);
    final adminPage =
        await maleService.getArticlesPage(publishedOnly: false, pageSize: 5);
    expect(adminPage.items.first.id, 'draft');
    await maleService.deleteArticle('11');
    expect(await maleService.getArticle('11'), isNull);
    final encyclopedia = EncyclopediaService(firestore: firestore);
    final existing = (await encyclopedia.getArticle('11'))!;
    expect(existing.title, '기존 백과');
    expect(existing.viewCount, 7);
  });

  test('new male infertility articles are created in their own collection',
      () async {
    final source = (await maleService.getArticle('11'))!;
    final id = await maleService.createArticle(source.copyWith(title: '새 글'));
    expect((await maleService.getArticle(id))!.title, '새 글');
    expect((await firestore.collection('encyclopedia').doc(id).get()).exists,
        isFalse);
  });

  testWidgets(
      'admin can return from an empty page when there are exactly twenty articles',
      (tester) async {
    for (var index = 12; index < 19; index++) {
      await firestore.collection('male_infertility').doc('$index').set({
        'title': '남성난임 $index',
        'isPublished': true,
        'createdAt': Timestamp.fromMillisecondsSinceEpoch(index * 1000),
      });
    }
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: AdminEncyclopediaScreen(
      section: ArticleSection.maleInfertility,
      service: maleService,
    ))));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('다음 페이지'));
    await tester.pumpAndSettle();
    expect(find.text('이전 페이지'), findsOneWidget);
    await tester.tap(find.text('이전 페이지'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('다음 페이지'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final width in [320.0, 390.0, 768.0]) {
    testWidgets('wide news button fits and opens news at width $width',
        (tester) async {
      await tester.binding.setSurfaceSize(Size(width, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      var opened = false;
      await tester.pumpWidget(MaterialApp(
          home: Scaffold(
              body: MediaQuery(
        data: MediaQueryData(
            size: Size(width, 800), textScaler: const TextScaler.linear(1.5)),
        child: Padding(
            padding: const EdgeInsets.all(20),
            child: HomeNewsBanner(onTap: () => opened = true)),
      ))));
      expect(tester.getSize(find.byType(HomeNewsBanner)).width, width - 40);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('난임뉴스'));
      expect(opened, isTrue);
    });
  }
}
