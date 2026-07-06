package com.colortouch.sdk.network

import com.colortouch.sdk.model.PaletteResponse
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * One answered question: question_id must be a known id from
 * server/src/data/questions.json (com.colortouch.sdk.model.Question / the
 * bundled questions.json asset), answer_value is one of that question's
 * option strings verbatim — there's no separate option code.
 */
@Serializable
data class QuestionResponse(
    @SerialName("question_id") val questionId: String,
    @SerialName("answer_value") val answerValue: String,
)

/**
 * End user's in-app questionnaire responses — mirrors
 * server/src/schemas/userAnswers.schema.json field-for-field. Note the mixed
 * casing: this nested object is snake_case (it's validated by ajv against
 * that schema), but the enclosing [PersonalizedPaletteRequest]'s own fields
 * are camelCase — that split is real, not a typo, and matches
 * server/src/api/routes/personalization.routes.ts.
 *
 * The server requires all 5 core-question ids to be present in [responses]
 * (validated server-side, not by this class) — deep-dive questions are
 * optional and may be a subset.
 */
@Serializable
data class UserAnswers(
    @SerialName("user_id") val userId: String,
    @SerialName("responses") val responses: List<QuestionResponse>,
)

/**
 * Request body for POST /personalized-palette. developerId/userId are
 * camelCase at this level — only the nested userAnswers object is snake_case.
 */
@Serializable
data class PersonalizedPaletteRequest(
    @SerialName("developerId") val developerId: String,
    @SerialName("userId") val userId: String,
    @SerialName("userAnswers") val userAnswers: UserAnswers,
)

/**
 * Shape of every non-2xx response from the ColorTouch API
 * (see personalization.controller.ts's catch block: 404/503/500 all return
 * this same { error, message } shape).
 */
@Serializable
data class ApiErrorBody(
    @SerialName("error") val error: String,
    @SerialName("message") val message: String,
)

interface ColorTouchApi {
    /**
     * Returns 200 + PaletteResponse on success.
     * Returns 400 (bad request shape), 404 (no BasePalette yet for this
     * developer — onboarding hasn't run), 503 (AI generation failed —
     * safe to retry, or fall back to a bundled default palette), or
     * 500 (server-side bug) with an [ApiErrorBody] — inspect
     * [retrofit2.Response.isSuccessful] and [retrofit2.Response.code]
     * rather than relying on an exception being thrown.
     */
    @POST("personalized-palette")
    suspend fun getPersonalizedPalette(
        @Body request: PersonalizedPaletteRequest,
    ): Response<PaletteResponse>
}
