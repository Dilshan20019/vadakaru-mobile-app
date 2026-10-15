const router = require('express').Router();
const { Payment, Job, User } = require('../models');
const { auth, only, wrap, fail } = require('../middleware/auth');
const { payoutFor } = require('../util');

router.use(auth);
const ref = (p) => p + '-' + Date.now() + Math.floor(100 + Math.random() * 900);
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const available = async (uid) => {
  const [w, x] = await Promise.all([
    Payment.aggregate([{ $match: { kind: 'wage', payee: uid } }, { $group: { _id: null, n: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { kind: 'withdrawal', payee: uid } }, { $group: { _id: null, n: { $sum: '$amount' } } }]),
  ]);
  return (w[0]?.n || 0) - (x[0]?.n || 0);
};

// Earnings & Wallet / Payouts dashboard (works for both roles)
router.get('/summary', wrap(async (req, res) => {
  const mongoose = require('mongoose');
  const uid = new mongoose.Types.ObjectId(req.user.id);
  const emp = req.user.role === 'employer';
  const days = { week: 7, two_weeks: 14, month: 30 }[req.query.range] || 7;
  const since = new Date(Date.now() - days * 864e5);
  const pays = await Payment.find({ kind: 'wage', [emp ? 'payer' : 'payee']: uid, createdAt: { $gte: since } })
    .sort({ createdAt: -1 }).populate('job', 'title location').populate('payee', 'name').populate('payer', 'businessName name');
  const comp = { base: 0, overtime: 0, travel: 0, bonus: 0 };
  let total = 0;
  pays.forEach((p) => { total += p.amount; Object.keys(comp).forEach((k) => { comp[k] += p.breakdown?.[k] || 0; }); });
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const key = d.toISOString().slice(0, 10);
    daily.push({ label: DAYS[d.getDay()], amount: pays.filter((p) => p.createdAt.toISOString().slice(0, 10) === key).reduce((n, p) => n + p.amount, 0) });
  }
  const user = await User.findById(uid);
  const out = { role: req.user.role, total, composition: comp, daily, ledger: pays, methods: user.payoutMethods, vault: user.vault };
  if (emp) {
    const jobs = await Job.find({ employer: uid, paid: false, status: { $in: ['in_progress', 'completed'] } });
    out.escrowHeld = jobs.reduce((n, j) => n + (j.escrowLocked || 0), 0);
    out.readyCount = jobs.filter((j) => j.roster.length && !j.escrowFrozen).length;
  } else {
    out.available = await available(uid);
    const jobs = await Job.find({ 'roster.worker': uid, paid: false, status: { $in: ['in_progress', 'completed'] } });
    out.pending = jobs.reduce((n, j) => n + payoutFor(j, j.roster.find((r) => String(r.worker) === req.user.id)).total, 0);
  }
  res.json(out);
}));

router.get('/', wrap(async (req, res) => {
  res.json(await Payment.find({ $or: [{ payer: req.user.id }, { payee: req.user.id }] }).sort({ createdAt: -1 }).limit(50)
    .populate('job', 'title').populate('payee', 'name').populate('payer', 'businessName name'));
}));

router.get('/:id', wrap(async (req, res) => {
  const p = await Payment.findById(req.params.id).populate('job', 'title location startDate durationDays dailyWage roster paid')
    .populate('payee', 'name trade payoutMethods').populate('payer', 'businessName name');
  if (!p) throw fail(404, 'Payment not found');
  if (![String(p.payer?._id), String(p.payee?._id)].includes(req.user.id)) throw fail(403, 'Not allowed');
  const o = p.toObject();
  if (o.payee) delete o.payee.payoutMethods;
  res.json(o);
}));

// either party can keep a private note on a payment
router.put('/:id/note', wrap(async (req, res) => {
  const p = await Payment.findById(req.params.id);
  if (!p || ![String(p.payer), String(p.payee)].includes(req.user.id)) throw fail(404, 'Payment not found');
  p.note = (req.body.note || '').slice(0, 300);
  await p.save();
  res.json({ note: p.note });
}));

// worker confirms they received the money (adds to the audit trail)
router.post('/:id/confirm', only('worker'), wrap(async (req, res) => {
  const p = await Payment.findOne({ _id: req.params.id, payee: req.user.id, kind: 'wage' });
  if (!p) throw fail(404, 'Payment not found');
  if (p.confirmedAt) throw fail(409, 'Receipt already confirmed');
  p.confirmedAt = new Date();
  p.audit.push({ label: 'Worker confirmed receipt' });
  await p.save();
  res.json(p);
}));

// worker cash-out of earned wages
router.post('/withdraw', only('worker'), wrap(async (req, res) => {
  const mongoose = require('mongoose');
  const uid = new mongoose.Types.ObjectId(req.user.id);
  const user = await User.findById(uid);
  const method = user.payoutMethods.find((m) => m.primary) || user.payoutMethods[0];
  if (!method) throw fail(400, 'Add a settlement method first');
  const avail = await available(uid);
  const amount = req.body.amount !== undefined ? Number(req.body.amount) : avail;
  if (!(amount > 0)) throw fail(400, 'Nothing to withdraw yet');
  if (amount > avail) throw fail(400, `You can withdraw up to Rs. ${avail}`);
  const p = await Payment.create({ kind: 'withdrawal', payer: uid, payee: uid, amount, method: method.method, reference: ref('VK-WD'),
    audit: [{ label: 'Withdrawal requested' }, { label: `Sent to ${method.method}` }] });
  res.status(201).json(p);
}));

// employer vault top-up
router.post('/topup', only('employer'), wrap(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!(amount > 0) || amount > 5000000) throw fail(400, 'Enter a valid amount');
  const user = await User.findByIdAndUpdate(req.user.id, { $inc: { vault: amount } }, { new: true });
  await Payment.create({ kind: 'topup', payer: req.user.id, payee: req.user.id, amount, method: req.body.method || 'Commercial Bank SLIPS', reference: ref('VK-TOP') });
  res.status(201).json({ vault: user.vault });
}));

module.exports = router;
