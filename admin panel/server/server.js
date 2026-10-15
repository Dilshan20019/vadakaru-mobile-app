// Fix local ISP DNS timeout for MongoDB Atlas shard hostnames
const { setupDnsFallback } = require('./dns-resolver');
setupDnsFallback();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Auto-load backend/src/.env so it ALWAYS uses the exact same database configuration as the app backend
const backendEnvPath = path.resolve(__dirname, '../../backend/src/.env');
require('dotenv').config({ path: backendEnvPath });
// Fallback to local .env if needed
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Job = require('./models/Job');
const User = require('./models/User');

const app = express();
const PORT = process.env.ADMIN_PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for visibility
app.use((req, res, next) => {
  console.log(`[Admin Server] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/listings - Get all job listings with employer info populated
app.get('/api/listings', async (req, res) => {
  try {
    const { employerId } = req.query;
    const filter = {};
    if (employerId && mongoose.Types.ObjectId.isValid(employerId)) {
      filter.employer = employerId;
    }

    const listings = await Job.find(filter)
      .populate('employer', 'fullName companyName phone homeDistrict brVerified role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      data: listings,
    });
  } catch (error) {
    console.error('Error fetching listings:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch listings', error: error.message });
  }
});

// GET /api/employers - Get all employers who have posted jobs
app.get('/api/employers', async (req, res) => {
  try {
    const employers = await User.find({ role: 'employer' })
      .select('fullName companyName phone homeDistrict brVerified industry')
      .sort({ fullName: 1 });

    // Count jobs per employer
    const jobCounts = await Job.aggregate([
      { $group: { _id: '$employer', count: { $sum: 1 } } }
    ]);
    const jobCountMap = new Map(jobCounts.map((jc) => [String(jc._id), jc.count]));

    const result = employers.map((emp) => {
      const obj = emp.toObject();
      obj.jobCount = jobCountMap.get(String(emp._id)) || 0;
      return obj;
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error('Error fetching employers:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch employers', error: error.message });
  }
});

// GET /api/workers - Get all registered workers
app.get('/api/workers', async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' })
      .select('fullName displayName phone nic nicVerified homeDistrict nearestTown primaryTrade secondaryTrade experienceYears authority wage rating jobsCompleted availableToday createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: workers.length,
      data: workers,
    });
  } catch (error) {
    console.error('Error fetching workers:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch workers', error: error.message });
  }
});

// GET /api/listings/:id - Get a single listing details
app.get('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID format' });
    }
    const listing = await Job.findById(id).populate('employer', 'fullName companyName phone');
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    res.json({ success: true, data: listing });
  } catch (error) {
    console.error('Error fetching listing:', error.message);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// DELETE /api/listings/:id - Remove listing directly from database
app.delete('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID format' });
    }

    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) {
      return res.status(404).json({ success: false, message: 'Listing not found or already deleted' });
    }

    console.log(`[Admin Server] Successfully removed listing: ${id} ("${deletedJob.title}")`);

    res.json({
      success: true,
      message: `Listing "${deletedJob.title}" removed successfully from the mobile app database.`,
      deletedId: id,
    });
  } catch (error) {
    console.error('Error deleting listing:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete listing', error: error.message });
  }
});

// Connect to MongoDB and start Express
async function startServer() {
  try {
    console.log('[Admin Server] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Admin Server] MongoDB connected successfully!');

    app.listen(PORT, () => {
      console.log(`[Admin Server] Standalone Admin Express API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Admin Server] MongoDB connection failed:', err.message);
  }
}

startServer();
