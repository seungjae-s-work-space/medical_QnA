enum AppAccessFeature {
  chat,
  encyclopedia,
  news,
}

class AppAccessPolicy {
  const AppAccessPolicy._();

  static const bool showInAppPurchaseEntryPoint = false;

  static bool canOpen(AppAccessFeature feature) => true;
}
