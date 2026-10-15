const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const Review = require('../models/Review');
const Application = require('../models/Application');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

// READ dashboard numbers for the employer home screen
router.get('/dashboard/summary', requireRole('employer'), async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user._id });
    const jobIds = jobs.map((j) => j._id);
    const apps = await Application.find({ job: { $in: jobIds } }).sort({ createdAt: -1 }).populate('worker', 'fullName displayName primaryTrade rating');
    const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
    const count = (st) => apps.filter((a) => a.status === st).length;
    res.json({
      stats: {
        activeJobs: jobs.filter((j) => j.status === 'open').length,
        newApplications: count('pending'),
        shortlisted: count('shortlisted'),
        hired: count('accepted'),
        totalJobs: jobs.length,
      },
      activeJobs: jobs.filter((j) => j.status === 'open').slice(0, 3).map((j) => ({
        ...j.toObject(), applicants: apps.filter((a) => String(a.job) === String(j._id)).length,
      })),
      recentApplications: apps.slice(0, 5).map((a) => ({
        _id: a._id, status: a.status, createdAt: a.createdAt, worker: a.worker,
        job: { _id: a.job, title: jobMap.get(String(a.job))?.title },
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// READ public employer profile: details, rating, open vacancies, finished jobs, latest reviews
router.get('/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const employer = await User.findOne({ _id: req.params.id, role: 'employer' });
    if (!employer) return res.status(404).json({ message: 'Employer not found' });

    const [vacancies, history, reviews, totalJobs] = await Promise.all([
      Job.find({ employer: employer._id, status: 'open' }).sort({ urgent: -1, createdAt: -1 }),
      Job.find({ employer: employer._id, status: 'completed' }).sort({ updatedAt: -1 }).limit(20),
      Review.find({ employer: employer._id }).sort({ createdAt: -1 }).limit(30).populate('worker', 'fullName displayName primaryTrade'),
      Job.countDocuments({ employer: employer._id }),
    ]);
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    res.json({
      employer: {
        _id: employer._id, fullName: employer.fullName, companyName: employer.companyName, phone: employer.phone,
        industry: employer.industry, authorizedRep: employer.authorizedRep, invoiceEmail: employer.invoiceEmail,
        yardLocation: employer.yardLocation, about: employer.about, establishedYear: employer.establishedYear,
        tier: employer.tier, brNumber: employer.brNumber, brVerified: employer.brVerified,
        onTimePayRate: employer.onTimePayRate, facilities: employer.facilities, homeDistrict: employer.homeDistrict,
      },
      stats: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length, jobsFiled: totalJobs },
      vacancies, history, reviews,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE a review (a worker can review an employer once)
router.post('/:id/reviews', requireRole('worker'), async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    if (!(await User.exists({ _id: req.params.id, role: 'employer' }))) return res.status(404).json({ message: 'Employer not found' });
    const review = await Review.create({
      employer: req.params.id, worker: req.user._id, rating: Number(req.body.rating), comment: req.body.comment || '',
    });
    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already reviewed this employer. Edit your review instead.' });
    res.status(400).json({ message: err.message });
  }
});

// UPDATE my review
router.put('/:id/reviews/:rid', requireRole('worker'), async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.rid, employer: req.params.id, worker: req.user._id });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (req.body.rating !== undefined) review.rating = Number(req.body.rating);
    if (req.body.comment !== undefined) review.comment = req.body.comment;
    await review.save();
    res.json({ review });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE my review
router.delete('/:id/reviews/:rid', requireRole('worker'), async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.rid, employer: req.params.id, worker: req.user._id });
  if (!review) return res.status(404).json({ message: 'Review not found' });
  res.json({ message: 'Review deleted' });
});

module.exports = router;
