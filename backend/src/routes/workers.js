const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Availability = require('../models/Availability');
const SavedWorker = require('../models/SavedWorker');
const WorkerReview = require('../models/WorkerReview');
const { auth, requireRole } = require('../middleware/auth');
const { colomboDate, haversineKm } = require('../utils/dates');
const { esc } = require('../utils/fill');

const router = express.Router();
router.use(auth, requireRole('employer'));

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const LIST_FIELDS =
  'fullName displayName primaryTrade secondaryTrade experienceYears rating jobsCompleted wage.fullDay homeDistrict nearestTown availableToday nicVerified phoneVerified authority location travelRadius specializations avatarUrl';

/* Match % of a worker for a given job (or for the employer's trade needs when no job) */
function matchFor(w, job, distanceKm) {
  let m = 20;
  if (job) {
    if (w.primaryTrade === job.trade || w.secondaryTrade === job.trade) m += 40;
    else if (w.specializations?.some((s) => job.title.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]))) m += 20;
    if (w.homeDistrict === job.district) m += 15;
    if (w.wage?.fullDay && job.dailyWage >= w.wage.fullDay * 0.9) m += 5;
  } else {
    m += 30;
  }
  if (w.availableToday) m += 10;
  if ((w.rating || 0) >= 4.5) m += 10;
  else if ((w.rating || 0) >= 4) m += 5;
  if (distanceKm != null && distanceKm <= (w.travelRadius || 15)) m += 10;
  return Math.min(100, m);
}

async function ratingMap(ids) {
  const rows = await WorkerReview.aggregate([
    { $match: { worker: { $in: ids } } },
    { $group: { _id: '$worker', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

/* ----------------------------- READ: search ---------------------------- */
// GET /api/workers?q=&tab=all|recommended|nearby&sort=match|rating|distance|wage|experience
//   &skills=Mason,Painter&maxDistance=&minExp=&availableToday=true&verified=true&minRating=&minWage=&maxWage=&jobId=
router.get('/', async (req, res) => {
  try {
    const { q, tab = 'all', sort, skills, maxDistance, minExp, availableToday, verified, minRating, minWage, maxWage, jobId } = req.query;

    // the job we are recruiting for (explicit, else the employer's newest open vacancy)
    let job = null;
    if (jobId && validId(jobId)) job = await Job.findOne({ _id: jobId, employer: req.user._id });
    if (!job) job = await Job.findOne({ employer: req.user._id, status: 'open' }).sort({ createdAt: -1 });
    const origin = job && job.lat != null ? { lat: job.lat, lng: job.lng } : req.user.location;

    const filter = { role: 'worker', onboardingComplete: true };
    if (q) {
      const rx = new RegExp(esc(q), 'i');
      filter.$or = [{ fullName: rx }, { displayName: rx }, { primaryTrade: rx }, { nearestTown: rx }, { homeDistrict: rx }, { 'specializations.name': rx }];
    }
    if (skills) {
      const list = String(skills).split(',').filter(Boolean);
      filter.$and = [{ $or: [{ primaryTrade: { $in: list } }, { secondaryTrade: { $in: list } }] }];
    }
    if (minExp) filter.experienceYears = { $gte: Number(minExp) };
    if (availableToday === 'true') filter.availableToday = true;
    if (verified === 'true') filter.nicVerified = true;
    if (minWage || maxWage) {
      filter['wage.fullDay'] = {};
      if (minWage) filter['wage.fullDay'].$gte = Number(minWage);
      if (maxWage) filter['wage.fullDay'].$lte = Number(maxWage);
    }

    const workers = await User.find(filter).select(LIST_FIELDS).limit(200);
    const ids = workers.map((w) => w._id);
    const [ratings, saved] = await Promise.all([
      ratingMap(ids),
      SavedWorker.find({ employer: req.user._id, worker: { $in: ids } }),
    ]);
    const savedSet = new Set(saved.map((s) => String(s.worker)));

    let list = workers.map((w) => {
      const o = w.toObject();
      const r = ratings.get(String(w._id));
      const distanceKm = haversineKm(origin, w.location);
      return {
        ...o,
        rating: r ? Math.round(r.avg * 10) / 10 : o.rating || 0,
        reviewCount: r ? r.n : 0,
        distanceKm,
        matchPercent: matchFor(o, job, distanceKm),
        saved: savedSet.has(String(w._id)),
      };
    });

    if (minRating) list = list.filter((w) => w.rating >= Number(minRating));
    if (maxDistance) list = list.filter((w) => w.distanceKm != null && w.distanceKm <= Number(maxDistance));
    if (tab === 'recommended') list = list.filter((w) => w.matchPercent >= 70);
    if (tab === 'nearby') list = list.filter((w) => w.distanceKm != null && w.distanceKm <= 25);

    const by = {
      rating: (a, b) => b.rating - a.rating,
      distance: (a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
      wage: (a, b) => (a.wage?.fullDay || 0) - (b.wage?.fullDay || 0),
      experience: (a, b) => b.experienceYears - a.experienceYears,
      match: (a, b) => b.matchPercent - a.matchPercent,
    };
    list.sort(by[sort] || (tab === 'nearby' ? by.distance : by.match));

    res.json({ workers: list, forJob: job ? { _id: job._id, title: job.title, trade: job.trade } : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ------------------------- Saved (bookmarked) workers ------------------ */
router.get('/saved/mine', async (req, res) => {
  const rows = await SavedWorker.find({ employer: req.user._id }).sort({ createdAt: -1 }).populate('worker', LIST_FIELDS);
  res.json({ workers: rows.filter((r) => r.worker).map((r) => ({ ...r.worker.toObject(), saved: true })) });
});

router.post('/:id/save', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  if (!(await User.exists({ _id: req.params.id, role: 'worker' }))) return res.status(404).json({ message: 'Worker not found' });
  await SavedWorker.updateOne({ employer: req.user._id, worker: req.params.id }, {}, { upsert: true });
  res.status(201).json({ saved: true });
});

router.delete('/:id/save', async (req, res) => {
  await SavedWorker.deleteOne({ employer: req.user._id, worker: req.params.id });
  res.json({ saved: false });
});

/* -------------------------- Review helpers (helpful/report) ------------ */
// UPDATE: toggle "helpful" on a review
router.post('/reviews/:rid/helpful', async (req, res) => {
  if (!validId(req.params.rid)) return res.status(400).json({ message: 'Invalid id' });
  const review = await WorkerReview.findById(req.params.rid);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  const has = review.helpfulBy.some((u) => String(u) === String(req.user._id));
  review.helpfulBy = has ? review.helpfulBy.filter((u) => String(u) !== String(req.user._id)) : [...review.helpfulBy, req.user._id];
  await review.save();
  res.json({ helpful: !has, helpfulCount: review.helpfulBy.length });
});

// UPDATE: report a review to moderators
router.post('/reviews/:rid/report', async (req, res) => {
  if (!validId(req.params.rid)) return res.status(400).json({ message: 'Invalid id' });
  const review = await WorkerReview.findById(req.params.rid);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (!review.reportedBy.some((u) => String(u) === String(req.user._id))) review.reportedBy.push(req.user._id);
  await review.save();
  res.json({ reported: true });
});

/* ------------------------- READ: worker public profile ----------------- */
router.get('/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const w = await User.findOne({ _id: req.params.id, role: 'worker' }).select(
      `${LIST_FIELDS} phone about certifications tools portfolio workTowns transport createdAt`
    );
    if (!w) return res.status(404).json({ message: 'Worker not found' });

    const today = colomboDate(0);
    const [reviews, saved, calendar, hired] = await Promise.all([
      WorkerReview.find({ worker: w._id }).sort({ createdAt: -1 }).populate('employer', 'fullName companyName'),
      SavedWorker.exists({ employer: req.user._id, worker: w._id }),
      Availability.find({ worker: w._id, date: { $gte: today } }).sort({ date: 1 }).limit(14),
      Application.find({ worker: w._id, status: 'accepted' }).populate({ path: 'job', select: 'title trade town district status startDate dailyWage' }),
    ]);
    const completedJobs = hired.filter((a) => a.job && a.job.status === 'completed').map((a) => a.job).slice(0, 10);
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : w.rating || 0;
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));

    const me = String(req.user._id);
    res.json({
      worker: w,
      stats: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length, jobsCompleted: w.jobsCompleted, breakdown },
      saved: !!saved,
      calendar,
      completedJobs,
      reviews: reviews.map((r) => ({
        _id: r._id, rating: r.rating, comment: r.comment, jobTitle: r.jobTitle, createdAt: r.createdAt,
        employer: r.employer, mine: String(r.employer?._id) === me,
        helpfulCount: r.helpfulBy.length, markedHelpful: r.helpfulBy.some((u) => String(u) === me),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ----------------- CREATE / UPDATE / DELETE a review of a worker ------- */
router.post('/:id/reviews', async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    if (!(await User.exists({ _id: req.params.id, role: 'worker' }))) return res.status(404).json({ message: 'Worker not found' });
    const review = await WorkerReview.create({
      employer: req.user._id, worker: req.params.id, rating: Number(req.body.rating),
      comment: req.body.comment || '', jobTitle: req.body.jobTitle || '',
    });
    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already reviewed this worker. Edit your review instead.' });
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/reviews/:rid', async (req, res) => {
  try {
    const review = await WorkerReview.findOne({ _id: req.params.rid, worker: req.params.id, employer: req.user._id });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (req.body.rating !== undefined) review.rating = Number(req.body.rating);
    if (req.body.comment !== undefined) review.comment = req.body.comment;
    await review.save();
    res.json({ review });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id/reviews/:rid', async (req, res) => {
  const review = await WorkerReview.findOneAndDelete({ _id: req.params.rid, worker: req.params.id, employer: req.user._id });
  if (!review) return res.status(404).json({ message: 'Review not found' });
  res.json({ message: 'Review deleted' });
});

module.exports = router;
