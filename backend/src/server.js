require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');  // ✅ nouveau
const leadRoutes = require('./routes/leadsRoutes');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
connectDB();

app.use('/api/auth',  authRoutes);
app.use('/api/users', userRoutes);  // ✅ plus de doublon
app.use('/api/leads', leadRoutes);

app.get('/', (_req, res) => res.send('CRM API Running...'));
app.use((err, _req, res, _next) => {
  console.error('🔥', err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));