require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { connectDB } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadsRoutes');
const app = express();


// Middleware
app.use(cors({origin: 'http://localhost:5173',credentials: true}));
app.use(express.json());

// MongoDB Connection
connectDB();

//////////////////////////////////////////////////////
// ✅ ROUTES
//////////////////////////////////////////////////////
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); 
app.use('/api/leads', leadRoutes);



app.get('/', (req, res) => {
  res.send('CRM API Running...');
});
// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
