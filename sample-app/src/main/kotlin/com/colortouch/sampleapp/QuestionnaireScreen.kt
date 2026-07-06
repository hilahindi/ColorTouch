package com.colortouch.sampleapp

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.colortouch.sdk.model.Question
import com.colortouch.sdk.model.QuestionsData
import com.colortouch.sdk.network.QuestionResponse
import kotlinx.coroutines.launch

private sealed class WizardPage {
    data class QuestionPage(val question: Question) : WizardPage()
    data object DeepDivePrompt : WizardPage()
}

private fun buildPages(questions: QuestionsData, deepDiveStarted: Boolean): List<WizardPage> {
    val core = questions.coreQuestions.map { WizardPage.QuestionPage(it) }
    return if (deepDiveStarted) {
        core + questions.deepDiveQuestions.map { WizardPage.QuestionPage(it) }
    } else {
        core + WizardPage.DeepDivePrompt
    }
}

/**
 * The questionnaire as a full-height ModalBottomSheet: one question per
 * page (5 mandatory, then an optional "continue?" prompt into 10 more),
 * with a progress bar, back/close navigation, and a sliding transition
 * between pages via [AnimatedContent].
 *
 * Content is entirely Hebrew, so the sheet's content is wrapped in an RTL
 * layout direction — English-language SDK consumers building their own
 * localized question set would drop this wrapper. One consequence: the
 * TopAppBar's navigation icon ends up on the right (RTL "start"), not the
 * left — the more correct place for it given the content, even though a
 * literal left placement was the original ask.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuestionnaireBottomSheet(
    questions: QuestionsData,
    isSubmitting: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onSubmit: (List<QuestionResponse>) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val coroutineScope = rememberCoroutineScope()

    fun dismiss() {
        coroutineScope.launch { sheetState.hide() }.invokeOnCompletion {
            if (!sheetState.isVisible) onDismiss()
        }
    }

    var answers by remember { mutableStateOf(mapOf<String, String>()) }
    var deepDiveStarted by remember { mutableStateOf(false) }
    var stepIndex by remember { mutableStateOf(0) }

    val pages = remember(deepDiveStarted) { buildPages(questions, deepDiveStarted) }
    val safeIndex = stepIndex.coerceIn(0, pages.lastIndex)
    val currentPage = pages[safeIndex]
    val isLastPage = safeIndex == pages.lastIndex
    val canGoBack = safeIndex > 0

    val canAdvance = when (currentPage) {
        is WizardPage.QuestionPage -> {
            val isCoreQuestion = questions.coreQuestions.any { it.id == currentPage.question.id }
            !isCoreQuestion || answers.containsKey(currentPage.question.id)
        }
        WizardPage.DeepDivePrompt -> true
    }

    fun submit() {
        onSubmit(answers.map { (id, value) -> QuestionResponse(id, value) })
    }

    ModalBottomSheet(
        onDismissRequest = { if (!isSubmitting) dismiss() },
        sheetState = sheetState,
    ) {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            Column(modifier = Modifier.fillMaxHeight(0.92f)) {
                TopAppBar(
                    title = {},
                    navigationIcon = {
                        IconButton(onClick = { if (!isSubmitting) if (canGoBack) stepIndex-- else dismiss() }) {
                            Icon(
                                imageVector = if (canGoBack) Icons.AutoMirrored.Filled.ArrowBack else Icons.Filled.Close,
                                contentDescription = if (canGoBack) "חזרה" else "סגירה",
                            )
                        }
                    },
                )

                LinearProgressIndicator(
                    progress = { (safeIndex + 1f) / pages.size },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                )

                Box(modifier = Modifier.weight(1f)) {
                    AnimatedContent(
                        targetState = safeIndex,
                        transitionSpec = {
                            if (targetState > initialState) {
                                (slideInHorizontally(tween(250)) { width -> width } + fadeIn())
                                    .togetherWith(slideOutHorizontally(tween(250)) { width -> -width } + fadeOut())
                            } else {
                                (slideInHorizontally(tween(250)) { width -> -width } + fadeIn())
                                    .togetherWith(slideOutHorizontally(tween(250)) { width -> width } + fadeOut())
                            }
                        },
                        label = "question-step-transition",
                    ) { index ->
                        when (val page = pages[index]) {
                            is WizardPage.QuestionPage -> QuestionPageContent(
                                question = page.question,
                                selectedAnswer = answers[page.question.id],
                                onSelect = { value -> answers = answers + (page.question.id to value) },
                            )
                            WizardPage.DeepDivePrompt -> DeepDivePromptContent(
                                onContinue = { deepDiveStarted = true },
                                onSkip = ::submit,
                            )
                        }
                    }

                    if (isSubmitting) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.3f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                }

                errorMessage?.let { message ->
                    Text(
                        text = message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                    )
                }

                if (currentPage is WizardPage.QuestionPage) {
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        enabled = canAdvance && !isSubmitting,
                        onClick = { if (isLastPage) submit() else stepIndex++ },
                    ) {
                        Text(if (isLastPage) "שליחה" else "הבא")
                    }
                }
            }
        }
    }
}

@Composable
private fun QuestionPageContent(
    question: Question,
    selectedAnswer: String?,
    onSelect: (String) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        Text(
            text = question.text,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(24.dp))

        question.options.forEach { option ->
            val selected = selectedAnswer == option
            Surface(
                onClick = { onSelect(option) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                color = if (selected) {
                    MaterialTheme.colorScheme.primaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                },
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = selected, onClick = { onSelect(option) })
                    Text(
                        text = option,
                        modifier = Modifier.padding(start = 8.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
    }
}

@Composable
private fun DeepDivePromptContent(onContinue: () -> Unit, onSkip: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "רוצה פלטה מדויקת יותר?",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
        Text(
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
            text = "10 שאלות נוספות (רשות) יעזרו ל-AI לדייק את הפלטה שלך",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )
        Button(modifier = Modifier.fillMaxWidth(), onClick = onContinue) {
            Text("המשך ל-10 שאלות נוספות")
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(modifier = Modifier.fillMaxWidth(), onClick = onSkip) {
            Text("דלג וקבל את הפלטה שלי")
        }
    }
}
