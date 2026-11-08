const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lines = t => t.split('\n').map(s => s.trim()).filter(Boolean);
let recipes = [];
const colorOf = name => 'c' + ([...name].reduce((h, ch) => h + ch.charCodeAt(0), 0) % 5);
const assetUrl = value => {
  const url = String(value || '');
  return /^(https?:|data:|blob:)/i.test(url)
    ? url
    : new URL(url.replace(/^\/+/, ''), document.baseURI).href;
};
const imageFor = (category, title) => {
  const key = String(category || '').toLowerCase();
  const name = String(title || '').toLowerCase();
  if (name.includes('banana bread')) return 'images/banana-bread.jpg';
  if (name.includes('lemon drizzle')) return 'images/lemon-drizzle-cake.jpg';
  if (key.includes('bread')) return 'images/bread.jpg';
  if (key.includes('cookie')) return 'images/cookies.jpg';
  if (key.includes('pastry') || key.includes('croissant')) return 'images/pastry.jpg';
  return 'images/cake.jpg';
};
let editingId = null;
let staticMode = false;
let localRecipes = [];

async function api(url, opts) {
  if (staticMode) return localApi(url, opts);
  const r = await fetch(url, opts && { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function saveLocalRecipes() {
  localStorage.setItem('bakebook-recipes', JSON.stringify(localRecipes));
}

function localApi(url, opts = {}) {
  const request = new URL(url, location.href);
  const method = opts.method || 'GET';
  const path = request.pathname.replace(/\/+$/, '');

  if (method === 'GET' && path.endsWith('/api/stats')) {
    const categories = new Map();
    let totalMinutes = 0;
    let favorites = 0;
    let quickest = null;

    localRecipes.forEach(recipe => {
      const minutes = Number(recipe.prep_minutes) + Number(recipe.bake_minutes);
      totalMinutes += minutes;
      favorites += Number(recipe.favorite);
      categories.set(recipe.category, (categories.get(recipe.category) || 0) + 1);
      if (!quickest || minutes < quickest.minutes) quickest = { title: recipe.title, minutes };
    });

    return {
      recipes: localRecipes.length,
      favorites,
      avg_minutes: localRecipes.length ? Math.round(totalMinutes / localRecipes.length) : 0,
      byCategory: [...categories].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      quickest,
    };
  }

  if (method === 'GET' && path.endsWith('/api/recipes')) {
    const query = (request.searchParams.get('q') || '').toLowerCase();
    const category = request.searchParams.get('category') || '';
    return localRecipes
      .filter(recipe => (!category || recipe.category === category)
        && (!query || `${recipe.title}\n${recipe.ingredients}`.toLowerCase().includes(query)))
      .sort((a, b) => b.id - a.id);
  }

  if (method === 'POST' && path.endsWith('/api/recipes')) {
    const recipe = { ...JSON.parse(opts.body), id: Math.max(0, ...localRecipes.map(item => item.id)) + 1, favorite: 0 };
    ['prep_minutes', 'bake_minutes', 'oven_temp', 'servings'].forEach(key => { recipe[key] = Number(recipe[key]); });
    localRecipes.push(recipe);
    saveLocalRecipes();
    return recipe;
  }

  const match = path.match(/\/api\/recipes\/(\d+)(?:\/(favorite))?$/);
  if (match) {
    const id = Number(match[1]);
    const index = localRecipes.findIndex(recipe => recipe.id === id);
    if (index < 0) throw new Error('Recipe not found.');

    if (method === 'PUT' && !match[2]) {
      localRecipes[index] = { ...JSON.parse(opts.body), id, favorite: localRecipes[index].favorite };
      ['prep_minutes', 'bake_minutes', 'oven_temp', 'servings'].forEach(key => { localRecipes[index][key] = Number(localRecipes[index][key]); });
      saveLocalRecipes();
      return localRecipes[index];
    }

    if (method === 'PATCH' && match[2]) {
      localRecipes[index].favorite = localRecipes[index].favorite ? 0 : 1;
      saveLocalRecipes();
      return localRecipes[index];
    }

    if (method === 'DELETE' && !match[2]) {
      localRecipes.splice(index, 1);
      saveLocalRecipes();
      return null;
    }
  }

  throw new Error('Request failed');
}

async function loadStaticRecipes() {
  staticMode = true;
  $('storageNote').hidden = false;
  const saved = localStorage.getItem('bakebook-recipes');
  if (saved !== null) {
    localRecipes = JSON.parse(saved);
  } else {
    const seedResponse = await fetch('recipes.json');
    if (!seedResponse.ok) throw new Error('Could not load the sample recipes.');
    localRecipes = await seedResponse.json();
  }
}

async function initialize() {
  if (location.hostname.endsWith('.github.io')) {
    await loadStaticRecipes();
  } else {
    const response = await fetch('api/stats');
    if (response.status === 404) {
      await loadStaticRecipes();
    } else if (!response.ok) {
      throw new Error(`Could not connect to the recipe server (${response.status}).`);
    }
  }
  await refresh();
}

async function loadStats() {
  const s = await api('/api/stats');
  $('stats').innerHTML = `
    <div class="stat stat-pink"><span class="stat-icon" aria-hidden="true">♡</span><span>Recipes saved</span><strong>${s.recipes}</strong><small>little joys in your collection</small></div>
    <div class="stat stat-green"><span class="stat-icon" aria-hidden="true">✿</span><span>Favorites</span><strong>${s.favorites}</strong><small>the ones you love most</small></div>
    <div class="stat stat-blue"><span class="stat-icon" aria-hidden="true">◷</span><span>Average total time</span><strong>${s.avg_minutes}<small> min</small></strong><small>from prep to oven-fresh</small></div>
    <div class="stat stat-peach"><span class="stat-icon" aria-hidden="true">⚡</span><span>Quickest bake</span><strong>${s.quickest ? s.quickest.minutes : '–'}<small>${s.quickest ? ' min' : ''}</small></strong><small>${s.quickest ? esc(s.quickest.title) : 'ready when you are'}</small></div>`;
  const max = Math.max(1, ...s.byCategory.map(c => c.count));
  $('chart').innerHTML = s.byCategory.length ? s.byCategory.map(c =>
    `<div class="bar ${colorOf(c.category)}"><span>${esc(c.category)}</span><i><em style="width:${(c.count / max * 100).toFixed(1)}%"></em></i><b>${c.count}</b></div>`).join('')
    : '<div class="empty">Your first delicious idea is waiting.</div>';
  const cur = $('catFilter').value;
  $('catFilter').innerHTML = '<option value="">All categories</option>' +
    s.byCategory.map(c => `<option>${esc(c.category)}</option>`).join('');
  $('catFilter').value = s.byCategory.some(c => c.category === cur) ? cur : '';
}

async function loadRecipes() {
  const qs = new URLSearchParams({ q: $('search').value, category: $('catFilter').value });
  recipes = await api('/api/recipes?' + qs);
  $('empty').hidden = recipes.length > 0;
  $('recipeCount').textContent = `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`;
  $('grid').innerHTML = recipes.map(r => `
    <article class="card ${colorOf(r.category)}">
      <div class="card-image"><img src="${esc(assetUrl(r.image_url || imageFor(r.category, r.title)))}" data-fallback="${esc(assetUrl(imageFor(r.category, r.title)))}" alt="${esc(r.title)}" loading="lazy"><span class="image-label">${esc(r.category)}</span>
        <button class="star ${r.favorite ? 'on' : ''}" data-fav="${r.id}" aria-label="Toggle favorite" aria-pressed="${!!r.favorite}">${r.favorite ? '★' : '♡'}</button></div>
      <div class="card-copy"><div class="top"><h3>${esc(r.title)}</h3></div>
      <div class="meta"><span class="pill">${esc(r.difficulty)}</span><span class="pill time-pill">◷ ${r.prep_minutes + r.bake_minutes} min</span></div>
      <div class="facts">Prep ${r.prep_minutes} min <span>·</span> Bake ${r.bake_minutes} min <span>·</span> ${r.oven_temp}°C <span>·</span> Serves ${r.servings}</div>
      <div class="actions">
        <button class="view-button" data-view="${r.id}">View recipe <span aria-hidden="true">→</span></button>
        <div><button data-edit="${r.id}" aria-label="Edit ${esc(r.title)}">Edit</button><button class="danger" data-del="${r.id}" aria-label="Delete ${esc(r.title)}">Delete</button></div></div></div>
    </article>`).join('');
}
const refresh = () => Promise.all([loadStats(), loadRecipes()]);

function openForm(r) {
  editingId = r ? r.id : null;
  $('dlgTitle').textContent = r ? 'Edit recipe' : 'Add recipe';
  $('f-title').value = r ? r.title : '';
  $('f-cat').value = r ? r.category : '';
  $('f-diff').value = r ? r.difficulty : 'Easy';
  $('f-prep').value = r ? r.prep_minutes : '';
  $('f-bake').value = r ? r.bake_minutes : '';
  $('f-temp').value = r ? r.oven_temp : '';
  $('f-serv').value = r ? r.servings : '';
  $('f-image').value = r && r.image_url && /^https?:\/\//i.test(r.image_url) ? r.image_url : '';
  $('f-ing').value = r ? r.ingredients : '';
  $('f-ins').value = r ? r.instructions : '';
  $('err').textContent = '';
  $('dlg').showModal();
  $('f-title').focus();
}

function showRecipe(r) {
  $('viewBody').innerHTML = `
    <img class="detail-image" src="${esc(assetUrl(r.image_url || imageFor(r.category, r.title)))}" data-fallback="${esc(assetUrl(imageFor(r.category, r.title)))}" alt="${esc(r.title)}">
    <p class="eyebrow">From your baking shelf</p>
    <h2>${esc(r.title)}</h2>
    <div class="facts">${esc(r.category)} · ${r.difficulty} · Prep ${r.prep_minutes} min · Bake ${r.bake_minutes} min at ${r.oven_temp}°C · Serves ${r.servings}</div>
    <h4>Ingredients</h4><ul>${lines(r.ingredients).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <h4>Instructions</h4><ol>${lines(r.instructions).map(i => `<li>${esc(i)}</li>`).join('')}</ol>`;
  $('view').showModal();
}

$('addBtn').onclick = () => openForm(null);
$('welcomeAdd').onclick = () => openForm(null);
$('cancel').onclick = () => $('dlg').close();
$('closeView').onclick = () => $('view').close();
$('search').oninput = loadRecipes;
$('catFilter').onchange = loadRecipes;

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const body = JSON.stringify({
    title: $('f-title').value, category: $('f-cat').value, difficulty: $('f-diff').value,
    prep_minutes: $('f-prep').value, bake_minutes: $('f-bake').value, oven_temp: $('f-temp').value,
    servings: $('f-serv').value, image_url: $('f-image').value,
    ingredients: $('f-ing').value, instructions: $('f-ins').value,
  });
  try {
    await api(editingId ? `/api/recipes/${editingId}` : '/api/recipes', { method: editingId ? 'PUT' : 'POST', body });
    $('dlg').close();
    refresh().catch(error => {
      $('appError').textContent = error.message;
      $('appError').hidden = false;
    });
  } catch (err) { $('err').textContent = err.message; }
});

$('grid').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const find = id => recipes.find(r => r.id === Number(id));
  if (b.dataset.view) return showRecipe(find(b.dataset.view));
  if (b.dataset.edit) return openForm(find(b.dataset.edit));
  if (b.dataset.fav) { await api(`/api/recipes/${b.dataset.fav}/favorite`, { method: 'PATCH', body: '{}' }); return refresh(); }
  if (b.dataset.del) {
    const r = find(b.dataset.del);
    if (confirm(`Delete "${r.title}"? This can't be undone.`)) { await api(`/api/recipes/${r.id}`, { method: 'DELETE' }); refresh(); }
  }
});

document.addEventListener('error', e => {
  const image = e.target;
  if (image instanceof HTMLImageElement && image.dataset.fallback && image.src !== new URL(image.dataset.fallback, location.href).href) {
    image.src = image.dataset.fallback;
  }
}, true);

initialize().catch(error => {
  $('appError').textContent = error.message;
  $('appError').hidden = false;
});
