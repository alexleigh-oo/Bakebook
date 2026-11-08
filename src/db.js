const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, '..', 'bakebook.db');
let db = null;

function ensureDb() {
  if (!db) throw new Error('Database is not initialized');
}

function saveDb() {
  ensureDb();
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}

function all(sql, params = []) {
  ensureDb();
  const st = db.prepare(sql);
  st.bind(params);
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0];
}

function run(sql, params = []) {
  ensureDb();
  db.run(sql, params);
  const changes = db.getRowsModified();
  const id = get('SELECT last_insert_rowid() AS id').id;
  saveDb();
  return { changes, id };
}

function setupDatabase() {
  ensureDb();
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
      prep_minutes INTEGER NOT NULL CHECK (prep_minutes >= 0),
      bake_minutes INTEGER NOT NULL CHECK (bake_minutes >= 0),
      oven_temp INTEGER NOT NULL CHECK (oven_temp >= 0),
      servings INTEGER NOT NULL CHECK (servings > 0),
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`);

  const recipeColumns = all('PRAGMA table_info(recipes)');
  if (!recipeColumns.some((column) => column.name === 'image_url')) {
    db.run("ALTER TABLE recipes ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
  }

  if (get('SELECT COUNT(*) c FROM recipes').c === 0) {
    const seed = [
      ['Classic Banana Bread', 'Bread', 'Easy', 15, 55, 175, 10,
        '3 ripe bananas\n1/3 cup melted butter\n3/4 cup sugar\n1 egg\n1 tsp baking soda\n1 1/2 cups flour\nPinch of salt',
        'Mash bananas and mix with butter.\nStir in sugar, egg and baking soda.\nFold in flour and salt.\nPour into a loaf pan and bake until a toothpick comes out clean.', 1, '/images/banana-bread.jpg'],
      ['Chewy Chocolate Chip Cookies', 'Cookies', 'Easy', 20, 12, 180, 24,
        '1 cup butter\n3/4 cup brown sugar\n1/2 cup sugar\n2 eggs\n2 1/4 cups flour\n1 tsp baking soda\n2 cups chocolate chips',
        'Cream butter and sugars.\nBeat in eggs.\nMix in dry ingredients, then chips.\nScoop onto trays and bake until edges are golden.', 1, '/images/cookies.jpg'],
      ['Lemon Drizzle Cake', 'Cake', 'Medium', 25, 45, 170, 12,
        '200g butter\n200g sugar\n4 eggs\n200g self-raising flour\nZest of 2 lemons\nJuice of 2 lemons\n100g icing sugar',
        'Cream butter and sugar, beat in eggs.\nFold in flour and zest.\nBake in a lined tin.\nMix juice and icing sugar and pour over the warm cake.', 0, '/images/lemon-drizzle-cake.jpg'],
      ['Croissants', 'Pastry', 'Hard', 240, 20, 200, 8,
        '500g bread flour\n10g salt\n55g sugar\n10g yeast\n300ml cold milk\n280g cold butter block',
        'Make the dough and chill overnight.\nEnclose butter and complete three folds, chilling between each.\nRoll, cut and shape triangles.\nProof, egg wash and bake.', 0, '/images/pastry.jpg'],
    ];

    seed.forEach((recipe) => {
      db.run(`INSERT INTO recipes (title,category,difficulty,prep_minutes,bake_minutes,oven_temp,servings,ingredients,instructions,favorite,image_url)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`, recipe);
    });

    saveDb();
  }

  db.run(`UPDATE recipes SET image_url = CASE
    WHEN lower(title) LIKE '%banana%bread%' THEN '/images/banana-bread.jpg'
    WHEN lower(title) LIKE '%lemon%drizzle%' THEN '/images/lemon-drizzle-cake.jpg'
    WHEN image_url = '/images/bread.svg' THEN '/images/bread.jpg'
    WHEN image_url = '/images/cookies.svg' THEN '/images/cookies.jpg'
    WHEN image_url = '/images/cake.svg' THEN '/images/cake.jpg'
    WHEN image_url = '/images/pastry.svg' THEN '/images/pastry.jpg'
    WHEN category = 'Bread' THEN '/images/bread.jpg'
    WHEN category = 'Cookies' THEN '/images/cookies.jpg'
    WHEN category = 'Pastry' THEN '/images/pastry.jpg'
    ELSE '/images/cake.jpg'
  END WHERE image_url = '' OR image_url LIKE '/images/%.svg'
    OR (lower(title) LIKE '%banana%bread%' AND image_url = '/images/bread.jpg')
    OR (lower(title) LIKE '%lemon%drizzle%' AND image_url = '/images/cake.jpg')`);
  saveDb();
}

async function initializeDatabase() {
  if (db) return db;

  const SQL = await initSqlJs();
  db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  setupDatabase();
  return db;
}

module.exports = {
  DB_FILE,
  initializeDatabase,
  saveDb,
  all,
  get,
  run,
  getDb: () => db,
};
