package com.colortouch.sampleapp

import android.content.Context
import com.colortouch.sdk.model.QuestionsData
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

/**
 * Loads the bundled questions.json asset (src/main/assets/questions.json —
 * a copy of server/src/data/questions.json; nothing keeps these two files in
 * sync automatically, since the app and server are separately deployed
 * artifacts with no shared filesystem at runtime).
 */
object QuestionsRepository {
    private val json = Json { ignoreUnknownKeys = true }

    fun loadQuestions(context: Context): QuestionsData {
        val jsonText = context.assets.open("questions.json").bufferedReader().use { it.readText() }
        return json.decodeFromString(jsonText)
    }
}
