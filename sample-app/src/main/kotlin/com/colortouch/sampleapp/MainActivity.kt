package com.colortouch.sampleapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FabPosition
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
private const val DEMO_DEVELOPER_ID = "faf06954-d9cb-4c66-a664-5de881a7b7bf"

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

        // Upgrades the hardcoded DEMO_DEFAULT_PALETTE above to this
        // developer's actual generated BasePalette once fetched, so the
        // app's very first run reflects the colors chosen in the dashboard
        // instead of a generic Material3 baseline — then keeps re-fetching
        // every 5s so a developer regenerating their base colors in the
        // dashboard shows up here live, without relaunching the app. No-ops
        // per tick (keeps whatever default is already showing) if onboarding
        // hasn't run yet or the server is unreachable.
        ColorTouchClient.startDefaultPalettePolling(DEMO_DEVELOPER_ID)

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

    // Sourced from the SDK, not local state — ColorTouchClient owns the
    // saved-personalized-vs-default fallback logic and updates this
    // reactively (fetch success, or resetToDefault()).
    val currentPalette by ColorTouchClient.currentPalette.collectAsState()

    var showQuestionnaire by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // In-memory only (lost on process death) — fine for a demo app; a real
    // app would persist this alongside (or instead of) the SDK's own
    // saved-personalized-palette storage.
    var favoriteRecipeIds by remember { mutableStateOf(setOf<String>()) }
    var selectedRecipeId by remember { mutableStateOf<String?>(null) }

    MainAppShell(
        palette = currentPalette,
        favoriteRecipeIds = favoriteRecipeIds,
        onToggleFavorite = { id ->
            favoriteRecipeIds = if (id in favoriteRecipeIds) {
                favoriteRecipeIds - id
            } else {
                favoriteRecipeIds + id
            }
        },
        selectedRecipeId = selectedRecipeId,
        onSelectRecipe = { id -> selectedRecipeId = id },
        onBackFromRecipe = { selectedRecipeId = null },
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
                    // A fresh id per submission, not one stable id per app
                    // session: the server caches PersonalizedPalette results
                    // by userId indefinitely (no cache_control.ttl_seconds is
                    // set), so reusing one id across resubmits would just
                    // replay the first result even after changing answers.
                    // Fine for this demo/testing app — a real integrator
                    // should keep one stable id per actual end user instead.
                    val submissionUserId = UUID.randomUUID().toString()
                    when (val result = fetchPersonalizedPalette(submissionUserId, responses)) {
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
    DemoTab("Recipes", Icons.Filled.Home, Icons.Outlined.Home),
    DemoTab("Favorites", Icons.Filled.Favorite, Icons.Outlined.FavoriteBorder),
    DemoTab("Settings", Icons.Filled.Settings, Icons.Outlined.Settings),
)

/**
 * The recipe-app shell: MediumTopAppBar + NavigationBar + a palette FAB,
 * entirely themed from [palette] (or Material3's own baseline colors when
 * null, i.e. before the first fetch and before any default was registered).
 * [Crossfade] gives a smooth cross-dissolve whenever the color scheme
 * changes instead of an instant cut, and the FAB gets a one-shot scale
 * "pulse" the moment a new palette lands.
 *
 * When [selectedRecipeId] is set, this replaces the tabbed content entirely
 * with a full-screen [RecipeDetailScreen] (own back button, no bottom nav/
 * FAB) rather than nesting it inside a tab — that's the standard pattern for
 * a recipe detail view, and keeps the system back button meaningful (see the
 * [BackHandler] below) instead of fighting a tab-based back stack.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainAppShell(
    palette: PaletteResponse?,
    favoriteRecipeIds: Set<String>,
    onToggleFavorite: (String) -> Unit,
    selectedRecipeId: String?,
    onSelectRecipe: (String) -> Unit,
    onBackFromRecipe: () -> Unit,
    onFabClick: () -> Unit,
    onResetToDefault: () -> Unit,
) {
    val useDarkTheme = isSystemInDarkTheme()
    val colorScheme = remember(palette, useDarkTheme) {
        palette?.colors?.toComposeColorScheme(useDarkTheme)
            ?: if (useDarkTheme) darkColorScheme() else lightColorScheme()
    }

    var selectedTab by remember { mutableStateOf(0) }

    val fabScale = remember { Animatable(1f) }
    LaunchedEffect(palette?.paletteId) {
        if (palette != null) {
            fabScale.animateTo(1.25f, animationSpec = tween(150))
            fabScale.animateTo(1f, animationSpec = tween(150))
        }
    }

    BackHandler(enabled = selectedRecipeId != null) { onBackFromRecipe() }

    Crossfade(targetState = colorScheme, label = "palette-color-transition") { animatedColorScheme ->
        MaterialTheme(colorScheme = animatedColorScheme) {
            val selectedRecipe = selectedRecipeId?.let { id -> SAMPLE_RECIPES.find { it.id == id } }

            if (selectedRecipe != null) {
                RecipeDetailScreen(
                    recipe = selectedRecipe,
                    isFavorite = selectedRecipe.id in favoriteRecipeIds,
                    onToggleFavorite = { onToggleFavorite(selectedRecipe.id) },
                    onBack = onBackFromRecipe,
                )
            } else {
                Scaffold(
                    topBar = {
                        CenterAlignedTopAppBar(
                            title = {
                                Text(
                                    "ColorTouch Recipes",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                            },
                            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                titleContentColor = MaterialTheme.colorScheme.onPrimary,
                            ),
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
                            0 -> RecipesScreen(
                                favoriteRecipeIds = favoriteRecipeIds,
                                onToggleFavorite = onToggleFavorite,
                                onSelectRecipe = onSelectRecipe,
                            )
                            1 -> FavoritesScreen(
                                favoriteRecipeIds = favoriteRecipeIds,
                                onToggleFavorite = onToggleFavorite,
                                onSelectRecipe = onSelectRecipe,
                            )
                            else -> SettingsScreen(onResetToDefault = onResetToDefault)
                        }
                    }
                }
            }
        }
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

        Column(
            modifier = Modifier.padding(top = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Filled.Info,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f),
            )
            Text(
                modifier = Modifier.padding(top = 8.dp),
                text = "ColorTouch Recipes · Demo v1.0",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
            )
            Text(
                modifier = Modifier.padding(top = 2.dp),
                text = "Every color on screen is generated by the ColorTouch SDK.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                textAlign = TextAlign.Center,
            )
        }
    }
}
