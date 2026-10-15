const express = require('express');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Application = require('../models/Application');
const SavedJob = require('../models/SavedJob');
const Review = require('../models/Review');
const { auth, requireRole } = require('../middleware/auth');
const { colomboDate, haversineKm } = require('../utils/dates');
const { esc, syncJobFill } = require('../utils/fill');

const router = express.Router();
router.use(auth);

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const EMPLOYER_FIELDS = 'fullName companyName phone brVerified tier';
const PERK_KEYS = ['meals', 'transport', 'cashPayout', 'accommodation', 'fairPay', 'overtime'];

/* Add distance, match %, saved flag, my application and employer rating to each job */
async function decorate(jobs, user) {
  const ids = jobs.map((j) => j._id);
  const employerIds = [...new Set(jobs.map((j) => String(j.employer?._id || j.employer)))];

  const [saved, apps, ratings] = await Promise.all([
    SavedJob.find({ worker: user._id, job: { $in: ids } }),
    Application.find({ worker: user._id, job: { $in: ids } }),
    Review.aggregate([
      { $match: { employer: { $in: employerIds.map((i) => new mongoose.Types.ObjectId(i)) } } },
      { $group: { _id: '$employer', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
    ]),
  ]);
  const savedSet = new Set(saved.map((s) => String(s.job)));
  const appMap = new Map(apps.map((a) => [String(a.job), a]));
  const ratingMap = new Map(ratings.map((r) => [String(r._id), r]));

  return jobs.map((j) => {
    const o = j.toObject ? j.toObject() : j;
    const distanceKm = haversineKm(user.location, o.lat != null ? { lat: o.lat, lng: o.lng } : null);

    let match = 20;
    if (user.primaryTrade && o.trade === user.primaryTrade) match += 40;
    else if (user.specializations?.some((s) => o.title.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))) match += 20;
    if (user.homeDistrict && o.district === user.homeDistrict) match += 20;
    if (o.dailyWage >= (user.wage?.fullDay || 0) * 0.9) match += 10;
    if (distanceKm != null && distanceKm <= (user.travelRadius || 15)) match += 10;

    const app = appMap.get(String(o._id));
    const emp = o.employer || {};
    const r = ratingMap.get(String(emp._id || emp));
    return {
      ...o,
      distanceKm,
      matchPercent: Math.min(100, match),
      saved: savedSet.has(String(o._id)),
      applicationStatus: app?.status || null,
      applicationId: app?._id || null,
      employerRating: r ? Math.round(r.avg * 10) / 10 : null,
      employerReviews: r ? r.n : 0,
    };
  });
}

/* ------------------------------ READ list ----------------------------- */
// GET /api/jobs?q=&trades=Mason,Carpenter&minWage=&maxWage=&district=&maxDistance=
//   &startWithin=today|tomorrow|3days&duration=1|2-6|7+&perks=meals,transport&verified=true&sort=best|nearest|wage|newest
router.get('/', async (req, res) => {
  try {
    const { q, trades, minWage, maxWage, district, maxDistance, startWithin, duration, perks, verified, urgent, sort } = req.query;
    const filter = { status: 'open' };

    if (trades) filter.trade = { $in: String(trades).split(',').map((t) => new RegExp(`^${esc(t.trim())}$`, 'i')) };
    if (district) filter.district = new RegExp(`^${esc(district)}$`, 'i');
    if (urgent === 'true') filter.urgent = true;
    if (minWage || maxWage) {
      filter.dailyWage = {};
      if (minWage) filter.dailyWage.$gte = Number(minWage);
      if (maxWage) filter.dailyWage.$lte = Number(maxWage);
    }
    if (duration === '1') filter.days = 1;
    else if (duration === '2-6') filter.days = { $gte: 2, $lte: 6 };
    else if (duration === '7+') filter.days = { $gte: 7 };
    if (perks) String(perks).split(',').filter((p) => PERK_KEYS.includes(p)).forEach((p) => { filter[`perks.${p}`] = true; });
    if (q) filter.$or = [{ title: new RegExp(esc(q), 'i') }, { description: new RegExp(esc(q), 'i') }, { trade: new RegExp(esc(q), 'i') }];
    if (startWithin === 'today') filter.startDate = colomboDate(0);
    else if (startWithin === 'tomorrow') filter.startDate = colomboDate(1);
    else if (startWithin === '3days') filter.startDate = { $gte: colomboDate(0), $lte: colomboDate(3) };

    const raw = await Job.find(filter).populate('employer', EMPLOYER_FIELDS);
    let jobs = await decorate(raw, req.user);

    if (verified === 'true') jobs = jobs.filter((j) => j.employer?.brVerified);
    if (maxDistance) jobs = jobs.filter((j) => j.distanceKm == null || j.distanceKm <= Number(maxDistance));

    const sorters = {
      nearest: (a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999),
      wage: (a, b) => b.dailyWage - a.dailyWage,
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      best: (a, b) => Number(b.urgent) - Number(a.urgent) || b.matchPercent - a.matchPercent,
    };
    jobs.sort(sorters[sort] || sorters.best);

    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* Employer's own postings */
router.get('/mine', requireRole('employer'), async (req, res) => {
  const jobs = await Job.find({ employer: req.user._id }).sort({ createdAt: -1 });
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: '$job', n: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({ jobs: jobs.map((j) => ({ ...j.toObject(), applicants: map.get(String(j._id)) || 0 })) });
});

/* Worker's applications (optionally ?status=accepted) */
router.get('/applications/mine', requireRole('worker'), async (req, res) => {
  const filter = { worker: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const apps = await Application.find(filter)
    .populate({ path: 'job', populate: { path: 'employer', select: EMPLOYER_FIELDS } })
    .sort({ createdAt: -1 });
  res.json({ applications: apps.filter((a) => a.job) });
});

/* ------------------------- Saved jobs (worker) ------------------------ */
router.get('/saved/mine', requireRole('worker'), async (req, res) => {
  const saved = await SavedJob.find({ worker: req.user._id }).sort({ createdAt: -1 }).populate({ path: 'job', populate: { path: 'employer', select: EMPLOYER_FIELDS } });
  const jobs = await decorate(saved.map((s) => s.job).filter(Boolean), req.user);
  res.json({ jobs, totalPotential: jobs.reduce((sum, j) => sum + j.dailyWage * j.days, 0) });
});

router.post('/:id/save', requireRole('worker'), async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    if (!(await Job.exists({ _id: req.params.id }))) return res.status(404).json({ message: 'Job not found' });
    await SavedJob.updateOne({ worker: req.user._id, job: req.params.id }, { $setOnInsert: {} }, { upsert: true });
    res.status(201).json({ saved: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id/save', requireRole('worker'), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  await SavedJob.deleteOne({ worker: req.user._id, job: req.params.id });
  res.json({ saved: false });
});

/* ----------------------------- READ one ------------------------------ */
/* --- Employer: every application across all my postings (Application Management) --- */
// GET /api/jobs/employer/applications?jobId=&status=pending|shortlisted|accepted|rejected
router.get('/employer/applications', requireRole('employer'), async (req, res) => {
  try {
    const mine = await Job.find({ employer: req.user._id }).select('title trade town district dailyWage status');
    let ids = mine.map((j) => j._id);
    if (req.query.jobId) {
      if (!validId(req.query.jobId)) return res.status(400).json({ message: 'Invalid id' });
      ids = ids.filter((i) => String(i) === req.query.jobId);
    }
    const q = { job: { $in: ids } };
    if (req.query.status) q.status = req.query.status;
    const applications = await Application.find(q).sort({ createdAt: -1 })
      .populate('worker', 'fullName displayName phone primaryTrade experienceYears rating wage.fullDay homeDistrict nicVerified')
      .populate('job', 'title trade town district dailyWage status');
    res.json({ applications, jobs: mine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const job = await Job.findById(req.params.id).populate('employer', EMPLOYER_FIELDS);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  const [decorated] = await decorate([job], req.user);
  res.json({ job: decorated });
});

/* ------------------------------- CREATE ------------------------------ */
const JOB_FIELDS = [
  'title', 'trade', 'description', 'scope', 'requirements', 'district', 'town', 'lat', 'lng', 'dailyWage', 'days',
  'workersNeeded', 'startDate', 'shiftStart', 'shiftHours', 'urgent', 'perks',
];
const pick = (body) => JOB_FIELDS.reduce((o, k) => (body[k] !== undefined ? { ...o, [k]: body[k] } : o), {});

router.post('/', requireRole('employer'), async (req, res) => {
  try {
    const job = await Job.create({ ...pick(req.body), employer: req.user._id });
    res.status(201).json({ job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ------------------------------- UPDATE ------------------------------ */
router.put('/:id', requireRole('employer'), async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const job = await Job.findOne({ _id: req.params.id, employer: req.user._id });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    Object.entries(pick(req.body)).forEach(([k, v]) => { job[k] = v; });
    if (req.body.status && ['open', 'closed', 'completed', 'filled'].includes(req.body.status)) job.status = req.body.status;
    await job.save();
    res.json({ job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ------------------------------- DELETE ------------------------------ */
router.delete('/:id', requireRole('employer'), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const job = await Job.findOneAndDelete({ _id: req.params.id, employer: req.user._id });
  if (!job) return res.status(404).json({ message: 'Job not found' });
  await Promise.all([Application.deleteMany({ job: job._id }), SavedJob.deleteMany({ job: job._id })]);
  res.json({ message: 'Job deleted' });
});

/* --------------------- Worker: apply / withdraw ---------------------- */
router.post('/:id/apply', requireRole('worker'), async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const job = await Job.findById(req.params.id);
    if (!job || job.status !== 'open') return res.status(404).json({ message: 'This job is no longer open' });
    const application = await Application.create({ job: job._id, worker: req.user._id, note: req.body.note || '' });
    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already applied for this job' });
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id/apply', requireRole('worker'), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const result = await Application.findOneAndDelete({ job: req.params.id, worker: req.user._id });
  if (!result) return res.status(404).json({ message: 'No application found' });
  if (result.status === 'accepted') await syncJobFill(result.job);
  res.json({ message: 'Application withdrawn' });
});

/* --------------- Employer: list + decide on applicants ---------------- */
router.get('/:id/applications', requireRole('employer'), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  const job = await Job.findOne({ _id: req.params.id, employer: req.user._id });
  if (!job) return res.status(404).json({ message: 'Job not found' });
  const applications = await Application.find({ job: job._id }).populate(
    'worker',
    'fullName displayName phone primaryTrade experienceYears rating wage.fullDay homeDistrict'
  );
  // opening the applicant list counts as "employer viewed your profile" for pending applicants
  await Application.updateMany({ job: job._id, viewedByEmployer: false }, { viewedByEmployer: true });
  res.json({ applications });
});

router.put('/:id/applications/:appId', requireRole('employer'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'shortlisted', 'accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const job = await Job.findOne({ _id: req.params.id, employer: req.user._id });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    // load + save (not findOneAndUpdate) so the model hook can create the tool-prep checklist on acceptance
    const app = await Application.findOne({ _id: req.params.appId, job: job._id });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    app.status = status;
    app.viewedByEmployer = true;
    await app.save();

    // When all positions are taken, mark the job as filled and tell other applicants
    const accepted = await Application.countDocuments({ job: job._id, status: 'accepted' });
    if (accepted >= job.workersNeeded && job.status === 'open') {
      job.status = 'filled';
      await job.save();
      await Application.updateMany({ job: job._id, status: { $in: ['pending', 'shortlisted'] } }, { status: 'filled' });
    } else if (accepted < job.workersNeeded && job.status === 'filled') {
      job.status = 'open';
      await job.save();
      await Application.updateMany({ job: job._id, status: 'filled' }, { status: 'pending' });
    }
    res.json({ application: await Application.findById(app._id), jobStatus: job.status });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
