const express = require('express');
const mongoose = require('mongoose');
const JobAlert = require('../models/JobAlert');
const Job = require('../models/Job');
const { auth, requireRole } = require('../middleware/auth');
const { esc } = require('../utils/fill');

const router = express.Router();
router.use(auth, requireRole('worker'));

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

// How many open jobs currently match an alert
async function countMatches(a) {
  const filter = { status: 'open' };
  if (a.trade) filter.trade = new RegExp(`^${esc(a.trade)}$`, 'i');
  if (a.district) filter.district = new RegExp(`^${esc(a.district)}$`, 'i');
  if (a.minWage) filter.dailyWage = { $gte: a.minWage };
  return Job.countDocuments(filter);
}

// READ my alerts (with the number of jobs matching right now)
router.get('/', async (req, res) => {
  const alerts = await JobAlert.find({ worker: req.user._id }).sort({ createdAt: -1 });
  const withCounts = await Promise.all(alerts.map(async (a) => ({ ...a.toObject(), matches: await countMatches(a) })));
  res.json({ alerts: withCounts });
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const { label, trade, district, minWage } = req.body;
    if (!trade && !district && !minWage) return res.status(400).json({ message: 'Choose at least a trade, district or minimum wage' });
    const alert = await JobAlert.create({
      worker: req.user._id, label: label || [trade, district].filter(Boolean).join(' • ') || 'Job alert',
      trade: trade || '', district: district || '', minWage: Number(minWage) || 0,
    });
    res.status(201).json({ alert: { ...alert.toObject(), matches: await countMatches(alert) } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE (enable / disable, change criteria)
router.put('/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const alert = await JobAlert.findOne({ _id: req.params.id, worker: req.user._id });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    ['label', 'trade', 'district', 'minWage', 'enabled'].forEach((k) => {
      if (req.body[k] !== undefined) alert[k] = req.body[k];
    });
    await alert.save();
    res.json({ alert: { ...alert.toObject(), matches: await countMatches(alert) } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const alert = await JobAlert.findOneAndDelete({ _id: req.params.id, worker: req.user._id });
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  res.json({ message: 'Alert deleted' });
});

module.exports = router;
