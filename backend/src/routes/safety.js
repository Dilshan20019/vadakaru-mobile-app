const router = require('express').Router();
const { Safety, Job } = require('../models');
const { auth, wrap, fail } = require('../middleware/auth');

router.use(auth);

router.get('/', wrap(async (req, res) => {
  const f = {};
  if (req.query.job) f.job = req.query.job; else f.author = req.user.id;
  res.json(await Safety.find(f).sort({ createdAt: -1 }).limit(30).populate('author', 'name businessName'));
}));

// SOS / hazard / incident / PPE replacement request
router.post('/', wrap(async (req, res) => {
  const { jobId, kind, note } = req.body;
  if (!['sos', 'hazard', 'incident', 'ppe_request'].includes(kind)) throw fail(400, 'Invalid safety event');
  if (['hazard', 'incident'].includes(kind) && !(note || '').trim()) throw fail(400, 'Please describe what happened');
  const job = await Job.findById(jobId);
  if (!job) throw fail(404, 'Job not found');
  const ok = String(job.employer) === req.user.id || job.roster.some((r) => String(r.worker) === req.user.id);
  if (!ok) throw fail(403, 'You are not part of this job');
  const e = await Safety.create({ job: jobId, author: req.user.id, kind, note: (note || '').trim() });
  res.status(201).json({ event: e, hotline: '1388' });
}));

router.put('/:id/resolve', wrap(async (req, res) => {
  const e = await Safety.findById(req.params.id);
  if (!e || String(e.author) !== req.user.id) throw fail(404, 'Event not found');
  e.status = 'resolved';
  await e.save();
  res.json(e);
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await Safety.deleteOne({ _id: req.params.id, author: req.user.id });
  if (!r.deletedCount) throw fail(404, 'Event not found');
  res.json({ deleted: true });
}));

module.exports = router;
