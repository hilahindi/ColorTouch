// Root build file. Declares plugin versions once (apply false) so
// colortouch-sdk/ and sample-app/ can apply them without repeating versions —
// keeps both modules guaranteed to use the same Kotlin/AGP/Compose-compiler
// version, which is a common source of build breakage when they drift.
plugins {
    id("com.android.application") version "8.13.2" apply false
    id("com.android.library") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21" apply false
    // Compose compiler is a separate Gradle plugin as of Kotlin 2.0+, and its
    // version must exactly match the Kotlin version above.
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
