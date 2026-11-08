const app = require('./src/app');
const { initializeDatabase } = require('./src/db');

const PORT = process.env.PORT || 4000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Bakebook running at http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error('Failed to start Bakebook:', error);
    process.exit(1);
  });
