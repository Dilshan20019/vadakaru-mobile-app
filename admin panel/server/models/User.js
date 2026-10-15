const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['worker', 'employer'], default: 'worker' },
    fullName: { type: String, required: true, trim: true },
    displayName: { type: String, default: '', trim: true },
    phone: { type: String, required: true, trim: true },
    nic: { type: String, default: '', trim: true },
    nicVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    homeDistrict: { type: String, default: '' },
    nearestTown: { type: String, default: '' },
    workTowns: [{ type: String }],
    primaryTrade: { type: String, default: '' },
    secondaryTrade: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    authority: { type: String, default: 'Helper' },
    wage: {
      fullDay: { type: Number, default: 3500 },
      halfDay: { type: Number, default: 2000 },
      overtimeRate: { type: Number, default: 500 },
      payoutMethod: { type: String, default: 'cash' },
    },
    availableToday: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
    onboardingComplete: { type: Boolean, default: false },

    // Employer fields
    companyName: { type: String, default: '' },
    industry: { type: String, default: '' },
    tier: { type: String, default: '' },
    brNumber: { type: String, default: '' },
    brVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
