# Changelog

All notable changes to the ColorTouch Android SDK are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-07-07

### Added
- Initial public release: `ColorTouchClient` singleton with `initialize()`,
  `getPersonalizedPalette()`, `setDefaultPalette()`,
  `startDefaultPalettePolling()`, and `resetToDefault()`.
- Retrofit/OkHttp-based networking against the ColorTouch server API.
- `PaletteStorage` (DataStore-backed) so the last fetched personalized
  palette survives process death.
- Jetpack Compose `ColorScheme` mapping via `toComposeColorScheme()`.
