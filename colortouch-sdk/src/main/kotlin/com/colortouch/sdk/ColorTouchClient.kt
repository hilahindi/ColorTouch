package com.colortouch.sdk

import android.content.Context
import com.colortouch.sdk.ColorTouchClient.currentPalette
import com.colortouch.sdk.ColorTouchClient.getPersonalizedPalette
import com.colortouch.sdk.ColorTouchClient.initialize
import com.colortouch.sdk.ColorTouchClient.resetToDefault
import com.colortouch.sdk.ColorTouchClient.setDefaultPalette
import com.colortouch.sdk.model.PaletteResponse
import com.colortouch.sdk.network.ApiErrorBody
import com.colortouch.sdk.network.ColorTouchApi
import com.colortouch.sdk.network.PersonalizedPaletteRequest
import com.colortouch.sdk.network.UserAnswers
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.io.IOException

/**
 * Entry point for the ColorTouch SDK. Call [initialize] once — typically from
 * Application.onCreate() — before calling [getPersonalizedPalette].
 *
 * This is a singleton `object` (global mutable state) rather than an
 * injectable class, matching how most consumer-facing Android SDKs
 * (Firebase, Stripe, etc.) are shaped: callers configure it once at process
 * start and use it from anywhere without wiring a DI graph. The tradeoff is
 * that it's harder to swap/mock in tests than a Hilt/Koin-provided instance —
 * if that matters for your app, wrap calls to it behind your own interface.
 */
object ColorTouchClient {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    @Volatile
    private var api: ColorTouchApi? = null

    private var storage: PaletteStorage? = null
    private var defaultPalette: PaletteResponse? = null

    // This object is a process-wide singleton, not a Composable or an
    // Activity — it owns its own coroutine scope rather than borrowing one
    // that could be cancelled out from under it (e.g. a screen's scope).
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _currentPalette = MutableStateFlow<PaletteResponse?>(null)

    /**
     * The palette the UI should currently render: a saved personalized
     * palette if one exists on disk, otherwise the developer's
     * [setDefaultPalette], otherwise null (nothing fetched yet, no default
     * registered). Updates automatically on [getPersonalizedPalette] success
     * and on [resetToDefault] — collect it (e.g. via `collectAsState()`)
     * instead of tracking your own local "current palette" state.
     */
    val currentPalette: StateFlow<PaletteResponse?> = _currentPalette.asStateFlow()

    /**
     * @param context Any Context — converted to the application context
     *   immediately, so passing an Activity is safe and won't leak it.
     * @param baseUrl e.g. "http://10.0.2.2:3000/" (Android emulator's alias
     *   for the host machine's localhost) or your deployed server's URL.
     *   Must end with a trailing slash — Retrofit throws otherwise.
     * @param apiKey Sent as `Authorization: Bearer <apiKey>` on every
     *   request if provided. The server does not currently enforce any
     *   auth check — this is forward-looking plumbing, safe to omit for now.
     * @param enableLogging Logs full request/response bodies via OkHttp's
     *   HttpLoggingInterceptor. Leave false in release builds — it logs
     *   response bodies in full, which may include user data.
     */
    fun initialize(
        context: Context,
        baseUrl: String,
        apiKey: String? = null,
        enableLogging: Boolean = false,
    ) {
        val appContext = context.applicationContext
        storage = PaletteStorage(appContext)

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (enableLogging) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val okHttpClient = OkHttpClient.Builder()
            .apply {
                if (apiKey != null) {
                    addInterceptor { chain ->
                        val authed = chain.request().newBuilder()
                            .addHeader("Authorization", "Bearer $apiKey")
                            .build()
                        chain.proceed(authed)
                    }
                }
            }
            .addInterceptor(loggingInterceptor)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(
                json.asConverterFactory("application/json".toMediaType()),
            )
            .build()

        api = retrofit.create(ColorTouchApi::class.java)

        // Fallback resolution: saved personalized palette wins if present,
        // otherwise fall back to whatever setDefaultPalette() has (or will —
        // see setDefaultPalette()'s own null-check for the reverse call order).
        scope.launch {
            val saved = storage?.loadPersonalizedPalette()
            _currentPalette.value = saved ?: defaultPalette
        }
    }

    /**
     * Registers the developer's fallback palette — e.g. one baked into the
     * app as a JSON asset (the same way QuestionsRepository bundles
     * questions.json), or the real one fetched via [fetchDefaultPalette].
     * Safe to call multiple times, e.g. a hardcoded bundled palette first for
     * an instant startup default, then the developer's real BasePalette once
     * fetched — the second call upgrades [currentPalette] in place instead of
     * being ignored, as long as a saved personalized palette hasn't since
     * taken over. Never clobbers a saved personalized palette.
     */
    fun setDefaultPalette(palette: PaletteResponse) {
        val previousDefault = defaultPalette
        defaultPalette = palette
        if (_currentPalette.value == null || _currentPalette.value === previousDefault) {
            _currentPalette.value = palette
        }
    }

    private suspend fun fetchDefaultPaletteOnce(developerId: String) {
        val api = api ?: return
        try {
            val response = api.getDefaultPalette(developerId)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                setDefaultPalette(body)
            }
        } catch (e: IOException) {
            // Network error — keep whatever default is already showing.
        }
    }

    /**
     * Fetches this developerId's actual generated BasePalette from the
     * server and registers it via [setDefaultPalette] — upgrading whatever
     * fallback (e.g. a hardcoded bundled palette) was set synchronously at
     * startup to the developer's real colors, without clobbering a saved
     * personalized palette. Call once, typically right after [initialize].
     * Runs on the client's own scope, so it's safe to call from a non-suspend
     * context (e.g. Application.onCreate()). Silently no-ops on failure
     * (network error, or onboarding hasn't run yet for this developer) —
     * whatever default is already showing keeps showing.
     *
     * A single call only reflects whatever the developer's BasePalette was
     * at that moment — see [startDefaultPalettePolling] to keep picking up
     * changes (e.g. the developer re-generating their base colors in the
     * dashboard) for as long as the app stays open.
     */
    fun fetchDefaultPalette(developerId: String) {
        scope.launch { fetchDefaultPaletteOnce(developerId) }
    }

    /**
     * Like [fetchDefaultPalette], but keeps re-fetching every [intervalMs]
     * for as long as the returned [Job] is active, so a developer changing
     * their base colors in the dashboard shows up here without needing to
     * relaunch the app. There's no push/websocket channel from the server —
     * this is deliberately simple polling, so [intervalMs] trades off
     * "how quickly a color change is noticed" against request volume; 5s is
     * a reasonable default for a dev-facing demo, not tuned for production
     * traffic. Each tick is exactly [fetchDefaultPalette]'s logic (never
     * clobbers a saved personalized palette), just repeated. Cancel the
     * returned Job to stop polling — otherwise it runs for the process's
     * lifetime, same as the rest of this singleton's state.
     */
    fun startDefaultPalettePolling(developerId: String, intervalMs: Long = 5_000L): Job {
        return scope.launch {
            while (isActive) {
                fetchDefaultPaletteOnce(developerId)
                delay(intervalMs)
            }
        }
    }

    /**
     * Clears the saved personalized palette and reverts [currentPalette] to
     * the developer's default (or null, if [setDefaultPalette] was never
     * called).
     */
    suspend fun resetToDefault() {
        storage?.clearPersonalizedPalette()
        _currentPalette.value = defaultPalette
    }

    /**
     * Requests a personalized palette for [userId], scoped to [developerId]'s
     * base palette. Never throws — inspect the returned [ColorTouchResult].
     * On success, persists the result and updates [currentPalette]
     * automatically.
     */
    suspend fun getPersonalizedPalette(
        developerId: String,
        userId: String,
        userAnswers: UserAnswers,
    ): ColorTouchResult<PaletteResponse> {
        val api = api
            ?: error(
                "ColorTouchClient.initialize(context, baseUrl, ...) must be " +
                    "called before getPersonalizedPalette() — call it once " +
                    "from Application.onCreate().",
            )

        return try {
            val response = api.getPersonalizedPalette(
                PersonalizedPaletteRequest(
                    developerId = developerId,
                    userId = userId,
                    userAnswers = userAnswers,
                ),
            )

            val body = response.body()
            if (response.isSuccessful && body != null) {
                storage?.savePersonalizedPalette(body)
                _currentPalette.value = body
                ColorTouchResult.Success(body)
            } else {
                val parsed = response.errorBody()?.string()?.let {
                    runCatching { json.decodeFromString<ApiErrorBody>(it) }.getOrNull()
                }
                ColorTouchResult.ApiError(
                    code = response.code(),
                    error = parsed?.error ?: "UnknownError",
                    message = parsed?.message ?: "Request failed with status ${response.code()}",
                )
            }
        } catch (e: IOException) {
            ColorTouchResult.NetworkError(e)
        }
    }
}
