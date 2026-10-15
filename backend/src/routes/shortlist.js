const router = require('express').Router();
const { Shortlist, Application, Job } = require('../models');
const { auth, only, wrap, fail } = require('../middleware/auth');
const { matchScore } = require('../util');

router.use(auth, only('employer'));

router.get('/', wrap(async (req, res) => {
  const f = { employer: req.user.id };
  if (req.query.job) f.job = req.query.job;
  const job = req.query.job ? await Job.findById(req.query.job) : null;
  const rows = await Shortlist.find(f).sort({ createdAt: -1 })
    .populate('worker', 'name trade rating dailyRate verified phone location distanceKm jobsDone available skills');
  res.json(rows.filter((r) => r.worker).map((r) => ({ ...r.toObject(), match: matchScore(r.worker, job) })));
}));

// add if missing, remove if present
router.post('/toggle', wrap(async (req, res) => {
  const { jobId, workerId } = req.body;
  const job = await Job.findOne({ _id: jobId, employer: req.user.id });
  if (!job) throw fail(404, 'Job not found');
  const ex = await Shortlist.findOne({ job: jobId, worker: workerId, employer: req.user.id });
  if (ex) { await ex.deleteOne(); return res.json({ shortlisted: false }); }
  await Shortlist.create({ job: jobId, worker: workerId, employer: req.user.id });
  res.status(201).json({ shortlisted: true });
}));

// shortlist every pending applicant of a job
router.post('/batch', wrap(async (req, res) => {
  const apps = await Application.find({ job: req.body.jobId, employer: req.user.id, status: 'pending' });
  let added = 0;
  for (const a of apps) {
    const r = await Shortlist.updateOne({ job: a.job, worker: a.worker, employer: req.user.id }, {}, { upsert: true });
    if (r.upsertedCount) added++;
  }
  res.json({ added });
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await Shortlist.deleteOne({ _id: req.params.id, employer: req.user.id });
  if (!r.deletedCount) throw fail(404, 'Not found');
  res.json({ deleted: true });
}));

module.exports = router;
