const router = require('express').Router();
const { Report } = require('../models');
const { auth, wrap, fail } = require('../middleware/auth');

router.use(auth);
const TYPES = ['Payment Issue', 'Worker No-Show', 'Safety Concern', 'App Bug', 'Other'];

router.get('/', wrap(async (req, res) => {
  res.json(await Report.find({ author: req.user.id }).select('-screenshot').sort({ createdAt: -1 }).populate('job', 'title'));
}));

router.get('/:id', wrap(async (req, res) => {
  const r = await Report.findOne({ _id: req.params.id, author: req.user.id }).populate('job', 'title');
  if (!r) throw fail(404, 'Report not found');
  res.json(r);
}));

router.post('/', wrap(async (req, res) => {
  const { type, description, screenshot, jobId } = req.body;
  if (!TYPES.includes(type)) throw fail(400, 'Choose a problem type');
  if ((description || '').trim().length < 10) throw fail(400, 'Please describe the problem (at least 10 characters)');
  if (screenshot && screenshot.length > 2500000) throw fail(413, 'Screenshot is too large (max about 1.8 MB)');
  res.status(201).json(await Report.create({ author: req.user.id, type, description: description.trim(), screenshot, job: jobId || undefined }));
}));

router.put('/:id', wrap(async (req, res) => {
  const r = await Report.findOne({ _id: req.params.id, author: req.user.id });
  if (!r) throw fail(404, 'Report not found');
  if (r.status === 'closed') throw fail(400, 'Closed reports cannot be edited');
  if (req.body.type) { if (!TYPES.includes(req.body.type)) throw fail(400, 'Invalid type'); r.type = req.body.type; }
  if (req.body.description !== undefined) {
    if (req.body.description.trim().length < 10) throw fail(400, 'Please describe the problem (at least 10 characters)');
    r.description = req.body.description.trim();
  }
  await r.save();
  res.json(r);
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await Report.deleteOne({ _id: req.params.id, author: req.user.id });
  if (!r.deletedCount) throw fail(404, 'Report not found');
  res.json({ deleted: true });
}));

module.exports = router;
