# Promotion Banners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Firestore-managed promotion banner carousel for the Flutter app home and web home, with admin web CRUD and public detail pages.

**Architecture:** Use one shared `promotions` Firestore collection. Flutter and public web read only published promotions with a fixed homepage limit of 10 using one-time reads. Admin web owns creation, rich editing, image upload, ordering, publishing, and deletion.

**Tech Stack:** Flutter, Dart, Firebase Firestore, Firebase Storage, `flutter_html`, `url_launcher`, React, MUI, ReactQuill, Firebase JS SDK, source-guard tests.

---

## File Structure

Flutter app:

- Create `medical_qa_app/lib/models/promotion_model.dart`: promotion document parser and display helpers.
- Create `medical_qa_app/lib/services/promotion_service.dart`: bounded Firestore reads for homepage and detail.
- Create `medical_qa_app/lib/widgets/promotion_carousel.dart`: home carousel UI with `PageView`, timer, dots, and tap callback.
- Create `medical_qa_app/lib/screens/user/promotion_detail_screen.dart`: public promotion detail screen with HTML body and external link button.
- Modify `medical_qa_app/lib/screens/user/home_screen.dart`: load promotions once, place carousel below `_ChatBanner`, navigate to detail.
- Create `medical_qa_app/test/promotion_model_test.dart`: model default/link behavior.
- Create `medical_qa_app/test/promotion_service_source_test.dart`: query limit and order guard.
- Create `medical_qa_app/test/home_promotion_banner_test.dart`: home placement and carousel behavior guard.
- Modify `medical_qa_app/test/firebase_cost_guardrails_test.dart`: include promotion service and public image rule checks.

Admin/public web:

- Create `admin-web/src/services/promotionService.js`: Firestore/Storage helpers shared by public web and admin manager.
- Create `admin-web/src/components/PromotionCarousel.jsx`: public web home carousel.
- Create `admin-web/src/components/PromotionDetail.jsx`: public detail route.
- Create `admin-web/src/components/PromotionManager.jsx`: admin list/create/edit/delete/publish manager.
- Modify `admin-web/src/components/HomeDashboard.jsx`: render `PromotionCarousel` under the hero area.
- Modify `admin-web/src/components/Layout.jsx`: add admin-only `광고 관리` sidebar item.
- Modify `admin-web/src/App.jsx`: add `/promotions/:promotionId` public route and `/promotions` admin route.
- Create `admin-web/src/__tests__/promotionBanners.test.js`: route, manager, carousel, and public rule source guards.
- Modify `admin-web/src/__tests__/costGuardrails.test.js`: include `PromotionManager.jsx` in limited query checks.

Firebase:

- Modify `medical_qa_app/firestore.rules`: add public published reads and admin writes for `promotions`.
- Modify `medical_qa_app/storage.rules`: add public reads and admin image writes for `promotion_banners` and `promotion_images`.

## Task 1: Flutter Model And Service

**Files:**

- Create: `medical_qa_app/test/promotion_model_test.dart`
- Create: `medical_qa_app/test/promotion_service_source_test.dart`
- Create: `medical_qa_app/lib/models/promotion_model.dart`
- Create: `medical_qa_app/lib/services/promotion_service.dart`

- [ ] **Step 1: Write failing model tests**

Create `medical_qa_app/test/promotion_model_test.dart`:

```dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/models/promotion_model.dart';

void main() {
  test('promotion model parses fields and exposes a default external link label', () {
    final createdAt = DateTime(2026, 7, 31, 9);
    final updatedAt = DateTime(2026, 7, 31, 10);

    final promotion = PromotionModel.fromMap('promo_1', {
      'title': '난임의사에게 속지 않는 법',
      'summary': '나와 맞는 난임의사 찾기',
      'bannerImageUrl': 'https://example.com/banner.png',
      'contentHtml': '<p>도서 소개</p>',
      'externalLinkUrl': 'https://book.example.com',
      'externalLinkLabel': '',
      'sortOrder': 3,
      'isPublished': true,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    });

    expect(promotion.id, 'promo_1');
    expect(promotion.title, '난임의사에게 속지 않는 법');
    expect(promotion.summary, '나와 맞는 난임의사 찾기');
    expect(promotion.bannerImageUrl, 'https://example.com/banner.png');
    expect(promotion.contentHtml, '<p>도서 소개</p>');
    expect(promotion.externalLinkUrl, 'https://book.example.com');
    expect(promotion.externalLinkLabel, '자세히 보기');
    expect(promotion.sortOrder, 3);
    expect(promotion.isPublished, isTrue);
    expect(promotion.createdAt, createdAt);
    expect(promotion.updatedAt, updatedAt);
    expect(promotion.hasExternalLink, isTrue);
  });

  test('promotion model defaults missing display fields safely', () {
    final promotion = PromotionModel.fromMap('promo_2', {});

    expect(promotion.title, '');
    expect(promotion.summary, '');
    expect(promotion.bannerImageUrl, '');
    expect(promotion.contentHtml, '');
    expect(promotion.externalLinkUrl, isNull);
    expect(promotion.externalLinkLabel, '자세히 보기');
    expect(promotion.sortOrder, 0);
    expect(promotion.isPublished, isFalse);
    expect(promotion.hasExternalLink, isFalse);
  });
}
```

- [ ] **Step 2: Write failing service source guard**

Create `medical_qa_app/test/promotion_service_source_test.dart`:

```dart
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('promotion service uses a bounded published query ordered for carousel display', () {
    final source = File('lib/services/promotion_service.dart').readAsStringSync();

    expect(source, contains("static const int defaultLimit = 10"));
    expect(source, contains("final String _collection = 'promotions'"));
    expect(source, contains(".where('isPublished', isEqualTo: true)"));
    expect(source, contains(".orderBy('sortOrder')"));
    expect(source, contains(".orderBy('createdAt', descending: true)"));
    expect(source, contains(".limit(limit)"));
    expect(source, contains("Future<List<PromotionModel>> getPublishedPromotions"));
    expect(source, contains("Future<PromotionModel?> getPromotion"));
  });
}
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
cd medical_qa_app
flutter test test/promotion_model_test.dart test/promotion_service_source_test.dart
```

Expected: fail because `PromotionModel` and `promotion_service.dart` do not exist.

- [ ] **Step 4: Implement `PromotionModel`**

Create `medical_qa_app/lib/models/promotion_model.dart`:

```dart
import 'package:cloud_firestore/cloud_firestore.dart';

class PromotionModel {
  final String id;
  final String title;
  final String summary;
  final String bannerImageUrl;
  final String contentHtml;
  final String? externalLinkUrl;
  final String externalLinkLabel;
  final int sortOrder;
  final bool isPublished;
  final DateTime createdAt;
  final DateTime updatedAt;

  PromotionModel({
    required this.id,
    required this.title,
    required this.summary,
    required this.bannerImageUrl,
    required this.contentHtml,
    this.externalLinkUrl,
    required this.externalLinkLabel,
    required this.sortOrder,
    required this.isPublished,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get hasExternalLink => externalLinkUrl != null && externalLinkUrl!.trim().isNotEmpty;

  factory PromotionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return PromotionModel.fromMap(doc.id, data);
  }

  factory PromotionModel.fromMap(String id, Map<String, dynamic> data) {
    final rawExternalLink = (data['externalLinkUrl'] as String?)?.trim();
    final rawLabel = (data['externalLinkLabel'] as String?)?.trim();
    final sortOrderValue = data['sortOrder'];

    return PromotionModel(
      id: id,
      title: data['title'] ?? '',
      summary: data['summary'] ?? '',
      bannerImageUrl: data['bannerImageUrl'] ?? '',
      contentHtml: data['contentHtml'] ?? '',
      externalLinkUrl: rawExternalLink == null || rawExternalLink.isEmpty ? null : rawExternalLink,
      externalLinkLabel: rawLabel == null || rawLabel.isEmpty ? '자세히 보기' : rawLabel,
      sortOrder: sortOrderValue is num ? sortOrderValue.toInt() : 0,
      isPublished: data['isPublished'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.fromMillisecondsSinceEpoch(0),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}
```

- [ ] **Step 5: Implement `PromotionService`**

Create `medical_qa_app/lib/services/promotion_service.dart`:

```dart
import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/promotion_model.dart';

class PromotionService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'promotions';
  static const int defaultLimit = 10;

  Future<List<PromotionModel>> getPublishedPromotions({
    int limit = defaultLimit,
  }) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('isPublished', isEqualTo: true)
        .orderBy('sortOrder')
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => PromotionModel.fromFirestore(doc)).toList();
  }

  Future<PromotionModel?> getPromotion(String promotionId) async {
    final doc = await _firestore.collection(_collection).doc(promotionId).get();
    if (!doc.exists) return null;
    return PromotionModel.fromFirestore(doc);
  }
}
```

- [ ] **Step 6: Run tests and verify GREEN**

Run:

```bash
cd medical_qa_app
flutter test test/promotion_model_test.dart test/promotion_service_source_test.dart
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add medical_qa_app/test/promotion_model_test.dart medical_qa_app/test/promotion_service_source_test.dart medical_qa_app/lib/models/promotion_model.dart medical_qa_app/lib/services/promotion_service.dart
git commit -m "feat: add promotion model and service"
```

## Task 2: Flutter Home Carousel And Detail

**Files:**

- Create: `medical_qa_app/test/home_promotion_banner_test.dart`
- Create: `medical_qa_app/lib/widgets/promotion_carousel.dart`
- Create: `medical_qa_app/lib/screens/user/promotion_detail_screen.dart`
- Modify: `medical_qa_app/lib/screens/user/home_screen.dart`

- [ ] **Step 1: Write failing home/carousel source guard**

Create `medical_qa_app/test/home_promotion_banner_test.dart`:

```dart
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  String read(String path) => File(path).readAsStringSync();

  test('home loads promotions and places the carousel below the chat banner', () {
    final source = read('lib/screens/user/home_screen.dart');
    final chatBannerIndex = source.indexOf('_ChatBanner(');
    final carouselIndex = source.indexOf('PromotionCarousel(');

    expect(source, contains("import '../../services/promotion_service.dart';"));
    expect(source, contains("import '../../models/promotion_model.dart';"));
    expect(source, contains("import '../../widgets/promotion_carousel.dart';"));
    expect(source, contains("import 'promotion_detail_screen.dart';"));
    expect(source, contains('final PromotionService _promotionService = PromotionService();'));
    expect(source, contains('List<PromotionModel> _promotions = [];'));
    expect(source, contains('Future<void> _loadPromotions() async'));
    expect(source, contains('_loadPromotions();'));
    expect(chatBannerIndex, greaterThanOrEqualTo(0));
    expect(carouselIndex, greaterThan(chatBannerIndex));
  });

  test('promotion carousel has bounded visual behavior', () {
    final source = read('lib/widgets/promotion_carousel.dart');

    expect(source, contains('PageView.builder'));
    expect(source, contains('Timer.periodic'));
    expect(source, contains('const Duration(seconds: 5)'));
    expect(source, contains('promotions.length > 1'));
    expect(source, contains('CachedNetworkImage'));
    expect(source, contains('onPromotionTap'));
  });

  test('promotion detail renders html content and external link button', () {
    final source = read('lib/screens/user/promotion_detail_screen.dart');

    expect(source, contains('class PromotionDetailScreen'));
    expect(source, contains('Html('));
    expect(source, contains('launchUrl('));
    expect(source, contains('LaunchMode.externalApplication'));
    expect(source, contains('promotion.externalLinkLabel'));
    expect(source, contains('promotion.hasExternalLink'));
  });
}
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
cd medical_qa_app
flutter test test/home_promotion_banner_test.dart
```

Expected: fail because the carousel and detail files do not exist and `home_screen.dart` does not load promotions.

- [ ] **Step 3: Implement `PromotionCarousel`**

Create `medical_qa_app/lib/widgets/promotion_carousel.dart` with these behaviors:

```dart
import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/promotion_model.dart';
import '../utils/app_colors.dart';

class PromotionCarousel extends StatefulWidget {
  final List<PromotionModel> promotions;
  final ValueChanged<PromotionModel> onPromotionTap;

  const PromotionCarousel({
    super.key,
    required this.promotions,
    required this.onPromotionTap,
  });

  @override
  State<PromotionCarousel> createState() => _PromotionCarouselState();
}

class _PromotionCarouselState extends State<PromotionCarousel> {
  final PageController _pageController = PageController();
  Timer? _timer;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _startTimerIfNeeded();
  }

  @override
  void didUpdateWidget(covariant PromotionCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.promotions.length != widget.promotions.length) {
      _timer?.cancel();
      _currentIndex = 0;
      _startTimerIfNeeded();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _startTimerIfNeeded() {
    if (widget.promotions.length <= 1) return;
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_pageController.hasClients) return;
      final nextIndex = (_currentIndex + 1) % widget.promotions.length;
      _pageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.promotions.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        SizedBox(
          height: 96,
          child: PageView.builder(
            controller: _pageController,
            itemCount: widget.promotions.length,
            onPageChanged: (index) => setState(() => _currentIndex = index),
            itemBuilder: (context, index) {
              final promotion = widget.promotions[index];
              return GestureDetector(
                onTap: () => widget.onPromotionTap(promotion),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: CachedNetworkImage(
                    imageUrl: promotion.bannerImageUrl,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    placeholder: (context, url) => Container(color: AppColors.surfaceMuted),
                    errorWidget: (context, url, error) => Container(
                      color: AppColors.surfaceMuted,
                      alignment: Alignment.center,
                      child: const Icon(Icons.image_not_supported_outlined, color: AppColors.textSecondary),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (widget.promotions.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.promotions.length, (index) {
              final isActive = index == _currentIndex;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: isActive ? 18 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: isActive ? AppColors.accent : AppColors.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}
```

- [ ] **Step 4: Implement `PromotionDetailScreen`**

Create `medical_qa_app/lib/screens/user/promotion_detail_screen.dart` with a white app bar, image hero, HTML body, and external link button:

```dart
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/promotion_model.dart';
import '../../utils/app_colors.dart';

class PromotionDetailScreen extends StatelessWidget {
  final PromotionModel promotion;

  const PromotionDetailScreen({
    super.key,
    required this.promotion,
  });

  Future<void> _openExternalLink(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final url = promotion.externalLinkUrl;
    if (url == null || url.isEmpty) return;

    try {
      final launched = await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        messenger.showSnackBar(const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')));
      }
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          '상세 안내',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: CachedNetworkImage(
                imageUrl: promotion.bannerImageUrl,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  height: 160,
                  color: AppColors.surfaceMuted,
                ),
                errorWidget: (context, url, error) => Container(
                  height: 160,
                  color: AppColors.surfaceMuted,
                  alignment: Alignment.center,
                  child: const Icon(Icons.image_not_supported_outlined, color: AppColors.textSecondary),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              promotion.title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.w700,
                height: 1.35,
              ),
            ),
            if (promotion.summary.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                promotion.summary,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 15,
                  height: 1.6,
                ),
              ),
            ],
            const SizedBox(height: 20),
            Html(
              data: promotion.contentHtml,
              style: {
                'body': Style(
                  color: AppColors.textPrimary,
                  fontSize: FontSize(16),
                  lineHeight: const LineHeight(1.65),
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                ),
                'p': Style(margin: Margins.only(bottom: 12)),
              },
            ),
            if (promotion.hasExternalLink) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _openExternalLink(context),
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: Text(promotion.externalLinkLabel),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 5: Wire `HomeScreen`**

Modify `medical_qa_app/lib/screens/user/home_screen.dart`:

```dart
import '../../services/promotion_service.dart';
import '../../models/promotion_model.dart';
import '../../widgets/promotion_carousel.dart';
import 'promotion_detail_screen.dart';
```

Add fields:

```dart
final PromotionService _promotionService = PromotionService();
List<PromotionModel> _promotions = [];
```

Call loader in `initState()`:

```dart
_loadPromotions();
```

Add loader:

```dart
Future<void> _loadPromotions() async {
  try {
    final promotions = await _promotionService.getPublishedPromotions();
    if (mounted) {
      setState(() {
        _promotions = promotions;
      });
    }
  } catch (e) {
    debugPrint('Promotion load error: $e');
  }
}
```

Add navigation:

```dart
void _openPromotion(PromotionModel promotion) {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => PromotionDetailScreen(promotion: promotion),
    ),
  );
}
```

Place under `_ChatBanner`:

```dart
_ChatBanner(
  onTap: _navigateToChat,
),
const SizedBox(height: 14),
PromotionCarousel(
  promotions: _promotions,
  onPromotionTap: _openPromotion,
),
if (_promotions.isNotEmpty) const SizedBox(height: 14),
```

- [ ] **Step 6: Run tests and verify GREEN**

Run:

```bash
cd medical_qa_app
flutter test test/promotion_model_test.dart test/promotion_service_source_test.dart test/home_promotion_banner_test.dart test/home_chat_banner_layout_test.dart
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add medical_qa_app/test/home_promotion_banner_test.dart medical_qa_app/lib/widgets/promotion_carousel.dart medical_qa_app/lib/screens/user/promotion_detail_screen.dart medical_qa_app/lib/screens/user/home_screen.dart
git commit -m "feat: show promotion banners in app"
```

## Task 3: Web Public Promotion Carousel And Detail

**Files:**

- Create: `admin-web/src/__tests__/promotionBanners.test.js`
- Create: `admin-web/src/services/promotionService.js`
- Create: `admin-web/src/components/PromotionCarousel.jsx`
- Create: `admin-web/src/components/PromotionDetail.jsx`
- Modify: `admin-web/src/components/HomeDashboard.jsx`
- Modify: `admin-web/src/App.jsx`

- [ ] **Step 1: Write failing web public tests**

Create `admin-web/src/__tests__/promotionBanners.test.js`:

```javascript
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');
const rootDir = path.join(srcDir, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

function readRoot(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

describe('promotion banners', () => {
  test('public web has promotion carousel and detail route', () => {
    const app = read('App.jsx');
    const homeDashboard = read('components/HomeDashboard.jsx');
    const carousel = read('components/PromotionCarousel.jsx');
    const detail = read('components/PromotionDetail.jsx');
    const service = read('services/promotionService.js');

    expect(app).toMatch(/import PromotionDetail/);
    expect(app).toMatch(/path="\/promotions\/:promotionId"/);
    expect(homeDashboard).toMatch(/import PromotionCarousel/);
    expect(homeDashboard).toMatch(/<PromotionCarousel \/>/);
    expect(carousel).toMatch(/getPublishedPromotions/);
    expect(carousel).toMatch(/setInterval/);
    expect(carousel).toMatch(/navigate\(`\/promotions\/\$\{promotion\.id\}`\)/);
    expect(detail).toMatch(/getPromotion/);
    expect(detail).toMatch(/dangerouslySetInnerHTML/);
    expect(detail).toMatch(/target="_blank"/);
    expect(service).toMatch(/PROMOTION_HOME_LIMIT = 10/);
    expect(service).toMatch(/collection\(db, 'promotions'\)/);
    expect(service).toMatch(/where\('isPublished', '==', true\)/);
    expect(service).toMatch(/orderBy\('sortOrder'\)/);
    expect(service).toMatch(/orderBy\('createdAt', 'desc'\)/);
    expect(service).toMatch(/limit\(PROMOTION_HOME_LIMIT\)/);
  });

  test('promotion security rules allow public published reads and admin writes', () => {
    const firestoreRules = readRoot('medical_qa_app/firestore.rules');
    const storageRules = readRoot('medical_qa_app/storage.rules');

    expect(firestoreRules).toMatch(/match \/promotions\/\{promotionId\}/);
    expect(firestoreRules).toMatch(/allow read: if resource\.data\.isPublished == true \|\| isAdmin\(\);/);
    expect(firestoreRules).toMatch(/allow create: if isAdmin\(\);/);
    expect(firestoreRules).toMatch(/allow update: if isAdmin\(\);/);
    expect(firestoreRules).toMatch(/allow delete: if isAdmin\(\);/);
    expect(storageRules).toMatch(/match \/promotion_banners\/\{imageId\}/);
    expect(storageRules).toMatch(/match \/promotion_images\/\{imageId\}/);
    expect(storageRules).toMatch(/allow read: if true;/);
    expect(storageRules).toMatch(/allow write: if isAdmin\(\)/);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false src/__tests__/promotionBanners.test.js
```

Expected: fail because promotion components, service, routes, and rules are missing.

- [ ] **Step 3: Implement shared web promotion service**

Create `admin-web/src/services/promotionService.js`:

```javascript
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { auth, db, storage } from '../firebase';

export const PROMOTION_HOME_LIMIT = 10;
export const PROMOTION_ADMIN_PAGE_SIZE = 10;

export function mapPromotionDoc(docSnapshot) {
  return {
    id: docSnapshot.id,
    ...docSnapshot.data(),
  };
}

export async function getPublishedPromotions() {
  const snapshot = await getDocs(
    query(
      collection(db, 'promotions'),
      where('isPublished', '==', true),
      orderBy('sortOrder'),
      orderBy('createdAt', 'desc'),
      limit(PROMOTION_HOME_LIMIT)
    )
  );

  return snapshot.docs.map(mapPromotionDoc);
}

export async function getPromotion(promotionId) {
  const snapshot = await getDoc(doc(db, 'promotions', promotionId));
  if (!snapshot.exists()) return null;
  return mapPromotionDoc(snapshot);
}

export async function uploadPromotionBanner(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${uuidv4()}.${ext}`;
  const storageRef = ref(storage, `promotion_banners/${fileName}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function savePromotion(form, editingPromotion = null) {
  const user = auth.currentUser;
  const payload = {
    title: form.title.trim(),
    summary: form.summary.trim(),
    bannerImageUrl: form.bannerImageUrl.trim(),
    contentHtml: form.contentHtml.trim(),
    externalLinkUrl: form.externalLinkUrl.trim(),
    externalLinkLabel: form.externalLinkLabel.trim(),
    sortOrder: Number(form.sortOrder) || 0,
    isPublished: form.isPublished,
    updatedAt: serverTimestamp(),
    updatedBy: user?.uid || '',
  };

  if (editingPromotion) {
    await updateDoc(doc(db, 'promotions', editingPromotion.id), payload);
    return editingPromotion.id;
  }

  const docRef = await addDoc(collection(db, 'promotions'), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: user?.uid || '',
  });
  return docRef.id;
}

export async function deletePromotion(promotionId) {
  await deleteDoc(doc(db, 'promotions', promotionId));
}
```

- [ ] **Step 4: Implement `PromotionCarousel`**

Create `admin-web/src/components/PromotionCarousel.jsx` with a bounded public fetch and route navigation:

```javascript
import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { colors } from '../theme';
import { getPublishedPromotions } from '../services/promotionService';

function PromotionCarousel() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublishedPromotions()
      .then((items) => {
        if (active) setPromotions(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (promotions.length <= 1) return undefined;
    const timer = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promotions.length]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (promotions.length === 0) return null;

  const promotion = promotions[currentIndex];

  return (
    <Box sx={{ mt: 2.5 }}>
      <Box
        component="button"
        type="button"
        onClick={() => navigate(`/promotions/${promotion.id}`)}
        sx={{
          width: '100%',
          p: 0,
          border: `1px solid ${colors.border}`,
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'rgba(255,255,255,0.78)',
          cursor: 'pointer',
          boxShadow: '0 14px 34px rgba(31, 51, 43, 0.08)',
        }}
      >
        <Box
          component="img"
          src={promotion.bannerImageUrl}
          alt={promotion.title}
          sx={{
            display: 'block',
            width: '100%',
            aspectRatio: '6 / 1',
            objectFit: 'cover',
          }}
        />
      </Box>
      {promotions.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mt: 1 }}>
          {promotions.map((item, index) => (
            <Box
              key={item.id}
              component="button"
              type="button"
              aria-label={`${index + 1}번째 광고 보기`}
              onClick={() => setCurrentIndex(index)}
              sx={{
                width: index === currentIndex ? 18 : 7,
                height: 7,
                border: 0,
                borderRadius: 999,
                bgcolor: index === currentIndex ? colors.primary : colors.border,
                cursor: 'pointer',
                transition: 'width 0.18s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default PromotionCarousel;
```

- [ ] **Step 5: Implement `PromotionDetail`**

Create `admin-web/src/components/PromotionDetail.jsx`:

```javascript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { colors } from '../theme';
import { getPromotion } from '../services/promotionService';
import { pageShellSx } from '../utils/webDesignStyles';

function PromotionDetail() {
  const { promotionId } = useParams();
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPromotion(promotionId)
      .then((item) => {
        if (active) setPromotion(item);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [promotionId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (!promotion) {
    return (
      <Box sx={pageShellSx}>
        <Typography sx={{ color: colors.textSecondary }}>등록된 안내를 찾을 수 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={pageShellSx}>
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        <Box
          component="img"
          src={promotion.bannerImageUrl}
          alt={promotion.title}
          sx={{
            display: 'block',
            width: '100%',
            borderRadius: 4,
            objectFit: 'cover',
            border: `1px solid ${colors.border}`,
          }}
        />
        <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: 900, mt: 3, mb: 1 }}>
          {promotion.title}
        </Typography>
        {promotion.summary && (
          <Typography sx={{ color: colors.textSecondary, fontSize: 16, lineHeight: 1.7, mb: 3 }}>
            {promotion.summary}
          </Typography>
        )}
        <Box
          sx={{
            color: colors.textPrimary,
            fontSize: 16,
            lineHeight: 1.75,
            '& img': { maxWidth: '100%', borderRadius: 2 },
          }}
          dangerouslySetInnerHTML={{ __html: promotion.contentHtml || '' }}
        />
        {promotion.externalLinkUrl && (
          <Button
            variant="contained"
            endIcon={<OpenInNewRoundedIcon />}
            href={promotion.externalLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 3, px: 3, py: 1.3, borderRadius: 999 }}
          >
            {promotion.externalLinkLabel || '자세히 보기'}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default PromotionDetail;
```

- [ ] **Step 6: Wire public route and home placement**

Modify `admin-web/src/App.jsx`:

```javascript
import PromotionDetail from './components/PromotionDetail';
```

Add metadata for promotion detail:

```javascript
if (pathname.startsWith('/promotions/')) {
  return {
    title: `상세 안내 | ${SITE_NAME}`,
    description: '난임상담톡톡에서 안내하는 도서와 서비스 소식을 확인할 수 있습니다.',
    shouldIndex: true,
  };
}
```

Add route before the catch-all:

```jsx
<Route
  path="/promotions/:promotionId"
  element={
    <Layout>
      <PromotionDetail />
    </Layout>
  }
/>
```

Modify `admin-web/src/components/HomeDashboard.jsx`:

```javascript
import PromotionCarousel from './PromotionCarousel';
```

Render under the top hero card:

```jsx
<PromotionCarousel />
```

- [ ] **Step 7: Run tests and verify public web GREEN after rules task is complete**

Run after Task 5 has added rules:

```bash
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false src/__tests__/promotionBanners.test.js
```

Expected: all tests pass.

## Task 4: Web Admin Promotion Manager

**Files:**

- Modify: `admin-web/src/__tests__/promotionBanners.test.js`
- Modify: `admin-web/src/__tests__/costGuardrails.test.js`
- Create: `admin-web/src/components/PromotionManager.jsx`
- Modify: `admin-web/src/components/Layout.jsx`
- Modify: `admin-web/src/App.jsx`

- [ ] **Step 1: Extend failing tests for admin management**

Append to `admin-web/src/__tests__/promotionBanners.test.js`:

```javascript
test('admin web exposes promotion management only to admins', () => {
  const app = read('App.jsx');
  const layout = read('components/Layout.jsx');
  const manager = read('components/PromotionManager.jsx');

  expect(app).toMatch(/import PromotionManager/);
  expect(app).toMatch(/path="\/promotions"/);
  expect(app).toMatch(/<PromotionManager \/>/);
  expect(app).toMatch(/isAdmin \?/);
  expect(layout).toMatch(/label: '광고 관리'/);
  expect(layout).toMatch(/path: '\/promotions'/);
  expect(layout).toMatch(/visible: isAdmin/);
  expect(manager).toMatch(/PROMOTION_ADMIN_PAGE_SIZE/);
  expect(manager).toMatch(/ReactQuill/);
  expect(manager).toMatch(/uploadPromotionBanner/);
  expect(manager).toMatch(/savePromotion/);
  expect(manager).toMatch(/deletePromotion/);
  expect(manager).toMatch(/sortOrder/);
  expect(manager).toMatch(/isPublished/);
});
```

Modify the `files` array in `admin-web/src/__tests__/costGuardrails.test.js`:

```javascript
const files = [
  'components/NewsManager.jsx',
  'components/EncyclopediaManager.jsx',
  'components/NoticeManager.jsx',
  'components/VideoManager.jsx',
  'components/PromotionManager.jsx',
];
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false src/__tests__/promotionBanners.test.js src/__tests__/costGuardrails.test.js
```

Expected: fail because `PromotionManager.jsx`, admin route, and sidebar entry do not exist.

- [ ] **Step 3: Implement `PromotionManager.jsx`**

Create `admin-web/src/components/PromotionManager.jsx` using the existing manager styling helpers:

```javascript
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { db } from '../firebase';
import { colors } from '../theme';
import {
  deletePromotion,
  PROMOTION_ADMIN_PAGE_SIZE,
  savePromotion,
  uploadPromotionBanner,
} from '../services/promotionService';
import {
  dialogPaperSx,
  emptyStateSx,
  pageHeaderSx,
  pageShellSx,
  paginationButtonSx,
  searchFieldSx,
} from '../utils/webDesignStyles';

const ITEMS_PER_PAGE = PROMOTION_ADMIN_PAGE_SIZE;
const QUERY_PAGE_SIZE = ITEMS_PER_PAGE;

function PromotionManager() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    summary: '',
    bannerImageUrl: '',
    contentHtml: '',
    externalLinkUrl: '',
    externalLinkLabel: '',
    sortOrder: 0,
    isPublished: true,
  });

  const buildPromotionsQuery = (cursor = null) => {
    const constraints = [orderBy('sortOrder'), orderBy('createdAt', 'desc')];
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(QUERY_PAGE_SIZE));
    return query(collection(db, 'promotions'), ...constraints);
  };

  const loadTotalCount = async () => {
    const snapshot = await getCountFromServer(query(collection(db, 'promotions')));
    setTotalItemCount(snapshot.data().count);
  };

  const updatePaginationCursor = (snapshot) => {
    setLastVisibleDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
    setHasMore(snapshot.docs.length === QUERY_PAGE_SIZE);
  };

  const mapSnapshot = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  useEffect(() => {
    let unsubscribe;
    loadTotalCount();
    unsubscribe = onSnapshot(buildPromotionsQuery(), (snapshot) => {
      setPromotions(mapSnapshot(snapshot));
      updatePaginationCursor(snapshot);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const readPromotionsPage = async (cursor) => {
    const snapshot = await getDocs(buildPromotionsQuery(cursor));
    return {
      items: mapSnapshot(snapshot),
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : cursor,
      nextHasMore: snapshot.docs.length === QUERY_PAGE_SIZE,
    };
  };

  const filteredPromotions = useMemo(() => {
    if (!searchQuery) return promotions;
    const keyword = searchQuery.toLowerCase();
    return promotions.filter((promotion) => (
      (promotion.title || '').toLowerCase().includes(keyword) ||
      (promotion.summary || '').toLowerCase().includes(keyword)
    ));
  }, [promotions, searchQuery]);

  const totalPages = Math.ceil((searchQuery ? filteredPromotions.length : totalItemCount) / ITEMS_PER_PAGE);
  const paginatedPromotions = filteredPromotions.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handlePageChange = async (page) => {
    if (page < 0 || loadingMore || page >= totalPages) return;
    const loadedPages = Math.ceil(filteredPromotions.length / ITEMS_PER_PAGE);
    if (page < loadedPages) {
      setCurrentPage(page);
      return;
    }
    if (searchQuery || !hasMore || !lastVisibleDoc) return;

    setLoadingMore(true);
    try {
      const result = await readPromotionsPage(lastVisibleDoc);
      if (result.items.length > 0) {
        setPromotions((prev) => [...prev, ...result.items]);
        setCurrentPage(page);
      }
      setLastVisibleDoc(result.lastDoc);
      setHasMore(result.nextHasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setForm({
      title: '',
      summary: '',
      bannerImageUrl: '',
      contentHtml: '',
      externalLinkUrl: '',
      externalLinkLabel: '',
      sortOrder: 0,
      isPublished: true,
    });
  };

  const openDialog = (promotion = null) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setForm({
        title: promotion.title || '',
        summary: promotion.summary || '',
        bannerImageUrl: promotion.bannerImageUrl || '',
        contentHtml: promotion.contentHtml || '',
        externalLinkUrl: promotion.externalLinkUrl || '',
        externalLinkLabel: promotion.externalLinkLabel || '',
        sortOrder: promotion.sortOrder || 0,
        isPublished: promotion.isPublished !== false,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const url = await uploadPromotionBanner(file);
      updateForm('bannerImageUrl', url);
      setSnackbar({ open: true, message: '배너 이미지가 업로드되었습니다', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `업로드 실패: ${error.message}`, severity: 'error' });
    } finally {
      setUploadingBanner(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.bannerImageUrl.trim()) {
      setSnackbar({ open: true, message: '제목과 배너 이미지를 입력해주세요', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      await savePromotion(form, editingPromotion);
      await loadTotalCount();
      closeDialog();
      setSnackbar({ open: true, message: '광고가 저장되었습니다', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `저장 실패: ${error.message}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (promotion) => {
    await updateDoc(doc(db, 'promotions', promotion.id), {
      isPublished: !promotion.isPublished,
      updatedAt: serverTimestamp(),
    });
    setSnackbar({ open: true, message: promotion.isPublished ? '비공개로 전환되었습니다' : '공개되었습니다', severity: 'success' });
  };

  const handleDelete = async (promotion) => {
    if (!window.confirm(`"${promotion.title}" 광고를 삭제하시겠습니까?`)) return;
    await deletePromotion(promotion.id);
    await loadTotalCount();
    setSnackbar({ open: true, message: '삭제되었습니다', severity: 'success' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={pageShellSx}>
      <Box sx={pageHeaderSx}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
              광고 관리
            </Typography>
            <Typography sx={{ color: colors.textSecondary }}>
              홈에 노출되는 도서와 서비스 안내 배너를 관리하세요.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openDialog()}>
            새 광고 등록
          </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        placeholder="제목 또는 설명 검색..."
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setCurrentPage(0);
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ color: colors.textTertiary }} />
            </InputAdornment>
          ),
        }}
        sx={searchFieldSx()}
      />

      {filteredPromotions.length === 0 ? (
        <Box sx={emptyStateSx(colors)}>
          <CampaignRoundedIcon sx={{ fontSize: 36, color: colors.textTertiary, mb: 1 }} />
          <Typography sx={{ color: colors.textSecondary }}>등록된 광고가 없습니다</Typography>
        </Box>
      ) : (
        <Box sx={{ ...emptyStateSx(colors), alignItems: 'stretch', py: 0, overflow: 'hidden' }}>
          <List sx={{ p: 0 }}>
            {paginatedPromotions.map((promotion, index) => (
              <ListItem
                key={promotion.id}
                disablePadding
                sx={{ borderBottom: index < paginatedPromotions.length - 1 ? `1px solid ${colors.divider}` : 'none' }}
              >
                <ListItemButton onClick={() => openDialog(promotion)} sx={{ py: 2.25, px: 3 }}>
                  <Box
                    component="img"
                    src={promotion.bannerImageUrl}
                    alt=""
                    sx={{ width: 136, height: 46, objectFit: 'cover', borderRadius: 1.5, mr: 2, border: `1px solid ${colors.border}` }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip size="small" label={promotion.isPublished ? '공개' : '비공개'} />
                      <Typography sx={{ color: colors.textPrimary, fontWeight: 800 }}>
                        {promotion.title}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: colors.textSecondary, fontSize: 13 }}>
                      정렬 {promotion.sortOrder} · {promotion.summary}
                    </Typography>
                  </Box>
                  <Box onClick={(event) => event.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => openDialog(promotion)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleTogglePublish(promotion)}>
                      {promotion.isPublished ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(promotion)}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {(totalPages > 1 || hasMore) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 4 }}>
          <IconButton onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 0}>
            <ChevronLeftRoundedIcon />
          </IconButton>
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index}
              onClick={() => handlePageChange(index)}
              variant={currentPage === index ? 'contained' : 'text'}
              sx={paginationButtonSx(colors, currentPage === index)}
            >
              {index + 1}
            </Button>
          ))}
          <IconButton onClick={() => handlePageChange(currentPage + 1)} disabled={loadingMore || currentPage >= totalPages - 1}>
            <ChevronRightRoundedIcon />
          </IconButton>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md" PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle>{editingPromotion ? '광고 수정' : '새 광고 등록'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="제목" value={form.title} onChange={(event) => updateForm('title', event.target.value)} fullWidth />
          <TextField label="요약" value={form.summary} onChange={(event) => updateForm('summary', event.target.value)} fullWidth />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="배너 이미지 URL" value={form.bannerImageUrl} onChange={(event) => updateForm('bannerImageUrl', event.target.value)} fullWidth />
            <Button variant="outlined" startIcon={<AddPhotoAlternateRoundedIcon />} disabled={uploadingBanner} onClick={() => bannerInputRef.current?.click()}>
              업로드
            </Button>
            <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={handleBannerUpload} />
          </Box>
          <TextField label="외부 링크 URL" value={form.externalLinkUrl} onChange={(event) => updateForm('externalLinkUrl', event.target.value)} fullWidth />
          <TextField label="외부 링크 버튼 문구" value={form.externalLinkLabel} onChange={(event) => updateForm('externalLinkLabel', event.target.value)} fullWidth />
          <TextField label="정렬 순서" type="number" value={form.sortOrder} onChange={(event) => updateForm('sortOrder', event.target.value)} fullWidth />
          <ReactQuill theme="snow" value={form.contentHtml} onChange={(value) => updateForm('contentHtml', value)} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch checked={form.isPublished} onChange={(event) => updateForm('isPublished', event.target.checked)} />
            <Typography sx={{ color: colors.textSecondary }}>공개</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>취소</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default PromotionManager;
```

- [ ] **Step 4: Wire admin route and sidebar**

Modify `admin-web/src/App.jsx`:

```javascript
import PromotionManager from './components/PromotionManager';
```

Add route metadata:

```javascript
'/promotions': {
  title: `광고 관리 | ${SITE_NAME}`,
  description: '관리자가 홈 광고 배너를 등록하고 관리하는 화면입니다.',
  shouldIndex: false,
},
```

Add admin route before public detail route or before catch-all:

```jsx
<Route
  path="/promotions"
  element={
    isAdmin ? (
      <Layout>
        <PromotionManager />
      </Layout>
    ) : (
      <Navigate to="/" />
    )
  }
/>
```

Modify `admin-web/src/components/Layout.jsx`:

```javascript
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
```

Add admin menu item near `사용자 관리`:

```javascript
{
  path: '/promotions',
  label: '광고 관리',
  icon: <LocalOfferRoundedIcon />,
  description: '홈 배너 관리',
  badge: 0,
  visible: isAdmin,
},
```

- [ ] **Step 5: Run tests and verify admin web GREEN after rules task is complete**

Run after Task 5 has added rules:

```bash
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false src/__tests__/promotionBanners.test.js src/__tests__/costGuardrails.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add admin-web/src/__tests__/promotionBanners.test.js admin-web/src/__tests__/costGuardrails.test.js admin-web/src/services/promotionService.js admin-web/src/components/PromotionCarousel.jsx admin-web/src/components/PromotionDetail.jsx admin-web/src/components/PromotionManager.jsx admin-web/src/components/HomeDashboard.jsx admin-web/src/components/Layout.jsx admin-web/src/App.jsx
git commit -m "feat: manage promotion banners on web"
```

## Task 5: Firebase Rules And Cost Guardrails

**Files:**

- Modify: `medical_qa_app/firestore.rules`
- Modify: `medical_qa_app/storage.rules`
- Modify: `medical_qa_app/test/firebase_cost_guardrails_test.dart`

- [ ] **Step 1: Write failing Flutter rules guard**

Append to `medical_qa_app/test/firebase_cost_guardrails_test.dart`:

```dart
test('promotion reads are public only for published docs and writes are admin-only', () {
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

  expect(storageRules, contains('match /promotion_banners/{imageId}'));
  expect(storageRules, contains('match /promotion_images/{imageId}'));
  expect(storageRules, contains('allow read: if true;'));
  expect(storageRules, contains('allow write: if isAdmin()'));
});
```

Add a separate assertion block after the existing `content list services use server-side pagination limits` loop. Do not add `lib/services/promotion_service.dart` to the existing `serviceFiles` array because that loop checks cursor pagination for page screens, while the promotion home query is intentionally a fixed `limit(10)` read:

```dart
final promotionService = read('lib/services/promotion_service.dart');
expect(promotionService, contains('defaultLimit = 10'));
expect(promotionService, contains(".limit(limit)"));
expect(promotionService, contains(".where('isPublished', isEqualTo: true)"));
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd medical_qa_app
flutter test test/firebase_cost_guardrails_test.dart
```

Expected: fail because promotion rules are not present.

- [ ] **Step 3: Add Firestore rules**

Add to `medical_qa_app/firestore.rules` near other content collections:

```javascript
// promotions 컬렉션 (홈 광고/도서 배너)
match /promotions/{promotionId} {
  // 읽기: 공개된 광고는 모두(비로그인 포함), 비공개 광고는 관리자만
  allow read: if resource.data.isPublished == true || isAdmin();
  // 생성/수정/삭제: 관리자만
  allow create: if isAdmin();
  allow update: if isAdmin();
  allow delete: if isAdmin();
}
```

- [ ] **Step 4: Add Storage rules**

Add to `medical_qa_app/storage.rules`:

```javascript
// 홈 광고 배너 이미지 (비로그인 홈에도 노출되므로 공개 읽기)
match /promotion_banners/{imageId} {
  allow read: if true;
  allow write: if isAdmin()
               && isImageUnder(10 * 1024 * 1024);  // 10MB 제한
}

// 홈 광고 상세 이미지 (비로그인 상세에도 노출되므로 공개 읽기)
match /promotion_images/{imageId} {
  allow read: if true;
  allow write: if isAdmin()
               && isImageUnder(10 * 1024 * 1024);  // 10MB 제한
}
```

- [ ] **Step 5: Run rules/cost tests and verify GREEN**

Run:

```bash
cd medical_qa_app
flutter test test/firebase_cost_guardrails_test.dart test/promotion_service_source_test.dart
cd ../admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false src/__tests__/promotionBanners.test.js src/__tests__/costGuardrails.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add medical_qa_app/firestore.rules medical_qa_app/storage.rules medical_qa_app/test/firebase_cost_guardrails_test.dart
git commit -m "chore: add promotion firebase rules"
```

## Task 6: End-To-End Verification

**Files:**

- No new files.

- [ ] **Step 1: Run focused Flutter tests**

Run:

```bash
cd medical_qa_app
flutter test test/promotion_model_test.dart test/promotion_service_source_test.dart test/home_promotion_banner_test.dart test/firebase_cost_guardrails_test.dart test/home_chat_banner_layout_test.dart
```

Expected: all tests pass.

- [ ] **Step 2: Run focused web tests**

Run:

```bash
cd admin-web
CI=true ./node_modules/.bin/react-scripts test --watchAll=false src/__tests__/promotionBanners.test.js src/__tests__/costGuardrails.test.js src/__tests__/homeRouting.test.js
```

Expected: all tests pass.

- [ ] **Step 3: Build Flutter simulator app**

Run:

```bash
cd medical_qa_app
flutter build ios --simulator
```

Expected: build succeeds.

- [ ] **Step 4: Build web**

Run:

```bash
cd admin-web
npm run build
```

Expected: build succeeds and produces `admin-web/build`.

- [ ] **Step 5: Manual QA checklist**

Use a local admin web session and simulator app:

- Create a draft promotion and confirm it does not show on app or web home.
- Publish two promotions with `sortOrder` values `1` and `2`.
- Confirm app home shows the promotion carousel below the chat banner.
- Confirm web home shows the promotion carousel on `/`.
- Tap/click both banners and confirm the detail page opens.
- Add an external link and confirm the app opens it externally and the web opens it in a new tab.
- Confirm logged-out web can see published promotion images.
- Confirm chat still routes through the existing login-required flow for guests.

- [ ] **Step 6: Final commit if manual QA fixes were needed**

If verification required small fixes, commit only the relevant files:

```bash
git add medical_qa_app/lib/models/promotion_model.dart medical_qa_app/lib/services/promotion_service.dart medical_qa_app/lib/widgets/promotion_carousel.dart medical_qa_app/lib/screens/user/promotion_detail_screen.dart medical_qa_app/lib/screens/user/home_screen.dart admin-web/src/services/promotionService.js admin-web/src/components/PromotionCarousel.jsx admin-web/src/components/PromotionDetail.jsx admin-web/src/components/PromotionManager.jsx admin-web/src/components/HomeDashboard.jsx admin-web/src/components/Layout.jsx admin-web/src/App.jsx medical_qa_app/firestore.rules medical_qa_app/storage.rules
git commit -m "fix: polish promotion banner flow"
```

## Self-Review Notes

- Spec coverage: app home, web home, admin manager, detail page, Firestore rules, Storage rules, and cost controls are each mapped to a task.
- Cost control: homepage reads use `limit(10)` and one-time reads. Admin manager uses `PROMOTION_ADMIN_PAGE_SIZE = 10`, `limit`, and cursor pagination.
- Access control: published promotion docs and promotion images are public read; writes stay admin-only.
- Type consistency: model/service/component fields use `title`, `summary`, `bannerImageUrl`, `contentHtml`, `externalLinkUrl`, `externalLinkLabel`, `sortOrder`, and `isPublished` throughout.
