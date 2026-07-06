package com.colortouch.sdk

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import com.colortouch.sdk.model.ColorModes
import com.colortouch.sdk.model.Material3ColorScheme

private fun hexColor(hex: String): Color = Color(android.graphics.Color.parseColor(hex))

/**
 * Maps this wire-format scheme (36 "#RRGGBB" strings) onto a real Compose
 * Material3 ColorScheme, for use as `MaterialTheme(colorScheme = ...)`.
 *
 * Every field is supplied explicitly, so calling [lightColorScheme] vs
 * [darkColorScheme] only affects which reads more clearly at the call
 * site — with every parameter overridden, both produce an identical
 * ColorScheme. toLightColorScheme()/toDarkColorScheme() exist as two named
 * functions purely so call sites read as intent, not as a real behavioral
 * difference.
 */
fun Material3ColorScheme.toLightColorScheme(): ColorScheme = lightColorScheme(
    primary = hexColor(primary),
    onPrimary = hexColor(onPrimary),
    primaryContainer = hexColor(primaryContainer),
    onPrimaryContainer = hexColor(onPrimaryContainer),
    inversePrimary = hexColor(inversePrimary),
    secondary = hexColor(secondary),
    onSecondary = hexColor(onSecondary),
    secondaryContainer = hexColor(secondaryContainer),
    onSecondaryContainer = hexColor(onSecondaryContainer),
    tertiary = hexColor(tertiary),
    onTertiary = hexColor(onTertiary),
    tertiaryContainer = hexColor(tertiaryContainer),
    onTertiaryContainer = hexColor(onTertiaryContainer),
    background = hexColor(background),
    onBackground = hexColor(onBackground),
    surface = hexColor(surface),
    onSurface = hexColor(onSurface),
    surfaceVariant = hexColor(surfaceVariant),
    onSurfaceVariant = hexColor(onSurfaceVariant),
    surfaceTint = hexColor(surfaceTint),
    inverseSurface = hexColor(inverseSurface),
    inverseOnSurface = hexColor(inverseOnSurface),
    error = hexColor(error),
    onError = hexColor(onError),
    errorContainer = hexColor(errorContainer),
    onErrorContainer = hexColor(onErrorContainer),
    outline = hexColor(outline),
    outlineVariant = hexColor(outlineVariant),
    scrim = hexColor(scrim),
    surfaceBright = hexColor(surfaceBright),
    surfaceDim = hexColor(surfaceDim),
    surfaceContainer = hexColor(surfaceContainer),
    surfaceContainerHigh = hexColor(surfaceContainerHigh),
    surfaceContainerHighest = hexColor(surfaceContainerHighest),
    surfaceContainerLow = hexColor(surfaceContainerLow),
    surfaceContainerLowest = hexColor(surfaceContainerLowest),
)

/** See [toLightColorScheme] — identical mapping, called out separately for readability. */
fun Material3ColorScheme.toDarkColorScheme(): ColorScheme = darkColorScheme(
    primary = hexColor(primary),
    onPrimary = hexColor(onPrimary),
    primaryContainer = hexColor(primaryContainer),
    onPrimaryContainer = hexColor(onPrimaryContainer),
    inversePrimary = hexColor(inversePrimary),
    secondary = hexColor(secondary),
    onSecondary = hexColor(onSecondary),
    secondaryContainer = hexColor(secondaryContainer),
    onSecondaryContainer = hexColor(onSecondaryContainer),
    tertiary = hexColor(tertiary),
    onTertiary = hexColor(onTertiary),
    tertiaryContainer = hexColor(tertiaryContainer),
    onTertiaryContainer = hexColor(onTertiaryContainer),
    background = hexColor(background),
    onBackground = hexColor(onBackground),
    surface = hexColor(surface),
    onSurface = hexColor(onSurface),
    surfaceVariant = hexColor(surfaceVariant),
    onSurfaceVariant = hexColor(onSurfaceVariant),
    surfaceTint = hexColor(surfaceTint),
    inverseSurface = hexColor(inverseSurface),
    inverseOnSurface = hexColor(inverseOnSurface),
    error = hexColor(error),
    onError = hexColor(onError),
    errorContainer = hexColor(errorContainer),
    onErrorContainer = hexColor(onErrorContainer),
    outline = hexColor(outline),
    outlineVariant = hexColor(outlineVariant),
    scrim = hexColor(scrim),
    surfaceBright = hexColor(surfaceBright),
    surfaceDim = hexColor(surfaceDim),
    surfaceContainer = hexColor(surfaceContainer),
    surfaceContainerHigh = hexColor(surfaceContainerHigh),
    surfaceContainerHighest = hexColor(surfaceContainerHighest),
    surfaceContainerLow = hexColor(surfaceContainerLow),
    surfaceContainerLowest = hexColor(surfaceContainerLowest),
)

/**
 * Picks [ColorModes.light] or [ColorModes.dark] based on [useDarkTheme] and
 * maps it to a Compose ColorScheme in one call — e.g.
 * `MaterialTheme(colorScheme = paletteResponse.colors.toComposeColorScheme(isSystemInDarkTheme())) { ... }`.
 */
fun ColorModes.toComposeColorScheme(useDarkTheme: Boolean): ColorScheme =
    if (useDarkTheme) dark.toDarkColorScheme() else light.toLightColorScheme()
