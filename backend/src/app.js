const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'vedakaru-api' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/employers', require('./routes/employers'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/safety', require('./routes/safety'));
app.use('/api/shortlist', require('./routes/shortlist'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/invitations', require('./routes/invitations'));

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
