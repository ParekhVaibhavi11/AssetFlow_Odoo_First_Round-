const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { query } = require('./db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Mount API routes
app.use('/api/auth', require('./routes/auth'));

app.use('/api/assets', require('./routes/assets'));

app.use('/api/dashboard', require('./routes/dashboard'));

// 1. Database Connection & System Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    // Ping the PostgreSQL database
    const dbResult = await query('SELECT NOW() as current_time');
    
    res.status(200).json({
      status: 'healthy',
      message: 'AssetFlow Backend API is running.',
      database: {
        connected: true,
        currentTime: dbResult.rows[0].current_time
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Health Check Database Connection Failure:', error.message);
    res.status(500).json({
      status: 'unhealthy',
      message: 'AssetFlow Backend API is running, but database connection failed.',
      database: {
        connected: false,
        error: error.message
      },
      timestamp: new Date()
    });
  }
});

// Default Root Route
app.get('/', (req, res) => {
  res.send('AssetFlow API Server is running. Access endpoints via /api/...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🏥 Health check endpoint available at http://localhost:${PORT}/api/health`);
});

module.exports = app;
