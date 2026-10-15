const mongoose = require('mongoose');
const { Schema } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });
const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');
const Review = require('./Review');

const userSchema = new Schema(
  {
    role: { type: String, enum: ['employer', 'worker'], default: 'employer' },
    businessName: String,
    name: { type: String, required: true },
    phone: String,
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    location: String,
    category: String,
    about: { type: String, maxlength: 500 },
    verified: { type: Boolean, default: false },
    // employer
    vault: { type: Number, default: 0 },
    creditScore: { type: Number, default: 50 },
    // worker
    trade: String,
    skills: [String],
    dailyRate: { type: Number, default: 0 },
    available: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    jobsDone: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    distanceKm: Number,
    onTimePct: { type: Number, default: 95 },
    yearsExp: { type: Number, default: 1 },
    nvq: String,
    policeCleared: { type: Boolean, default: false },
    payoutMethods: [{ method: String, account: String, primary: { type: Boolean, default: false } }],
    settings: {
      language: { type: String, default: 'en' },
      overtimeApproval: { type: Boolean, default: true },
      autoSignoff: { type: Boolean, default: false },
      autoRelease: { type: Boolean, default: true },
      jobAlerts: { type: Boolean, default: true },
      directCalls: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const defaultPpe = () => [
  { key: 'helmet', label: 'Hard Hat / Industrial Helmet', checked: false },
  { key: 'boots', label: 'Steel-Toe Safety Boots', checked: false },
  { key: 'vest', label: 'High-Visibility Safety Vest', checked: false },
  { key: 'harness', label: 'Height Safety Harness (>2m scaffolding)', checked: false },
];

const jobSchema = new Schema(
  {
    employer: { ...ref('User'), required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'Masonry' },
    description: String,
    location: String,
    dailyWage: { type: Number, default: 0 },
    travelAllowance: { type: Number, default: 0 },
    workersNeeded: { type: Number, default: 1 },
    durationDays: { type: Number, default: 1 },
    startDate: String,
    startTime: { type: String, default: '07:30' },
    endTime: { type: String, default: '17:30' },
    gate: String,
    status: { type: String, enum: ['draft', 'published', 'in_progress', 'completed', 'cancelled'], default: 'draft' },
    shiftCode: String,
    escrowLocked: { type: Number, default: 0 },
    escrowFrozen: { type: Boolean, default: false },
    paid: { type: Boolean, default: false },
    roster: [{
      worker: ref('User'),
      checkedIn: { type: Boolean, default: false },
      checkInTime: Date,
      absent: { type: Boolean, default: false },
      escrow: { type: Number, default: 0 },
      hours: { type: Number, default: 8 },
      overtimeHours: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      approved: { type: Boolean, default: false },
    }],
    prep: [{ label: String, done: { type: Boolean, default: false } }],
    ppe: { type: [{ key: String, label: String, checked: { type: Boolean, default: false } }], default: defaultPpe },
  },
  { timestamps: true }
);

const applicationSchema = new Schema(
  {
    job: { ...ref('Job'), required: true },
    worker: { ...ref('User'), required: true },
    employer: ref('User'),
    invited: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);
applicationSchema.index({ job: 1, worker: 1 }, { unique: true });

const shortlistSchema = new Schema({ job: ref('Job'), employer: ref('User'), worker: ref('User') }, { timestamps: true });
shortlistSchema.index({ job: 1, worker: 1 }, { unique: true });

const reviewSchema = new Schema(
  {
    job: { ...ref('Job'), required: true },
    author: { ...ref('User'), required: true },
    target: { ...ref('User'), required: true },
    authorRole: String,
    stars: { type: Number, min: 1, max: 5, required: true },
    dimensions: [Number],
    praise: [String],
    note: String,
  },
  { timestamps: true }
);
reviewSchema.index({ job: 1, author: 1, target: 1 }, { unique: true });

const messageSchema = new Schema(
  {
    thread: { type: String, index: true },
    from: ref('User'),
    to: ref('User'),
    job: ref('Job'),
    kind: { type: String, enum: ['text', 'location', 'photo', 'system'], default: 'text' },
    text: String,
    image: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const paymentSchema = new Schema(
  {
    kind: { type: String, enum: ['wage', 'withdrawal', 'topup'], default: 'wage' },
    job: ref('Job'),
    payer: ref('User'),
    payee: ref('User'),
    amount: { type: Number, required: true },
    breakdown: { base: Number, overtime: Number, travel: Number, bonus: Number },
    method: String,
    reference: String,
    note: String,
    confirmedAt: Date,
    status: { type: String, enum: ['paid', 'disputed'], default: 'paid' },
    audit: [{ label: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

const disputeSchema = new Schema(
  {
    job: { ...ref('Job'), required: true },
    payment: ref('Payment'),
    raisedBy: ref('User'),
    against: ref('User'),
    category: String,
    description: { type: String, required: true },
    amount: Number,
    status: { type: String, enum: ['open', 'under_review', 'resolved'], default: 'open' },
    evidence: { checkins: Number, chats: Number, gps: Boolean },
  },
  { timestamps: true }
);

const reportSchema = new Schema(
  {
    author: ref('User'),
    type: { type: String, default: 'Other' },
    description: { type: String, required: true, maxlength: 500 },
    screenshot: String,
    job: ref('Job'),
    status: { type: String, enum: ['submitted', 'in_review', 'closed'], default: 'submitted' },
  },
  { timestamps: true }
);

const safetySchema = new Schema(
  {
    job: ref('Job'),
    author: ref('User'),
    kind: { type: String, enum: ['sos', 'hazard', 'incident', 'ppe_request'], required: true },
    note: String,
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = {
  User,
  Job,
  Application,
  Shortlist: mongoose.model('Shortlist', shortlistSchema),
  Review,
  Message: mongoose.model('Message', messageSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Dispute: mongoose.model('Dispute', disputeSchema),
  Report: mongoose.model('Report', reportSchema),
  Safety: mongoose.model('Safety', safetySchema),
};
