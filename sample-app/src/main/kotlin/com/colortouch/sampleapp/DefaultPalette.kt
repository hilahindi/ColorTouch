package com.colortouch.sampleapp

import com.colortouch.sdk.model.BiInsights
import com.colortouch.sdk.model.ColorModes
import com.colortouch.sdk.model.Material3ColorScheme
import com.colortouch.sdk.model.PaletteResponse
import com.colortouch.sdk.model.UiBehavior

/**
 * Stand-in for what a real integrator would bake into their app (e.g. a
 * bundled JSON asset, same idea as questions.json) and register via
 * `ColorTouchClient.setDefaultPalette(...)` before any personalized palette
 * has ever been fetched or saved. Same Material Design 3 baseline tokens
 * (seed color #6750A4) used elsewhere in this project's mock fixtures.
 */
val DEMO_DEFAULT_PALETTE = PaletteResponse(
    schemaVersion = "1.0",
    paletteId = "00000000-0000-0000-0000-000000000000",
    basePaletteId = "00000000-0000-0000-0000-000000000000",
    basePaletteVersion = 1,
    userId = "00000000-0000-0000-0000-000000000000",
    colors = ColorModes(
        light = Material3ColorScheme(
            primary = "#6750A4",
            onPrimary = "#FFFFFF",
            primaryContainer = "#EADDFF",
            onPrimaryContainer = "#21005D",
            inversePrimary = "#D0BCFF",
            secondary = "#625B71",
            onSecondary = "#FFFFFF",
            secondaryContainer = "#E8DEF8",
            onSecondaryContainer = "#1D192B",
            tertiary = "#7D5260",
            onTertiary = "#FFFFFF",
            tertiaryContainer = "#FFD8E4",
            onTertiaryContainer = "#31111D",
            background = "#FFFBFE",
            onBackground = "#1C1B1F",
            surface = "#FFFBFE",
            onSurface = "#1C1B1F",
            surfaceVariant = "#E7E0EC",
            onSurfaceVariant = "#49454F",
            surfaceTint = "#6750A4",
            inverseSurface = "#313033",
            inverseOnSurface = "#F4EFF4",
            error = "#B3261E",
            onError = "#FFFFFF",
            errorContainer = "#F9DEDC",
            onErrorContainer = "#410E0B",
            outline = "#79747E",
            outlineVariant = "#CAC4D0",
            scrim = "#000000",
            surfaceBright = "#FFFBFE",
            surfaceDim = "#DED8E1",
            surfaceContainer = "#F3EDF7",
            surfaceContainerHigh = "#ECE6F0",
            surfaceContainerHighest = "#E6E0E9",
            surfaceContainerLow = "#F7F2FA",
            surfaceContainerLowest = "#FFFFFF",
        ),
        dark = Material3ColorScheme(
            primary = "#D0BCFF",
            onPrimary = "#381E72",
            primaryContainer = "#4F378B",
            onPrimaryContainer = "#EADDFF",
            inversePrimary = "#6750A4",
            secondary = "#CCC2DC",
            onSecondary = "#332D41",
            secondaryContainer = "#4A4458",
            onSecondaryContainer = "#E8DEF8",
            tertiary = "#EFB8C8",
            onTertiary = "#492532",
            tertiaryContainer = "#633B48",
            onTertiaryContainer = "#FFD8E4",
            background = "#1C1B1F",
            onBackground = "#E6E1E5",
            surface = "#1C1B1F",
            onSurface = "#E6E1E5",
            surfaceVariant = "#49454F",
            onSurfaceVariant = "#CAC4D0",
            surfaceTint = "#D0BCFF",
            inverseSurface = "#E6E1E5",
            inverseOnSurface = "#313033",
            error = "#F2B8B5",
            onError = "#601410",
            errorContainer = "#8C1D18",
            onErrorContainer = "#F9DEDC",
            outline = "#938F99",
            outlineVariant = "#49454F",
            scrim = "#000000",
            surfaceBright = "#3B383E",
            surfaceDim = "#141218",
            surfaceContainer = "#211F26",
            surfaceContainerHigh = "#2B2930",
            surfaceContainerHighest = "#36343B",
            surfaceContainerLow = "#1D1B20",
            surfaceContainerLowest = "#0F0D13",
        ),
    ),
    uiBehavior = UiBehavior(
        borderRadiusDp = 16,
        animationSpeed = "normal",
        contrastLevel = "normal",
        elevationStyle = "shadowed",
    ),
    biInsights = BiInsights(
        personaLabel = "Default",
        confidenceScore = 0.0,
        traits = emptyList(),
        mutationReason = "Developer-supplied default palette — no questionnaire has been submitted yet.",
    ),
    generatedAt = "2026-01-01T00:00:00.000Z",
)
