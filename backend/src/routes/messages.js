const router = require('express').Router();
const mongoose = require('mongoose');
const { Message, User, Job } = require('../models');
const { auth, wrap, fail } = require('../middleware/auth');
const { threadKey } = require('../util');

router.use(auth);
const UF = 'name businessName trade role verified phone';

// conversation list: last message + unread count per thread
router.get('/threads', wrap(async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.id);
  const rows = await Message.aggregate([
    { $match: { $or: [{ from: uid }, { to: uid }] } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$thread', last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', uid] }, { $eq: ['$read', false] }] }, 1, 0] } } } },
    { $sort: { 'last.createdAt': -1 } },
  ]);
  const other = (r) => String(r.last.from) === req.user.id ? r.last.to : r.last.from;
  const [users, jobs] = await Promise.all([
    User.find({ _id: { $in: rows.map(other) } }).select(UF),
    Job.find({ _id: { $in: rows.map((r) => r.last.job).filter(Boolean) } }).select('title status location paid'),
  ]);
  const um = Object.fromEntries(users.map((u) => [String(u._id), u]));
  const jm = Object.fromEntries(jobs.map((j) => [String(j._id), j]));
  let out = rows.map((r) => ({
    with: um[String(other(r))], unread: r.unread, job: jm[String(r.last.job)] || null,
    last: { text: r.last.kind === 'photo' ? '📷 Photo' : r.last.kind === 'location' ? '📍 Location shared' : r.last.text, at: r.last.createdAt, mine: String(r.last.from) === req.user.id },
  })).filter((t) => t.with);
  const q = (req.query.q || '').toLowerCase();
  if (q) out = out.filter((t) => `${t.with.name} ${t.with.businessName || ''} ${t.last.text || ''}`.toLowerCase().includes(q));
  res.json(out);
}));

// mark every incoming message as read
router.put('/read-all', wrap(async (req, res) => {
  const r = await Message.updateMany({ to: req.user.id, read: false }, { read: true });
  res.json({ updated: r.modifiedCount });
}));

// delete a whole conversation
router.delete('/thread/:userId', wrap(async (req, res) => {
  const r = await Message.deleteMany({ thread: threadKey(req.user.id, req.params.userId) });
  res.json({ deleted: r.deletedCount });
}));

router.get('/with/:userId', wrap(async (req, res) => {
  const other = await User.findById(req.params.userId).select(UF);
  if (!other) throw fail(404, 'User not found');
  const thread = threadKey(req.user.id, other._id);
  await Message.updateMany({ thread, to: req.user.id, read: false }, { read: true });
  const messages = await Message.find({ thread }).sort({ createdAt: 1 }).limit(300).populate('job', 'title location');
  res.json({ other, messages });
}));

router.post('/', wrap(async (req, res) => {
  const { to, text, kind = 'text', jobId, image } = req.body;
  if (!(await User.exists({ _id: to }))) throw fail(404, 'Recipient not found');
  if (!['text', 'location', 'photo'].includes(kind)) throw fail(400, 'Invalid message type');
  if (kind === 'photo' ? !image : !(text || '').trim()) throw fail(400, 'Message cannot be empty');
  if (image && image.length > 2500000) throw fail(413, 'Image is too large');
  const m = await Message.create({ thread: threadKey(req.user.id, to), from: req.user.id, to, kind, text: (text || '').trim(), image, job: jobId || undefined });
  res.status(201).json(m);
}));

router.put('/:id', wrap(async (req, res) => {
  const m = await Message.findById(req.params.id);
  if (!m || String(m.from) !== req.user.id) throw fail(404, 'Message not found');
  if (m.kind !== 'text') throw fail(400, 'Only text messages can be edited');
  if (!(req.body.text || '').trim()) throw fail(400, 'Message cannot be empty');
  m.text = req.body.text.trim();
  await m.save();
  res.json(m);
}));

router.delete('/:id', wrap(async (req, res) => {
  const m = await Message.findById(req.params.id);
  if (!m || String(m.from) !== req.user.id) throw fail(404, 'Message not found');
  await m.deleteOne();
  res.json({ deleted: true });
}));

module.exports = router;
