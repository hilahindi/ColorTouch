plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.colortouch.sampleapp"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.colortouch.sampleapp"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
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
}

dependencies {
    // The SDK this app demonstrates.
    implementation(project(":colortouch-sdk"))

    // colortouch-sdk depends on these too, but only as `implementation` (not
    // `api`), so they aren't exposed transitively — MainActivity.kt calls
    // kotlinx.coroutines.launch, and QuestionsRepository.kt calls
    // kotlinx.serialization.json.Json directly, both need their own classpath.
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.1")

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.activity:activity-compose:1.9.2")

    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // Crossfade (animation) and Animatable/tween (animation-core) aren't
    // guaranteed transitively via material3/ui — declared directly rather
    // than assumed, same reasoning as the coroutines/serialization deps above.
    implementation("androidx.compose.animation:animation")
    implementation("androidx.compose.animation:animation-core")

    // -extended (not -core): CheckCircle/Notifications aren't in the smaller
    // curated core icon set, only Home/Settings reliably are. Extended is a
    // much bigger artifact (thousands of vector icons) — fine for a demo app,
    // worth trimming to specific icons or a custom icon set for production.
    implementation("androidx.compose.material:material-icons-extended")
}
