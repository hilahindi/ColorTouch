plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.plugin.compose")
    id("maven-publish")
}

// Semantic Versioning (semver.org): MAJOR.MINOR.PATCH. Bump MAJOR for
// breaking public-API changes, MINOR for backwards-compatible additions,
// PATCH for backwards-compatible fixes. Consumers (sample-app, Jitpack
// releases) reference this via a git tag of the same value — see the
// project's Jitpack setup notes for the tag-per-release convention.
version = "0.1.0"

android {
    namespace = "com.colortouch.sdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        // No targetSdk on a library module — the consuming app's applies.
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    // Exposes the "release" AAR variant (plus a sources jar) as a Maven
    // publication below — required for Jitpack, which builds whatever
    // `publishToMavenLocal`-style publication it finds for the tag it's
    // asked to build.
    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
}

// Jitpack invokes its own equivalent of `./gradlew publishToMavenLocal` against
// a pushed git tag, so groupId/artifactId/version here only need to be valid
// Maven coordinates — Jitpack ignores them and derives the actual consumer
// coordinate from the GitHub path instead (com.github.hilahindi:ColorTouch,
// module colortouch-sdk, version = the tag name). See ../JITPACK.md.
afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])
                groupId = "com.github.hilahindi"
                artifactId = "colortouch-sdk"
                version = project.version.toString()
            }
        }
    }
}

dependencies {
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // JSON — kotlinx.serialization, wired into Retrofit via the converter below
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.1")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")

    // Coroutines — Retrofit's `suspend fun` support needs this on the classpath
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")

    // Compose — only for ColorSchemeMapper.kt's hex-string -> ColorScheme
    // conversion. Consumers not using Compose still pay for this transitively;
    // if that becomes a real complaint, split it into a separate
    // colortouch-sdk-compose module instead.
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-graphics")

    // PaletteStorage.kt — persists the last-fetched PersonalizedPalette so
    // it survives process death (the fallback mechanism's "saved" branch).
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
}
