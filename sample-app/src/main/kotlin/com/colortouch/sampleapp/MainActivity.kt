package com.colortouch.sampleapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Assignment
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FabPosition
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumTopAppBar
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.colortouch.sdk.ColorTouchClient
import com.colortouch.sdk.ColorTouchResult
import com.colortouch.sdk.model.PaletteResponse
import com.colortouch.sdk.network.QuestionResponse
import com.colortouch.sdk.network.UserAnswers
import com.colortouch.sdk.toComposeColorScheme
import java.util.UUID
import kotlinx.coroutines.launch

/**
 * A developerId that has already been onboarded on the server (via
 * POST /developer/onboarding) — this demo only fetches a personalized
 * palette, it doesn't run onboarding itself.
 */
private const val DEMO_DEVELOPER_ID = "11111111-1111-1111-1111-111111111111"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register the fallback before (or after — see setDefaultPalette's
        // own null-check) initialize() resolves saved-vs-default palette.
        ColorTouchClient.setDefaultPalette(DEMO_DEFAULT_PALETTE)

        // 10.0.2.2 is the Android emulator's alias for the host machine's
        // localhost, where `npm run dev` / `npm run dev:live` is listening.
        // A physical device needs your machine's real LAN IP instead.
        ColorTouchClient.initialize(
            context = this,
            baseUrl = "http://10.0.2.2:3000/",
            enableLogging = true,
        )

        setContent {
            MaterialTheme {
                ColorTouchDemoApp()
            }
        }
    }
}

@Composable
private fun ColorTouchDemoApp() {
    val context = LocalContext.current
    // Small bundled asset, fast enough to read inline — a larger question
    // set should move this to a LaunchedEffect/background dispatcher instead.
    val questions = remember { QuestionsRepository.loadQuestions(context) }
    val coroutineScope = rememberCoroutineScope()

    // One stable per-session user id, reused across resubmits so repeat
    // calls hit the same cached PersonalizedPalette server-side.
    val userId = remember { UUID.randomUUID().toString() }

    // Sourced from the SDK, not local state — ColorTouchClient owns the
    // saved-personalized-vs-default fallback logic and updates this
    // reactively (fetch success, or resetToDefault()).
    val currentPalette by ColorTouchClient.currentPalette.collectAsState()

    var showQuestionnaire by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    MainAppShell(
        palette = currentPalette,
        onFabClick = { showQuestionnaire = true },
        onResetToDefault = { coroutineScope.launch { ColorTouchClient.resetToDefault() } },
    )

    if (showQuestionnaire) {
        QuestionnaireBottomSheet(
            questions = questions,
            isSubmitting = isSubmitting,
            errorMessage = errorMessage,
            onDismiss = { showQuestionnaire = false },
            onSubmit = { responses ->
                errorMessage = null
                isSubmitting = true
                coroutineScope.launch {
                    when (val result = fetchPersonalizedPalette(userId, responses)) {
                        is ColorTouchResult.Success -> {
                            // currentPalette updates automatically via the
                            // SDK's StateFlow — no local assignment needed.
                            showQuestionnaire = false
                        }
                        is ColorTouchResult.ApiError ->
                            errorMessage = "Error ${result.code}: ${result.message}"
                        is ColorTouchResult.NetworkError ->
                            errorMessage = "Network error: ${result.cause.message}"
                    }
                    isSubmitting = false
                }
            },
        )
    }
}

private suspend fun fetchPersonalizedPalette(
    userId: String,
    responses: List<QuestionResponse>,
): ColorTouchResult<PaletteResponse> = ColorTouchClient.getPersonalizedPalette(
    developerId = DEMO_DEVELOPER_ID,
    userId = userId,
    userAnswers = UserAnswers(userId = userId, responses = responses),
)

private data class DemoTab(val label: String, val filledIcon: ImageVector, val outlinedIcon: ImageVector)

private val DEMO_TABS = listOf(
    DemoTab("Home", Icons.Filled.Home, Icons.Outlined.Home),
    DemoTab("Tasks", Icons.Filled.Assignment, Icons.Outlined.Assignment),
    DemoTab("Settings", Icons.Filled.Settings, Icons.Outlined.Settings),
)

/**
 * The productivity-app shell: MediumTopAppBar + NavigationBar + a palette
 * FAB, entirely themed from [palette] (or Material3's own baseline colors
 * when null, i.e. before the first fetch and before any default was
 * registered). [Crossfade] gives a smooth cross-dissolve whenever the color
 * scheme changes instead of an instant cut, and the FAB gets a one-shot
 * scale "pulse" the moment a new palette lands.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainAppShell(
    palette: PaletteResponse?,
    onFabClick: () -> Unit,
    onResetToDefault: () -> Unit,
) {
    val useDarkTheme = isSystemInDarkTheme()
    val colorScheme = remember(palette, useDarkTheme) {
        palette?.colors?.toComposeColorScheme(useDarkTheme)
            ?: if (useDarkTheme) darkColorScheme() else lightColorScheme()
    }

    var selectedTab by remember { mutableStateOf(0) }
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    val fabScale = remember { Animatable(1f) }
    LaunchedEffect(palette?.paletteId) {
        if (palette != null) {
            fabScale.animateTo(1.25f, animationSpec = tween(150))
            fabScale.animateTo(1f, animationSpec = tween(150))
        }
    }

    Crossfade(targetState = colorScheme, label = "palette-color-transition") { animatedColorScheme ->
        MaterialTheme(colorScheme = animatedColorScheme) {
            Scaffold(
                modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
                topBar = {
                    MediumTopAppBar(
                        title = {
                            Text("ColorTouch Demo", fontWeight = FontWeight.SemiBold)
                        },
                        colors = TopAppBarDefaults.mediumTopAppBarColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            titleContentColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                        scrollBehavior = scrollBehavior,
                    )
                },
                bottomBar = {
                    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                        DEMO_TABS.forEachIndexed { index, tab ->
                            val selected = selectedTab == index
                            NavigationBarItem(
                                selected = selected,
                                onClick = { selectedTab = index },
                                icon = {
                                    Icon(
                                        imageVector = if (selected) tab.filledIcon else tab.outlinedIcon,
                                        contentDescription = tab.label,
                                    )
                                },
                                label = { Text(tab.label) },
                            )
                        }
                    }
                },
                floatingActionButton = {
                    FloatingActionButton(
                        onClick = onFabClick,
                        modifier = Modifier.graphicsLayer(
                            scaleX = fabScale.value,
                            scaleY = fabScale.value,
                        ),
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ) {
                        Icon(Icons.Default.Palette, contentDescription = "Personalize palette")
                    }
                },
                floatingActionButtonPosition = FabPosition.End,
                containerColor = MaterialTheme.colorScheme.background,
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    when (selectedTab) {
                        0 -> HomeScreen(palette = palette)
                        1 -> DummyTabScreen(label = "Tasks")
                        else -> SettingsScreen(onResetToDefault = onResetToDefault)
                    }
                }
            }
        }
    }
}

private data class SampleCard(val icon: ImageVector, val title: String, val subtitle: String)

private val SAMPLE_CARDS = listOf(
    SampleCard(Icons.Filled.Assignment, "Finish onboarding flow", "3 tasks due today"),
    SampleCard(Icons.Filled.Star, "Review feedback", "2 new comments"),
    SampleCard(Icons.Filled.Notifications, "Team stand-up", "Starts in 30 minutes"),
)

@Composable
private fun HomeScreen(palette: PaletteResponse?) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
    ) {
        Text(
            text = "Welcome back!",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            modifier = Modifier.padding(top = 4.dp, bottom = 28.dp),
            text = palette?.let { "Personalized for: ${it.biInsights.personaLabel}" }
                ?: "Tap the palette button to personalize your experience",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
        )

        SAMPLE_CARDS.forEach { card ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                shape = RoundedCornerShape(24.dp),
                // Explicit even though these match Card's own defaults — the
                // point here is to make the surface/onSurface roles visible,
                // since that's exactly what this screen exists to demonstrate.
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = card.icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(modifier = Modifier.padding(start = 16.dp)) {
                        Text(
                            text = card.title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            modifier = Modifier.padding(top = 2.dp),
                            text = card.subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DummyTabScreen(label: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("$label (dummy tab)", style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun SettingsScreen(onResetToDefault: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Settings",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
            text = "Clear your saved personalized palette and revert to the developer's default.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )
        OutlinedButton(onClick = onResetToDefault) {
            Icon(Icons.Filled.RestartAlt, contentDescription = null)
            Text(modifier = Modifier.padding(start = 8.dp), text = "Reset to Default Palette")
        }
    }
}
