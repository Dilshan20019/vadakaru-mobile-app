const mongoose = require('mongoose');

const LEVELS = ['Beginner', 'Mid Level', 'Advanced', 'Expert', 'Master'];

const SpecializationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  level: { type: String, enum: LEVELS, default: 'Mid Level' },
});

const CertificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  issuer: { type: String, default: '' },
  certNo: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  verified: { type: Boolean, default: false },
});

const ToolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mastery: { type: String, enum: ['Competent', 'Expert'], default: 'Competent' },
  owned: { type: Boolean, default: true },
});

const PortfolioSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: '' },
});

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['worker', 'employer'], default: 'worker' },
    fullName: { type: String, required: true, trim: true },
    displayName: { type: String, default: '', trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    nic: { type: String, default: '', trim: true },
    nicVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    language: { type: String, enum: ['en', 'si', 'ta'], default: 'en' },
    avatarUrl: { type: String, default: '' },

    // Location setup
    homeDistrict: { type: String, default: '' },
    nearestTown: { type: String, default: '' },
    workTowns: [{ type: String }],
    travelRadius: { type: Number, default: 15, min: 3, max: 100 },
    location: { lat: Number, lng: Number },
    transport: [{ type: String }],
    stayOnSite: { type: Boolean, default: false },
    urgentAlerts: { type: Boolean, default: true },

    // Trades & skills
    primaryTrade: { type: String, default: '' },
    secondaryTrade: { type: String, default: '' },
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },
    authority: { type: String, default: 'Helper' },
    specializations: [SpecializationSchema],
    seasonalTradesEnabled: { type: Boolean, default: false },
    certifications: [CertificationSchema],
    tools: [ToolSchema],
    portfolio: [PortfolioSchema],

    // Wage preferences
    wage: {
      fullDay: { type: Number, default: 3500, min: 0 },
      halfDay: { type: Number, default: 2000, min: 0 },
      overtimeRate: { type: Number, default: 500, min: 0 },
      payoutMethod: { type: String, enum: ['cash', 'bank', 'weekly'], default: 'cash' },
      addOns: {
        masterTools: { type: Boolean, default: false },
        siteTravel: { type: Boolean, default: false },
        leadBaas: { type: Boolean, default: false },
      },
    },

    availableToday: { type: Boolean, default: false },
    emergency: { name: { type: String, default: '' }, phone: { type: String, default: '' } },

    // Stats
    rating: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
    onboardingComplete: { type: Boolean, default: false },

    // Employer fields
    companyName: { type: String, default: '' },
    industry: { type: String, default: '' },
    authorizedRep: { type: String, default: '' },
    invoiceEmail: { type: String, default: '' },
    yardLocation: { type: String, default: '' },
    about: { type: String, default: '', maxlength: 500 },
    establishedYear: { type: Number },
    tier: { type: String, default: '' },
    brNumber: { type: String, default: '' },
    brVerified: { type: Boolean, default: false },
    onTimePayRate: { type: Number, default: 100 },
    facilities: {
      dailyPayout: { type: Boolean, default: false },
      transport: { type: Boolean, default: false },
      ppe: { type: Boolean, default: false },
      teaSnack: { type: Boolean, default: false },
      overtime: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
module.exports.LEVELS = LEVELS;
