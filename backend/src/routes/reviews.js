const router = require('express').Router();
const { Review, Job, User } = require('../models');
const { auth, wrap, fail } = require('../middleware/auth');

router.use(auth);

const refreshRating = async (targetId) => {
  const [r] = await Review.aggregate([
    { $match: { target: targetId } },
    { $group: { _id: '$target', avg: { $avg: '$stars' }, n: { $sum: 1 } } },
  ]);
  await User.updateOne({ _id: targetId }, { rating: r ? Math.round(r.avg * 10) / 10 : 0, ratingCount: r ? r.n : 0 });
};

router.get('/', wrap(async (req, res) => {
  const f = {};
  if (req.query.job) f.job = req.query.job;
  if (req.query.target) f.target = req.query.target;
  if (req.query.mine) f.author = req.user.id;
  res.json(await Review.find(f).sort({ createdAt: -1 }).populate('author', 'name businessName').populate('target', 'name businessName'));
}));

router.post('/', wrap(async (req, res) => {
  const { jobId, targetId, stars, dimensions, praise, note } = req.body;
  if (!(stars >= 1 && stars <= 5)) throw fail(400, 'Please give a star rating (1-5)');
  const job = await Job.findById(jobId);
  if (!job) throw fail(404, 'Job not found');
  if (!['in_progress', 'completed'].includes(job.status)) throw fail(400, 'Reviews open once the shift has started');
  const inJob = String(job.employer) === req.user.id || job.roster.some((r) => String(r.worker) === req.user.id);
  if (!inJob) throw fail(403, 'You did not take part in this job');
  try {
    const r = await Review.create({ job: jobId, author: req.user.id, target: targetId, authorRole: req.user.role, stars, dimensions, praise, note });
    await refreshRating(r.target);
    res.status(201).json(r);
  } catch (e) {
    if (e.code === 11000) throw fail(409, 'You already reviewed this person for this job');
    throw e;
  }
}));

router.put('/:id', wrap(async (req, res) => {
  const r = await Review.findById(req.params.id);
  if (!r || String(r.author) !== req.user.id) throw fail(404, 'Review not found');
  ['stars', 'dimensions', 'praise', 'note'].forEach((k) => { if (req.body[k] !== undefined) r[k] = req.body[k]; });
  await r.save();
  await refreshRating(r.target);
  res.json(r);
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await Review.findById(req.params.id);
  if (!r || String(r.author) !== req.user.id) throw fail(404, 'Review not found');
  await r.deleteOne();
  await refreshRating(r.target);
  res.json({ deleted: true });
}));

module.exports = router;
