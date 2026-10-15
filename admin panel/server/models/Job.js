const mongoose = require('mongoose');

// Standalone model definition matching the mobile app database schema
const JobSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, trim: true },
    trade: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    scope: [{ type: String }],
    requirements: [{ type: String }],
    district: { type: String, required: true, trim: true },
    town: { type: String, default: '', trim: true },
    lat: { type: Number },
    lng: { type: Number },
    dailyWage: { type: Number, required: true, min: 0 },
    days: { type: Number, default: 1, min: 1 },
    workersNeeded: { type: Number, default: 1, min: 1 },
    startDate: { type: String, default: '' },
    shiftStart: { type: String, default: '07:30' },
    shiftHours: { type: Number, default: 8 },
    urgent: { type: Boolean, default: false },
    escrow: { type: Boolean, default: true },
    perks: {
      meals: { type: Boolean, default: false },
      transport: { type: Boolean, default: false },
      cashPayout: { type: Boolean, default: false },
      accommodation: { type: Boolean, default: false },
      fairPay: { type: Boolean, default: true },
      overtime: { type: Boolean, default: false },
    },
    status: { type: String, enum: ['open', 'filled', 'closed', 'completed'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', JobSchema);
