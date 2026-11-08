const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function validateRecipe(input = {}) {
  const value = {
    title: String(input.title || '').trim(),
    category: String(input.category || '').trim(),
    difficulty: input.difficulty,
    prep_minutes: Number(input.prep_minutes),
    bake_minutes: Number(input.bake_minutes),
    oven_temp: Number(input.oven_temp),
    servings: Number(input.servings),
    ingredients: String(input.ingredients || '').trim(),
    instructions: String(input.instructions || '').trim(),
    image_url: String(input.image_url || '').trim(),
  };

  if (!value.title || !value.category || !value.ingredients || !value.instructions) {
    return { error: 'Title, category, ingredients and instructions are required.' };
  }

  if (!DIFFICULTIES.includes(value.difficulty)) {
    return { error: 'Difficulty must be Easy, Medium or Hard.' };
  }

  for (const key of ['prep_minutes', 'bake_minutes', 'oven_temp']) {
    if (!Number.isInteger(value[key]) || value[key] < 0) {
      return { error: 'Times and temperature must be whole numbers, 0 or more.' };
    }
  }

  if (!Number.isInteger(value.servings) || value.servings < 1) {
    return { error: 'Servings must be at least 1.' };
  }

  if (value.image_url) {
    try {
      const imageUrl = new URL(value.image_url);
      if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new Error('Unsupported protocol');
    } catch {
      return { error: 'Image URL must be a valid HTTP or HTTPS URL.' };
    }
  }

  return { value };
}

function recipeFields(value) {
  return [
    value.title,
    value.category,
    value.difficulty,
    value.prep_minutes,
    value.bake_minutes,
    value.oven_temp,
    value.servings,
    value.ingredients,
    value.instructions,
    value.image_url,
  ];
}

module.exports = {
  DIFFICULTIES,
  validateRecipe,
  recipeFields,
};
