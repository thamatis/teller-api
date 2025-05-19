const express = require('express');
const app = express();
const transactionRoutes = require('./routes/transactionRoutes');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middlewares/errorHandler');

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/transaction', transactionRoutes);
app.use(errorHandler);

module.exports = app;
