package com.colortouch.sampleapp

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BakeryDining
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Icecream
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.LocalDining
import androidx.compose.material.icons.filled.LocalPizza
import androidx.compose.material.icons.filled.RamenDining
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * A recipe in this demo's bundled catalog — no images (no image-loading
 * library or bundled photo assets in this project), so each card/header uses
 * an icon on a theme-colored block instead. That's a deliberate fit for a
 * ColorTouch demo anyway: the block color is what's actually being
 * personalized — a real photo would visually compete with it.
 */
data class Recipe(
    val id: String,
    val title: String,
    val category: String,
    val cookTimeMinutes: Int,
    val difficulty: String,
    val servings: Int,
    val icon: ImageVector,
    val description: String,
    val ingredients: List<String>,
    val steps: List<String>,
)

val SAMPLE_RECIPES = listOf(
    Recipe(
        id = "tomato-pasta",
        title = "Creamy Tomato Pasta",
        category = "Italian",
        cookTimeMinutes = 25,
        difficulty = "Easy",
        servings = 2,
        icon = Icons.Filled.Restaurant,
        description = "A weeknight classic: a rich tomato-cream sauce clinging to al dente pasta, ready before you'd finish scrolling for takeout.",
        ingredients = listOf(
            "200g pasta (penne or rigatoni)",
            "1 cup crushed tomatoes",
            "1/2 cup heavy cream",
            "2 cloves garlic, minced",
            "1/4 cup grated parmesan",
            "Fresh basil, to taste",
        ),
        steps = listOf(
            "Boil pasta in salted water until al dente; reserve 1/2 cup pasta water.",
            "Sauté garlic in olive oil until fragrant, about 1 minute.",
            "Add crushed tomatoes, simmer 8 minutes, then stir in the cream.",
            "Toss in the pasta, loosening the sauce with pasta water as needed.",
            "Finish with parmesan and torn basil.",
        ),
    ),
    Recipe(
        id = "greek-salad",
        title = "Classic Greek Salad",
        category = "Mediterranean",
        cookTimeMinutes = 15,
        difficulty = "Easy",
        servings = 4,
        icon = Icons.Filled.LocalDining,
        description = "Crisp, briny, and no-cook — cucumber, tomato, olives, and feta dressed simply so the vegetables do the talking.",
        ingredients = listOf(
            "3 tomatoes, cut into wedges",
            "1 cucumber, sliced",
            "1/2 red onion, thinly sliced",
            "1/2 cup kalamata olives",
            "200g feta, in slabs",
            "Olive oil, oregano, salt",
        ),
        steps = listOf(
            "Combine tomatoes, cucumber, onion, and olives in a bowl.",
            "Top with feta slabs rather than crumbling for a classic look.",
            "Drizzle generously with olive oil and a pinch of oregano.",
            "Serve immediately with crusty bread.",
        ),
    ),
    Recipe(
        id = "chicken-tacos",
        title = "Spicy Chicken Tacos",
        category = "Mexican",
        cookTimeMinutes = 30,
        difficulty = "Medium",
        servings = 3,
        icon = Icons.Filled.Fastfood,
        description = "Charred, spice-rubbed chicken folded into warm tortillas with a bright, punchy salsa — built for a bit of heat.",
        ingredients = listOf(
            "500g chicken thighs, diced",
            "2 tbsp chili powder blend",
            "8 small corn tortillas",
            "1 lime",
            "1/2 cup pico de gallo",
            "Cilantro, to garnish",
        ),
        steps = listOf(
            "Toss chicken with the spice blend and let sit 10 minutes.",
            "Sear chicken over high heat until charred and cooked through.",
            "Warm the tortillas directly over a flame or in a dry pan.",
            "Fill tortillas with chicken, pico de gallo, and cilantro.",
            "Finish with a generous squeeze of lime.",
        ),
    ),
    Recipe(
        id = "margherita-pizza",
        title = "Margherita Pizza",
        category = "Italian",
        cookTimeMinutes = 40,
        difficulty = "Medium",
        servings = 2,
        icon = Icons.Filled.LocalPizza,
        description = "Simple to the point of strict: dough, tomato, mozzarella, basil. The hottest oven you have is the only real trick.",
        ingredients = listOf(
            "1 pizza dough ball",
            "1/3 cup crushed tomatoes",
            "125g fresh mozzarella, torn",
            "Fresh basil leaves",
            "Olive oil, salt",
        ),
        steps = listOf(
            "Preheat oven (and pizza stone, if using) as hot as it will go.",
            "Stretch the dough out on a floured surface.",
            "Spread crushed tomatoes thinly, leaving a bare crust edge.",
            "Scatter mozzarella and bake until the crust blisters and browns.",
            "Top with fresh basil and a drizzle of olive oil off the heat.",
        ),
    ),
    Recipe(
        id = "shoyu-ramen",
        title = "Shoyu Ramen",
        category = "Japanese",
        cookTimeMinutes = 45,
        difficulty = "Medium",
        servings = 2,
        icon = Icons.Filled.RamenDining,
        description = "A soy-forward broth, springy noodles, and a jammy soft-boiled egg — comfort food that rewards a little patience.",
        ingredients = listOf(
            "2 portions fresh ramen noodles",
            "4 cups chicken or vegetable stock",
            "3 tbsp soy sauce",
            "1 tbsp mirin",
            "2 soft-boiled eggs",
            "Scallions, nori, to garnish",
        ),
        steps = listOf(
            "Simmer stock with soy sauce and mirin for 15 minutes.",
            "Soft-boil the eggs (6.5 minutes), then cool and halve them.",
            "Cook the noodles separately until just tender.",
            "Divide noodles into bowls and ladle the hot broth over them.",
            "Top with egg, scallions, and nori.",
        ),
    ),
    Recipe(
        id = "blueberry-pancakes",
        title = "Fluffy Blueberry Pancakes",
        category = "Breakfast",
        cookTimeMinutes = 20,
        difficulty = "Easy",
        servings = 3,
        icon = Icons.Filled.BakeryDining,
        description = "Thick, tender pancakes studded with blueberries — a weekend-morning staple that comes together in one bowl.",
        ingredients = listOf(
            "1 1/2 cups flour",
            "1 tbsp baking powder",
            "1 1/4 cups milk",
            "1 egg",
            "2 tbsp melted butter",
            "1 cup blueberries",
        ),
        steps = listOf(
            "Whisk the dry ingredients together in a large bowl.",
            "Whisk in milk, egg, and melted butter until just combined.",
            "Fold in the blueberries — don't overmix.",
            "Cook on a hot, greased griddle until bubbles form, then flip.",
            "Serve warm with maple syrup.",
        ),
    ),
    Recipe(
        id = "vanilla-ice-cream",
        title = "Homemade Vanilla Ice Cream",
        category = "Dessert",
        cookTimeMinutes = 30,
        difficulty = "Hard",
        servings = 6,
        icon = Icons.Filled.Icecream,
        description = "No-churn-friendly but best with a machine — a custard base that sets rich, smooth, and properly scoopable.",
        ingredients = listOf(
            "2 cups heavy cream",
            "1 cup whole milk",
            "3/4 cup sugar",
            "5 egg yolks",
            "1 vanilla bean (or 2 tsp extract)",
        ),
        steps = listOf(
            "Heat cream, milk, and half the sugar with the scraped vanilla bean.",
            "Whisk yolks with remaining sugar, then temper with the hot cream.",
            "Cook the custard gently until it coats the back of a spoon.",
            "Chill the custard completely, ideally overnight.",
            "Churn in an ice cream maker, then freeze until firm.",
        ),
    ),
    Recipe(
        id = "iced-caramel-latte",
        title = "Iced Caramel Latte",
        category = "Beverage",
        cookTimeMinutes = 5,
        difficulty = "Easy",
        servings = 1,
        icon = Icons.Filled.LocalCafe,
        description = "Espresso, cold milk, and a caramel swirl — the five-minute drink that makes the rest of the recipes feel ambitious.",
        ingredients = listOf(
            "2 shots espresso",
            "1 cup cold milk",
            "2 tbsp caramel sauce",
            "Ice cubes",
        ),
        steps = listOf(
            "Swirl caramel sauce around the inside of a glass.",
            "Fill the glass with ice cubes.",
            "Pour in the cold milk.",
            "Top with freshly pulled espresso shots and stir gently.",
        ),
    ),
)

/** Deterministic per-recipe theme-container color, so a given recipe always
 * looks the same shade whether it's shown in the full list or a filtered
 * favorites list — driven by the current palette, not a hardcoded color. */
@Composable
private fun recipeContainerColor(recipe: Recipe): Color = when (recipe.id.hashCode().mod(3)) {
    0 -> MaterialTheme.colorScheme.primaryContainer
    1 -> MaterialTheme.colorScheme.secondaryContainer
    else -> MaterialTheme.colorScheme.tertiaryContainer
}

@Composable
private fun recipeOnContainerColor(recipe: Recipe): Color = when (recipe.id.hashCode().mod(3)) {
    0 -> MaterialTheme.colorScheme.onPrimaryContainer
    1 -> MaterialTheme.colorScheme.onSecondaryContainer
    else -> MaterialTheme.colorScheme.onTertiaryContainer
}

@Composable
private fun RecipeGridCard(
    recipe: Recipe,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onClick: () -> Unit,
) {
    val containerColor = recipeContainerColor(recipe)
    val onContainerColor = recipeOnContainerColor(recipe)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
        onClick = onClick,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1.6f)
                .background(containerColor),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = recipe.icon,
                contentDescription = null,
                tint = onContainerColor,
                modifier = Modifier.size(40.dp),
            )
        }
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    text = recipe.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onToggleFavorite, modifier = Modifier.size(28.dp)) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = if (isFavorite) "Remove from favorites" else "Add to favorites",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
            Text(
                text = "${recipe.category} · ${recipe.cookTimeMinutes} min · ${recipe.difficulty}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        }
    }
}

@Composable
fun RecipesScreen(
    favoriteRecipeIds: Set<String>,
    onToggleFavorite: (String) -> Unit,
    onSelectRecipe: (String) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(
                text = "Today's Recipes",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 96.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(SAMPLE_RECIPES, key = { it.id }) { recipe ->
                RecipeGridCard(
                    recipe = recipe,
                    isFavorite = recipe.id in favoriteRecipeIds,
                    onToggleFavorite = { onToggleFavorite(recipe.id) },
                    onClick = { onSelectRecipe(recipe.id) },
                )
            }
        }
    }
}

@Composable
fun FavoritesScreen(
    favoriteRecipeIds: Set<String>,
    onToggleFavorite: (String) -> Unit,
    onSelectRecipe: (String) -> Unit,
) {
    val favorites = SAMPLE_RECIPES.filter { it.id in favoriteRecipeIds }

    if (favorites.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(
                modifier = Modifier.padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    imageVector = Icons.Outlined.FavoriteBorder,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f),
                )
                Text(
                    modifier = Modifier.padding(top = 16.dp),
                    text = "No favorites yet",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    modifier = Modifier.padding(top = 4.dp),
                    text = "Tap the heart on any recipe to save it here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                )
            }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "Favorites",
            modifier = Modifier.padding(24.dp),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 96.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(favorites, key = { it.id }) { recipe ->
                RecipeGridCard(
                    recipe = recipe,
                    isFavorite = true,
                    onToggleFavorite = { onToggleFavorite(recipe.id) },
                    onClick = { onSelectRecipe(recipe.id) },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeDetailScreen(
    recipe: Recipe,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
    onBack: () -> Unit,
) {
    val containerColor = recipeContainerColor(recipe)
    val onContainerColor = recipeOnContainerColor(recipe)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(recipe.title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onToggleFavorite) {
                        Icon(
                            imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = if (isFavorite) "Remove from favorites" else "Add to favorites",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f)
                    .background(containerColor),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = recipe.icon,
                    contentDescription = null,
                    tint = onContainerColor,
                    modifier = Modifier.size(72.dp),
                )
            }

            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    text = recipe.category,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
                    text = recipe.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f),
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    InfoStat(icon = Icons.Filled.Timer, label = "${recipe.cookTimeMinutes} min")
                    InfoStat(icon = Icons.Filled.Whatshot, label = recipe.difficulty)
                    InfoStat(icon = Icons.Filled.Groups, label = "${recipe.servings} servings")
                }

                Text(
                    modifier = Modifier.padding(top = 28.dp, bottom = 8.dp),
                    text = "Ingredients",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                recipe.ingredients.forEach { ingredient ->
                    Row(modifier = Modifier.padding(vertical = 4.dp)) {
                        Box(
                            modifier = Modifier
                                .padding(top = 8.dp, end = 12.dp)
                                .size(6.dp)
                                .background(color = MaterialTheme.colorScheme.primary, shape = CircleShape),
                        )
                        Text(text = ingredient, style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Text(
                    modifier = Modifier.padding(top = 28.dp, bottom = 8.dp),
                    text = "Steps",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                recipe.steps.forEachIndexed { index, step ->
                    Row(modifier = Modifier.padding(vertical = 6.dp)) {
                        Text(
                            text = "${index + 1}.",
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(end = 8.dp),
                        )
                        Text(text = step, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoStat(icon: ImageVector, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        Text(
            modifier = Modifier.padding(top = 4.dp),
            text = label,
            style = MaterialTheme.typography.bodySmall,
        )
    }
}
