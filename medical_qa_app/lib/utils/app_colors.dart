import 'package:flutter/material.dart';

/// App-wide color tokens for the Flutter client.
///
/// The visual direction stays close to the current product:
/// clean white surfaces, muted cocoa text, sage-green emphasis, and
/// a restrained champagne accent for secondary emphasis.
class AppColors {
  AppColors._();

  // Core surfaces
  static const Color background = Color(0xFFFFFFFF);
  static const Color backgroundWarm = Color(0xFFF6FBF7);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFFAFAFA);
  static const Color surfaceRaised = Color(0xFFF1E9E3);
  static const Color surfaceTint = Color(0xFFEEF7F1);

  // Text
  static const Color textPrimary = Color(0xFF2F2627);
  static const Color textSecondary = Color(0xFF74666A);
  static const Color textTertiary = Color(0xFFA39598);
  static const Color textInverse = Color(0xFFFFFFFF);

  // Brand accents
  static const Color accent = Color(0xFF70B789);
  static const Color accentStrong = Color(0xFF5B9D72);
  static const Color accentDeep = Color(0xFF447B59);
  static const Color accentSoft = Color(0xFFD8EEE0);
  static const Color accentSoftMuted = Color(0xFFEEF8F1);

  // Supporting accents
  static const Color goldAccent = Color(0xFFD4A853);
  static const Color goldSoft = Color(0xFFF8F8F8);
  static const Color info = Color(0xFF5B8BA8);
  static const Color infoSoft = Color(0xFFE8F4FC);
  static const Color success = Color(0xFF6FA87B);
  static const Color successSoft = Color(0xFFE8F5EC);
  static const Color warning = Color(0xFFE0A14A);
  static const Color warningSoft = Color(0xFFFFF1E1);
  static const Color error = Color(0xFFE57373);
  static const Color errorSoft = Color(0xFFFDECEC);

  // Feature palettes
  static const Color encyclopediaTone = Color(0xFFD4A956);
  static const Color encyclopediaSurface = Color(0xFFFADC4A);
  static const Color encyclopediaSurfaceSoft = Color(0xFFF5E6A3);
  static const Color encyclopediaHighlight = Color(0xFFFFEB3B);
  static const Color newsTone = Color(0xFF80A5BB);
  static const Color newsSurfaceSoft = Color(0xFFD4E8EF);
  static const Color newsHighlight = Color(0xFFD4E8EF);

  // Borders and overlays
  static const Color border = Color(0xFFE7DDD8);
  static const Color borderStrong = Color(0xFFD7CAC5);
  static const Color divider = border;
  static const Color scrim = Color(0x66000000);

  // Inputs and controls
  static const Color inputBackground = Color(0xFFFAFAFA);
  static const Color inputBorder = Color(0xFFFAFAFA);
  static const Color buttonBorder = borderStrong;
  static const Color buttonText = textPrimary;

  // Chat-specific aliases
  static const Color userMessage = accent;
  static const Color adminMessage = surfaceMuted;
  static const Color chatUserBubble = accent;
  static const Color chatAdminBubble = surfaceMuted;
  static const Color chatAgentBadgeBackground = accentSoft;
  static const Color chatAgentBadgeForeground = accentDeep;

  // Backwards-compatible aliases used across the codebase
  static const Color backgroundAlt = surfaceMuted;
}
