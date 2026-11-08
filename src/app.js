const express = require('express');
const path = require('path');
const recipesRouter = require('./routes/recipes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', recipesRouter);

module.exports = app;
