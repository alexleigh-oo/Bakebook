# Bakebook

A pastel recipe dashboard for saving, searching, and managing baking recipes. Built with Express and SQLite using `sql.js` (SQLite compiled to WebAssembly).

## Features

- Dashboard summary with recipe, favorite, and baking-time totals
- Category chart, search, and category filter
- Add, view, edit, favorite, and delete recipes
- Recipe-specific photos, with support for custom image URLs
- Persistent local SQLite database, created and seeded on first run

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```powershell
npm install
npm start
```

Open [http://localhost:4000](http://localhost:4000). Keep the terminal open while using the app; press `Ctrl+C` to stop it.

If port 4000 is already in use, stop the other Bakebook process or choose another port:

```powershell
$env:PORT = 4001
npm start
```

## Publish on GitHub Pages

The `Deploy GitHub Pages` workflow publishes the static dashboard from `public/` whenever you push to `main` or `master`. In your GitHub repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. The workflow will provide the published URL after its first successful run.

GitHub Pages does not run the Express/SQLite API. The published dashboard uses the included sample recipes and saves edits, favorites, and new recipes in each visitor's browser storage. These changes are not shared with other visitors or with the local SQLite database. Running `npm start` continues to use the Express API and its persistent database.

The database is stored as `bakebook.db` in the project root and is intentionally excluded from Git. It will be created and seeded with four sample recipes when the app first starts. Each local checkout gets its own database.

## Project layout

```text
bakebook/
├── .github/workflows/ci.yml  # checks on pushes and pull requests
├── .github/workflows/pages.yml # publishes the static dashboard to GitHub Pages
├── public/
│   ├── recipes.json          # sample data for static hosting
│   ├── images/               # bundled recipe photos
│   ├── app.js                # browser-side dashboard behavior
│   ├── index.html
│   └── styles.css
├── src/
│   ├── routes/recipes.js     # recipe and stats API
│   ├── app.js                # Express app
│   ├── db.js                 # database setup and helpers
│   └── recipeValidation.js
├── server.js                 # application entry point
├── package-lock.json
└── package.json
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/recipes?q=&category=` | List, search, and filter recipes |
| `POST` | `/api/recipes` | Create a recipe |
| `PUT` | `/api/recipes/:id` | Update a recipe |
| `PATCH` | `/api/recipes/:id/favorite` | Toggle a recipe favorite |
| `DELETE` | `/api/recipes/:id` | Delete a recipe |
| `GET` | `/api/stats` | Get dashboard totals and category counts |

## Recipe photo credits

Photos are bundled under `public/images/` so the sample dashboard does not depend on a third-party image host at runtime.

- `bread.jpg`, `cake.jpg`, `cookies.jpg`, and `pastry.jpg`: Unsplash; see the [Unsplash license](https://unsplash.com/license).
- `banana-bread.jpg`: Shisma, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Banana_bread_unsliced.jpg), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- `lemon-drizzle-cake.jpg`: Kolforn, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:-2010-01-31_Lemon_drizzel_cake,_Trimingham,_Norfolk_(1).JPG), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Checks

```powershell
npm run check
npm audit
```

GitHub Actions runs these syntax checks and the dependency audit for pushes and pull requests.

## License

The Bakebook code is available under the [MIT License](./LICENSE). This applies to the project code, not the bundled photos, which retain their separate licenses and attributions listed above.
