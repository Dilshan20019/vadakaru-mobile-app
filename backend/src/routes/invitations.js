const express = require('express');
const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);
const validId = (id) => mongoose.Types.ObjectId.isValid(id);

// CREATE: employer invites a worker to one of their open jobs
router.post('/', requireRole('employer'), async (req, res) => {
  try {
    const { worker, job, message } = req.body;
    if (!validId(worker) || !validId(job)) return res.status(400).json({ message: 'Worker and job are required' });
    const j = await Job.findOne({ _id: job, employer: req.user._id });
    if (!j) return res.status(404).json({ message: 'Job not found' });
    if (j.status !== 'open') return res.status(400).json({ message: 'You can only invite workers to open jobs' });
    if (!(await User.exists({ _id: worker, role: 'worker' }))) return res.status(404).json({ message: 'Worker not found' });
    const invitation = await Invitation.create({ employer: req.user._id, worker, job, message: String(message || '').slice(0, 300) });
    res.status(201).json({ invitation });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already invited this worker to this job' });
    res.status(400).json({ message: err.message });
  }
});

// READ: employer's sent invitations
router.get('/sent', requireRole('employer'), async (req, res) => {
  const invitations = await Invitation.find({ employer: req.user._id }).sort({ createdAt: -1 })
    .populate('worker', 'fullName displayName primaryTrade').populate('job', 'title town district dailyWage');
  res.json({ invitations });
});

// READ: worker's received invitations
router.get('/received', requireRole('worker'), async (req, res) => {
  const invitations = await Invitation.find({ worker: req.user._id }).sort({ createdAt: -1 })
    .populate('employer', 'fullName companyName phone brVerified')
    .populate('job', 'title trade town district dailyWage days startDate status');
  res.json({ invitations: invitations.filter((i) => i.job) });
});

// UPDATE: worker accepts (creates a pending application) or declines
router.put('/:id', requireRole('worker'), async (req, res) => {
  try {
    const inv = await Invitation.findOne({ _id: req.params.id, worker: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Invitation not found' });
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    let application = null;
    if (status === 'accepted') {
      const job = await Job.findById(inv.job);
      if (!job || job.status !== 'open') return res.status(400).json({ message: 'This job is no longer open' });
      application = await Application.findOne({ job: job._id, worker: req.user._id });
      if (!application) application = await Application.create({ job: job._id, worker: req.user._id, status: 'pending', note: 'Invited by employer' });
    }
    inv.status = status;
    await inv.save();
    res.json({ invitation: inv, application });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE: employer edits the message of a pending invitation
router.patch('/:id', requireRole('employer'), async (req, res) => {
  const inv = await Invitation.findOne({ _id: req.params.id, employer: req.user._id, status: 'pending' });
  if (!inv) return res.status(404).json({ message: 'Pending invitation not found' });
  inv.message = String(req.body.message || '').slice(0, 300);
  await inv.save();
  res.json({ invitation: inv });
});

// DELETE: employer cancels an invitation
router.delete('/:id', requireRole('employer'), async (req, res) => {
  const inv = await Invitation.findOneAndDelete({ _id: req.params.id, employer: req.user._id });
  if (!inv) return res.status(404).json({ message: 'Invitation not found' });
  res.json({ message: 'Invitation cancelled' });
});

module.exports = router;
