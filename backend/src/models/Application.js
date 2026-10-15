const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  checkInAt: { type: Date },
  checkOutAt: { type: Date },
});

const ToolPrepSchema = new mongoose.Schema({
  label: { type: String, required: true },
  done: { type: Boolean, default: false },
});

// Checklist shown on "Upcoming Work" once a shift is confirmed
const DEFAULT_TOOL_PREP = [
  'Masonry trowel set (cleaned & checked)',
  'Spirit level & measuring tape',
  'NIC (National Identity Card)',
  'Wake-up alarm set',
];

const ApplicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'shortlisted', 'accepted', 'rejected', 'filled'], default: 'pending' },
    note: { type: String, default: '' },
    refCode: { type: String },
    viewedByEmployer: { type: Boolean, default: false },
    reminder: { type: Boolean, default: false }, // wake-up reminder for the first shift
    toolPrep: [ToolPrepSchema],
    attendance: [AttendanceSchema],
  },
  { timestamps: true }
);

ApplicationSchema.pre('validate', function () {
  if (!this.refCode) {
    this.refCode = `VK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10 + Math.random() * 90)}`;
  }
  if (this.status === 'accepted' && this.toolPrep.length === 0) {
    this.toolPrep = DEFAULT_TOOL_PREP.map((label) => ({ label }));
  }
});

ApplicationSchema.index({ job: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
