const router = require('express').Router();
const { Dispute, Job, Payment, Message } = require('../models');
const { auth, wrap, fail } = require('../middleware/auth');

router.use(auth);
const POP = [['job', 'title location escrowLocked escrowFrozen paid'], ['raisedBy', 'name businessName'], ['against', 'name businessName']];
const withPop = (q) => POP.reduce((x, [p, s]) => x.populate(p, s), q);

const involved = (job, uid) => String(job.employer) === uid || job.roster.some((r) => String(r.worker) === uid);
const refreeze = async (jobId) => {
  const open = await Dispute.countDocuments({ job: jobId, status: { $in: ['open', 'under_review'] } });
  await Job.updateOne({ _id: jobId }, { escrowFrozen: open > 0 });
};

router.get('/', wrap(async (req, res) => {
  const f = { $or: [{ raisedBy: req.user.id }, { against: req.user.id }] };
  if (req.query.job) f.job = req.query.job;
  res.json(await withPop(Dispute.find(f).sort({ createdAt: -1 })));
}));

router.get('/:id', wrap(async (req, res) => {
  const d = await withPop(Dispute.findById(req.params.id));
  if (!d) throw fail(404, 'Dispute not found');
  res.json(d);
}));

// raise a dispute -> freezes the shift's escrow
router.post('/', wrap(async (req, res) => {
  const { jobId, paymentId, category, description } = req.body;
  if (!category) throw fail(400, 'Choose a dispute category');
  if ((description || '').trim().length < 10) throw fail(400, 'Please describe the problem (at least 10 characters)');
  const job = await Job.findById(jobId);
  if (!job) throw fail(404, 'Job not found');
  if (!involved(job, req.user.id)) throw fail(403, 'You are not part of this job');
  if (await Dispute.exists({ job: jobId, raisedBy: req.user.id, status: { $in: ['open', 'under_review'] } }))
    throw fail(409, 'You already have an open dispute for this job');
  const pay = paymentId ? await Payment.findById(paymentId) : null;
  const isEmp = req.user.role === 'employer';
  const against = isEmp ? job.roster[0]?.worker : job.employer;
  const amount = Number(req.body.amount) || pay?.amount || job.escrowLocked || 0;
  const d = await Dispute.create({
    job: jobId, payment: pay?._id, raisedBy: req.user.id, against, category, description: description.trim(), amount,
    evidence: { checkins: job.roster.filter((r) => r.checkedIn).length, chats: await Message.countDocuments({ job: jobId }), gps: true },
  });
  if (pay) await Payment.updateOne({ _id: pay._id }, { status: 'disputed' });
  await Job.updateOne({ _id: jobId }, { escrowFrozen: true });
  res.status(201).json(await withPop(Dispute.findById(d._id)));
}));

router.put('/:id', wrap(async (req, res) => {
  const d = await Dispute.findById(req.params.id);
  if (!d || String(d.raisedBy) !== req.user.id) throw fail(404, 'Dispute not found');
  if (d.status === 'resolved') throw fail(400, 'Resolved disputes cannot be changed');
  if (req.body.description !== undefined) {
    if (req.body.description.trim().length < 10) throw fail(400, 'Please describe the problem (at least 10 characters)');
    d.description = req.body.description.trim();
  }
  if (req.body.category) d.category = req.body.category;
  if (req.body.status === 'under_review') d.status = 'under_review'; // escalate to Vedakaru
  await d.save();
  res.json(await withPop(Dispute.findById(d._id)));
}));

// withdraw: removes the dispute and unfreezes escrow
router.delete('/:id', wrap(async (req, res) => {
  const d = await Dispute.findById(req.params.id);
  if (!d || String(d.raisedBy) !== req.user.id) throw fail(404, 'Dispute not found');
  await d.deleteOne();
  if (d.payment) await Payment.updateOne({ _id: d.payment }, { status: 'paid' });
  await refreeze(d.job);
  res.json({ withdrawn: true });
}));

module.exports = router;
