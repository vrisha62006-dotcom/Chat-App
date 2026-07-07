const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const roomsRoutes = require('./routes/rooms.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/users', usersRoutes);

// Base route for sanity check
app.get('/', (req, res) => {
  res.json({ message: 'ChatConnect API is active' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
