const express = require('express');
const Availability = require('../models/Availability');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// READ one month: GET /api/availability?month=2026-10
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    const filter = { worker: req.user._id };
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'month must be YYYY-MM' });
      filter.date = { $regex: `^${month}` };
    }
    const entries = await Availability.find(filter).sort({ date: 1 });
    const summary = {
      open: entries.filter((e) => e.status === 'open' || e.status === 'half' || e.status === 'ot').length,
      booked: entries.filter((e) => e.status === 'booked').length,
      off: entries.filter((e) => e.status === 'off').length,
    };
    res.json({ entries, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE / UPDATE many dates at once (upsert)
router.put('/', async (req, res) => {
  try {
    const { dates, status, rate, note } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) return res.status(400).json({ message: 'Select at least one date' });
    if (!dates.every((d) => DATE_RE.test(d))) return res.status(400).json({ message: 'Dates must be YYYY-MM-DD' });
    if (!Availability.STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const wage = req.user.wage || {};
    const defaultRate = status === 'half' ? wage.halfDay : status === 'ot' ? wage.overtimeRate : wage.fullDay;

    // Confirmed (booked) days are protected from being overwritten
    const booked = await Availability.find({ worker: req.user._id, date: { $in: dates }, status: 'booked' });
    const lockedDates = booked.map((b) => b.date);
    const editable = status === 'booked' ? dates : dates.filter((d) => !lockedDates.includes(d));

    if (editable.length) {
      await Availability.bulkWrite(
        editable.map((date) => ({
          updateOne: {
            filter: { worker: req.user._id, date },
            update: { $set: { status, rate: rate ?? defaultRate ?? 0, note: note || '' } },
            upsert: true,
          },
        }))
      );
    }
    const entries = await Availability.find({ worker: req.user._id, date: { $in: dates } }).sort({ date: 1 });
    res.json({ entries, skippedBooked: lockedDates });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE (clear) dates: DELETE /api/availability?dates=2026-10-17,2026-10-18
router.delete('/', async (req, res) => {
  try {
    const dates = String(req.query.dates || '').split(',').filter(Boolean);
    if (!dates.length) return res.status(400).json({ message: 'dates query is required' });
    const result = await Availability.deleteMany({ worker: req.user._id, date: { $in: dates }, status: { $ne: 'booked' } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
