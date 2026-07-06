package com.colortouch.sdk.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Maps 1:1 to the JSON returned by POST /personalized-palette on the
 * ColorTouch server (see server/src/types/personalizedPalette.types.ts and
 * server/src/schemas/personalizedPalette.schema.json — this is the source of
 * truth; keep this file in sync with it).
 */
@Serializable
data class PaletteResponse(
    @SerialName("schema_version") val schemaVersion: String,
    @SerialName("palette_id") val paletteId: String,
    @SerialName("base_palette_id") val basePaletteId: String,
    @SerialName("base_palette_version") val basePaletteVersion: Int,
    @SerialName("user_id") val userId: String,
    @SerialName("colors") val colors: ColorModes,
    @SerialName("ui_behavior") val uiBehavior: UiBehavior,
    @SerialName("bi_insights") val biInsights: BiInsights,
    @SerialName("generated_at") val generatedAt: String,
    @SerialName("cache_control") val cacheControl: CacheControl? = null,
)

@Serializable
data class ColorModes(
    @SerialName("light") val light: Material3ColorScheme,
    @SerialName("dark") val dark: Material3ColorScheme,
)

/**
 * Field-for-field mirror of androidx.compose.material3.ColorScheme, matching
 * the server's Material3ColorScheme. Every value is a "#RRGGBB" hex string —
 * convert with androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(hex))
 * at the call site, not here, so this stays a pure wire-format model.
 */
@Serializable
data class Material3ColorScheme(
    @SerialName("primary") val primary: String,
    @SerialName("onPrimary") val onPrimary: String,
    @SerialName("primaryContainer") val primaryContainer: String,
    @SerialName("onPrimaryContainer") val onPrimaryContainer: String,
    @SerialName("inversePrimary") val inversePrimary: String,
    @SerialName("secondary") val secondary: String,
    @SerialName("onSecondary") val onSecondary: String,
    @SerialName("secondaryContainer") val secondaryContainer: String,
    @SerialName("onSecondaryContainer") val onSecondaryContainer: String,
    @SerialName("tertiary") val tertiary: String,
    @SerialName("onTertiary") val onTertiary: String,
    @SerialName("tertiaryContainer") val tertiaryContainer: String,
    @SerialName("onTertiaryContainer") val onTertiaryContainer: String,
    @SerialName("background") val background: String,
    @SerialName("onBackground") val onBackground: String,
    @SerialName("surface") val surface: String,
    @SerialName("onSurface") val onSurface: String,
    @SerialName("surfaceVariant") val surfaceVariant: String,
    @SerialName("onSurfaceVariant") val onSurfaceVariant: String,
    @SerialName("surfaceTint") val surfaceTint: String,
    @SerialName("inverseSurface") val inverseSurface: String,
    @SerialName("inverseOnSurface") val inverseOnSurface: String,
    @SerialName("error") val error: String,
    @SerialName("onError") val onError: String,
    @SerialName("errorContainer") val errorContainer: String,
    @SerialName("onErrorContainer") val onErrorContainer: String,
    @SerialName("outline") val outline: String,
    @SerialName("outlineVariant") val outlineVariant: String,
    @SerialName("scrim") val scrim: String,
    @SerialName("surfaceBright") val surfaceBright: String,
    @SerialName("surfaceDim") val surfaceDim: String,
    @SerialName("surfaceContainer") val surfaceContainer: String,
    @SerialName("surfaceContainerHigh") val surfaceContainerHigh: String,
    @SerialName("surfaceContainerHighest") val surfaceContainerHighest: String,
    @SerialName("surfaceContainerLow") val surfaceContainerLow: String,
    @SerialName("surfaceContainerLowest") val surfaceContainerLowest: String,
)

@Serializable
data class UiBehavior(
    @SerialName("border_radius_dp") val borderRadiusDp: Int,
    // "slow" | "normal" | "fast" | "reduced_motion"
    @SerialName("animation_speed") val animationSpeed: String,
    // "low" | "normal" | "high"
    @SerialName("contrast_level") val contrastLevel: String,
    // "flat" | "shadowed"
    @SerialName("elevation_style") val elevationStyle: String,
)

@Serializable
data class BiInsights(
    @SerialName("persona_label") val personaLabel: String,
    @SerialName("confidence_score") val confidenceScore: Double,
    @SerialName("traits") val traits: List<String>,
    @SerialName("mutation_reason") val mutationReason: String,
    @SerialName("segment") val segment: String? = null,
)

@Serializable
data class CacheControl(
    @SerialName("ttl_seconds") val ttlSeconds: Int? = null,
)
