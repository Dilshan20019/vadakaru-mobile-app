const express = require('express');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { auth, requireRole } = require('../middleware/auth');
const { colomboDate } = require('../utils/dates');
const { syncJobFill } = require('../utils/fill');

const router = express.Router();
router.use(auth);

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

async function loadMine(req, res) {
  if (!validId(req.params.id)) { res.status(400).json({ message: 'Invalid id' }); return null; }
  const app = await Application.findOne({ _id: req.params.id, worker: req.user._id });
  if (!app) { res.status(404).json({ message: 'Application not found' }); return null; }
  return app;
}

// READ one application (worker who owns it, or employer who owns the job)
router.get('/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const app = await Application.findById(req.params.id)
      .populate({ path: 'job', populate: { path: 'employer', select: 'fullName companyName phone brVerified tier' } })
      .populate('worker', 'fullName displayName phone primaryTrade');
    if (!app || !app.job) return res.status(404).json({ message: 'Application not found' });

    const isWorker = String(app.worker._id) === String(req.user._id);
    const isEmployer = String(app.job.employer._id) === String(req.user._id);
    if (!isWorker && !isEmployer) return res.status(403).json({ message: 'Not allowed' });

    // Suggest similar open shifts (shown when a position is filled / rejected)
    const similarJobs = await Job.find({
      status: 'open', trade: app.job.trade, _id: { $ne: app.job._id },
    }).limit(3).populate('employer', 'fullName companyName');

    res.json({ application: app, similarJobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE my note to the employer and/or tick items on my tool-prep checklist
// body: { note?: string, toolPrep?: [{ _id, done }] }
router.put('/:id', requireRole('worker'), async (req, res) => {
  const app = await loadMine(req, res);
  if (!app) return;
  if (req.body.reminder !== undefined) app.reminder = !!req.body.reminder;
  if (req.body.note !== undefined) app.note = String(req.body.note).slice(0, 300);
  if (Array.isArray(req.body.toolPrep)) {
    req.body.toolPrep.forEach(({ _id, done }) => {
      const item = app.toolPrep.id(_id);
      if (item) item.done = !!done;
    });
  }
  await app.save();
  res.json({ application: app });
});

// DELETE (withdraw / cancel shift)
router.delete('/:id', requireRole('worker'), async (req, res) => {
  const app = await loadMine(req, res);
  if (!app) return;
  const wasAccepted = app.status === 'accepted';
  if (wasAccepted) {
    // accepted workers must give at least 4 hours' notice (Sri Lanka time)
    const job = await Job.findById(app.job);
    if (job && job.startDate) {
      const start = Date.parse(`${job.startDate}T${job.shiftStart || '08:00'}:00+05:30`);
      if (!Number.isNaN(start) && start - Date.now() < 4 * 3600e3) {
        return res.status(400).json({ message: 'Accepted shifts can only be cancelled at least 4 hours before the start time. Please call the site manager.' });
      }
    }
  }
  await app.deleteOne();
  if (wasAccepted) await syncJobFill(app.job);
  res.json({ message: 'Application withdrawn' });
});

// CREATE attendance: roll-call check-in for today
router.post('/:id/checkin', requireRole('worker'), async (req, res) => {
  const app = await loadMine(req, res);
  if (!app) return;
  if (app.status !== 'accepted') return res.status(400).json({ message: 'Only accepted jobs can be checked in to' });
  const today = colomboDate(0);
  if (app.attendance.some((a) => a.date === today)) return res.status(409).json({ message: 'You already checked in today' });
  app.attendance.push({ date: today, checkInAt: new Date() });
  await app.save();
  res.status(201).json({ application: app });
});

// UPDATE attendance: check-out for today
router.post('/:id/checkout', requireRole('worker'), async (req, res) => {
  const app = await loadMine(req, res);
  if (!app) return;
  const entry = app.attendance.find((a) => a.date === colomboDate(0));
  if (!entry) return res.status(400).json({ message: 'Check in first' });
  if (entry.checkOutAt) return res.status(409).json({ message: 'You already checked out today' });
  entry.checkOutAt = new Date();
  await app.save();
  res.json({ application: app });
});

module.exports = router;
