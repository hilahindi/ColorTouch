package com.colortouch.sdk

/**
 * Wraps every ColorTouchClient call so the specific, meaningful HTTP status
 * codes the server returns (see personalization.controller.ts) reach the
 * caller as data instead of as thrown exceptions to catch by type.
 */
sealed class ColorTouchResult<out T> {
    data class Success<T>(val data: T) : ColorTouchResult<T>()

    /**
     * A well-formed error response from the server. [code] tells you which
     * one: 404 = no BasePalette yet for this developer (onboarding hasn't
     * run), 503 = AI generation failed — transient, safe to retry or fall
     * back to a bundled default palette, 400/500 = bad request or server bug.
     */
    data class ApiError(val code: Int, val error: String, val message: String) :
        ColorTouchResult<Nothing>()

    /** No HTTP response at all — offline, timeout, DNS failure, etc. */
    data class NetworkError(val cause: Throwable) : ColorTouchResult<Nothing>()
}
