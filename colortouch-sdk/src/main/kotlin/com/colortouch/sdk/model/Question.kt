package com.colortouch.sdk.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Mirrors one entry in server/src/data/questions.json. There's no separate
 * option code/id — the option string itself is both what's displayed and
 * what gets sent back as answer_value, since most options are full Hebrew
 * sentences with no natural short code.
 */
@Serializable
data class Question(
    val id: String,
    val text: String,
    val options: List<String>,
)

/**
 * The full questionnaire: 5 mandatory core questions + 10 optional deep-dive
 * questions. Matches server/src/data/questions.json's top-level shape
 * exactly — keep both in sync if the question set changes.
 */
@Serializable
data class QuestionsData(
    @SerialName("core_questions") val coreQuestions: List<Question>,
    @SerialName("deep_dive_questions") val deepDiveQuestions: List<Question>,
)
