const express = require('express');
const { all, get, run } = require('../db');
const { validateRecipe, recipeFields } = require('../recipeValidation');

const router = express.Router();

router.get('/recipes', (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  const cat = (req.query.category || '').trim();

  const rows = all(`SELECT * FROM recipes WHERE (title LIKE ? OR ingredients LIKE ?)
    AND (? = '' OR category = ?) ORDER BY id DESC`, [q, q, cat, cat]);

  res.json(rows);
});

router.get('/stats', (req, res) => {
  const totals = get(`SELECT COUNT(*) AS recipes, COALESCE(SUM(favorite),0) AS favorites,
    COALESCE(ROUND(AVG(prep_minutes+bake_minutes)),0) AS avg_minutes FROM recipes`);
  const byCategory = all('SELECT category, COUNT(*) AS count FROM recipes GROUP BY category ORDER BY count DESC');
  const quickest = get('SELECT title, prep_minutes+bake_minutes AS minutes FROM recipes ORDER BY minutes ASC LIMIT 1');

  res.json({ ...totals, byCategory, quickest: quickest || null });
});

router.post('/recipes', (req, res) => {
  const { value, error } = validateRecipe(req.body);
  if (error) return res.status(400).json({ error });

  const result = run(`INSERT INTO recipes (title,category,difficulty,prep_minutes,bake_minutes,oven_temp,servings,ingredients,instructions,image_url)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, recipeFields(value));

  return res.status(201).json(get('SELECT * FROM recipes WHERE id = ?', [result.id]));
});

router.put('/recipes/:id', (req, res) => {
  const { value, error } = validateRecipe(req.body);
  if (error) return res.status(400).json({ error });

  const result = run(`UPDATE recipes SET title=?, category=?, difficulty=?, prep_minutes=?, bake_minutes=?, oven_temp=?,
    servings=?, ingredients=?, instructions=?, image_url=? WHERE id=?`, [...recipeFields(value), Number(req.params.id)]);

  if (!result.changes) return res.status(404).json({ error: 'Recipe not found.' });

  return res.json(get('SELECT * FROM recipes WHERE id = ?', [Number(req.params.id)]));
});

router.patch('/recipes/:id/favorite', (req, res) => {
  const result = run('UPDATE recipes SET favorite = 1 - favorite WHERE id = ?', [Number(req.params.id)]);
  if (!result.changes) return res.status(404).json({ error: 'Recipe not found.' });

  return res.json(get('SELECT * FROM recipes WHERE id = ?', [Number(req.params.id)]));
});

router.delete('/recipes/:id', (req, res) => {
  const result = run('DELETE FROM recipes WHERE id = ?', [Number(req.params.id)]);
  if (!result.changes) return res.status(404).json({ error: 'Recipe not found.' });

  return res.status(204).end();
});

module.exports = router;
