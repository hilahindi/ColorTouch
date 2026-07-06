package com.colortouch.sdk

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.colortouch.sdk.model.PaletteResponse
import kotlinx.coroutines.flow.first
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.colorTouchDataStore by preferencesDataStore(name = "colortouch_sdk_prefs")

private val PERSONALIZED_PALETTE_KEY = stringPreferencesKey("personalized_palette_json")

/**
 * Persists the last-fetched PersonalizedPalette to disk so it survives
 * process death. The developer's default palette (see
 * ColorTouchClient.setDefaultPalette) is deliberately NOT persisted here —
 * it's supplied fresh by the app on every launch, the same way
 * QuestionsRepository re-reads its bundled asset every time.
 */
internal class PaletteStorage(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun loadPersonalizedPalette(): PaletteResponse? {
        val prefs = context.colorTouchDataStore.data.first()
        val stored = prefs[PERSONALIZED_PALETTE_KEY] ?: return null
        return runCatching { json.decodeFromString<PaletteResponse>(stored) }.getOrNull()
    }

    suspend fun savePersonalizedPalette(palette: PaletteResponse) {
        context.colorTouchDataStore.edit { prefs ->
            prefs[PERSONALIZED_PALETTE_KEY] = json.encodeToString(palette)
        }
    }

    suspend fun clearPersonalizedPalette() {
        context.colorTouchDataStore.edit { prefs -> prefs.remove(PERSONALIZED_PALETTE_KEY) }
    }
}
