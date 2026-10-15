// Run once:  npm run seed
// Creates demo worker + employer, sample jobs, reviews and one accepted shift.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Review = require('./models/Review');
const SavedJob = require('./models/SavedJob');
const JobAlert = require('./models/JobAlert');
const WorkerReview = require('./models/WorkerReview');
const SavedWorker = require('./models/SavedWorker');
const Invitation = require('./models/Invitation');
const { colomboDate } = require('./utils/dates');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hash = await bcrypt.hash('demo1234', 10);

  const old = await User.find({ phone: { $in: ['+94771234567', '+94712345678', '+94773334444', '+94772000001', '+94772000002', '+94772000003', '+94772000004'] } });
  const oldIds = old.map((u) => u._id);
  await Promise.all([
    Job.deleteMany({ employer: { $in: oldIds } }),
    Application.deleteMany({ worker: { $in: oldIds } }),
    Review.deleteMany({ $or: [{ employer: { $in: oldIds } }, { worker: { $in: oldIds } }] }),
    SavedJob.deleteMany({ worker: { $in: oldIds } }),
    WorkerReview.deleteMany({ $or: [{ employer: { $in: oldIds } }, { worker: { $in: oldIds } }] }),
    SavedWorker.deleteMany({ $or: [{ employer: { $in: oldIds } }, { worker: { $in: oldIds } }] }),
    Invitation.deleteMany({ $or: [{ employer: { $in: oldIds } }, { worker: { $in: oldIds } }] }),
    JobAlert.deleteMany({ worker: { $in: oldIds } }),
    User.deleteMany({ _id: { $in: oldIds } }),
  ]);

  const worker = await User.create({
    role: 'worker', fullName: 'Kasun Chamara Perera', displayName: 'Kasun Baas', phone: '+94771234567',
    password: hash, nic: '892451234V', nicVerified: true, phoneVerified: true,
    homeDistrict: 'Gampaha', nearestTown: 'Negombo', workTowns: ['Negombo', 'Ja-Ela', 'Katunayake'],
    location: { lat: 7.1693, lng: 79.8849 },
    travelRadius: 15, transport: ['Public Bus', 'Motorbike'], stayOnSite: true, urgentAlerts: true,
    primaryTrade: 'Mason', secondaryTrade: 'Reinforced Concreting & Formwork', experienceYears: 7, authority: 'Master Baas',
    specializations: [
      { name: 'Brick & Hollow Block Laying', level: 'Advanced' },
      { name: 'Wall Plastering & Skim Coating', level: 'Master' },
      { name: 'Reinforced Concrete Slab Casting', level: 'Advanced' },
    ],
    certifications: [{ title: 'NVQ Level 4 - Masonry & Concreting', issuer: 'TVEC / NAITA Sri Lanka', certNo: 'SL-NVQ-2019-88412', verified: true }],
    tools: [
      { name: 'Laser & Optical Level Instrument', mastery: 'Expert' },
      { name: 'Complete Trowels & Finishing Floats Set', mastery: 'Competent' },
    ],
    wage: { fullDay: 4500, halfDay: 2600, overtimeRate: 650, payoutMethod: 'cash' },
    rating: 4.9, jobsCompleted: 142, availableToday: true, onboardingComplete: true,
    emergency: { name: 'Nimali Perera (Spouse)', phone: '+94719876543' },
  });

  const employer = await User.create({
    role: 'employer', fullName: 'Ananda Perera', companyName: 'Perera Constructions & Builders (Pvt) Ltd',
    phone: '+94712345678', password: hash, homeDistrict: 'Gampaha', onboardingComplete: true,
    industry: 'Residential Construction & Masonry', authorizedRep: 'Ananda Perera (Managing Director)',
    invoiceEmail: 'contact@pereraconstructions.lk', yardLocation: 'Nawala, Rajagiriya (Colombo District)',
    about: 'Specialized in residential construction, concrete slab casting, tiling and general labor contracting across Western Province. Guaranteed timely daily wages.',
    establishedYear: 2014, tier: 'Tier-1 (M-4)', brNumber: 'PV 00224891', brVerified: true, onTimePayRate: 99,
    facilities: { dailyPayout: true, transport: true, ppe: true, teaSnack: true, overtime: false },
  });

  const employer2 = await User.create({
    role: 'employer', fullName: 'Sunil Silva', companyName: 'Silva Residence', phone: '+94773334444',
    password: hash, homeDistrict: 'Gampaha', onboardingComplete: true, brVerified: false,
  });

  const perks = (o) => ({ fairPay: true, ...o });
  const jobs = await Job.insertMany([
    { employer: employer._id, title: 'Mason Needed for House Extension', trade: 'Mason', district: 'Gampaha', town: 'Negombo', lat: 7.2083, lng: 79.8358, dailyWage: 4500, days: 5, workersNeeded: 2, startDate: colomboDate(1), shiftStart: '08:00', urgent: false, perks: perks({ meals: true, transport: true }), description: 'Brick and block laying for a ground-floor extension.', scope: ['Lay hollow block walls to lintel level', 'Plaster internal walls', 'Clean site daily'], requirements: ['NVQ or 3+ years masonry', 'Own trowels and level'] },
    { employer: employer._id, title: 'Master Mason for 2-Storey House Extension', trade: 'Mason', district: 'Gampaha', town: 'Kurana', lat: 7.2250, lng: 79.8500, dailyWage: 4500, days: 5, workersNeeded: 1, startDate: colomboDate(1), shiftStart: '07:30', urgent: false, perks: perks({ meals: true, transport: true, cashPayout: true }), description: 'Lead the masonry crew on a two-storey extension.', scope: ['Set out and lay brickwork', 'Supervise 2 helpers', 'Check levels with laser'], requirements: ['Master-level experience', 'Own laser level preferred'] },
    { employer: employer2._id, title: 'Master Carpenter for Door & Window Framing', trade: 'Carpenter', district: 'Gampaha', town: 'Kadawatha', lat: 7.0010, lng: 79.9500, dailyWage: 5200, days: 3, workersNeeded: 1, startDate: colomboDate(0), shiftStart: '07:00', urgent: true, perks: perks({ meals: true, cashPayout: true, overtime: true }), description: 'Urgent framing work, immediate payout.' },
    { employer: employer._id, title: 'Commercial Warehouse Brickwork', trade: 'Mason', district: 'Gampaha', town: 'Ja-Ela', lat: 7.0744, lng: 79.8919, dailyWage: 4800, days: 6, workersNeeded: 3, startDate: colomboDate(2), perks: perks({ transport: true }), description: 'Boundary and partition walls for a warehouse.' },
    { employer: employer2._id, title: 'General Site Helper & Material Loader', trade: 'Helper / Labourer', district: 'Gampaha', town: 'Peliyagoda', lat: 6.9660, lng: 79.8890, dailyWage: 3800, days: 2, workersNeeded: 3, startDate: colomboDate(2), perks: perks({ cashPayout: true }), description: 'Loading and carrying building materials.' },
    { employer: employer._id, title: 'Electrician - House Rewiring', trade: 'Electrician', district: 'Gampaha', town: 'Wattala', lat: 6.9894, lng: 79.8918, dailyWage: 5500, days: 4, workersNeeded: 1, startDate: colomboDate(3), perks: perks({ meals: true }), description: 'Full rewiring of a single-storey house.' },
    { employer: employer._id, title: 'Two-Story Slab Casting', trade: 'Mason', district: 'Colombo', town: 'Nawala', dailyWage: 4500, days: 4, workersNeeded: 6, startDate: colomboDate(-30), status: 'completed', perks: perks({}) },
    { employer: employer._id, title: 'Living Room Tile Fitting', trade: 'Tile Setter', district: 'Colombo', town: 'Malabe', dailyWage: 3800, days: 2, workersNeeded: 2, startDate: colomboDate(-60), status: 'completed', perks: perks({}) },
    { employer: employer2._id, title: 'Boundary Wall Plastering', trade: 'Mason', district: 'Gampaha', town: 'Katunayake', lat: 7.1697, lng: 79.8841, dailyWage: 4200, days: 2, workersNeeded: 1, startDate: colomboDate(1), status: 'filled', perks: perks({}), description: 'Position already filled by another craftsman.' },
  ]);

  await Review.insertMany([
    { employer: employer._id, worker: worker._id, rating: 5, comment: 'Wages were paid daily at 5:00 PM without any delay. Transport and tea provided as promised.' },
  ]);

  // an accepted shift (for Upcoming Work / Attendance) and a pending one (for Application Status)
  await Application.create({ job: jobs[1]._id, worker: worker._id, status: 'accepted' });
  await Application.create({ job: jobs[3]._id, worker: worker._id, status: 'pending' });
  await Application.create({ job: jobs[5]._id, worker: worker._id, status: 'shortlisted', viewedByEmployer: true });
  await Application.create({ job: jobs[8]._id, worker: worker._id, status: 'filled' });
  await SavedJob.create({ worker: worker._id, job: jobs[2]._id });
  // more craftsmen so Find Workers / Recommended Workers have something to show
  const mk = (n, o) => User.create({ role: 'worker', password: hash, phoneVerified: true, onboardingComplete: true, language: 'en', phone: `+9477200000${n}`, ...o });
  const [w2, w3, w4, w5] = await Promise.all([
    mk(1, { fullName: 'Nimal Fernando', displayName: 'Nimal', homeDistrict: 'Gampaha', nearestTown: 'Ja-Ela', location: { lat: 7.0744, lng: 79.8919 }, primaryTrade: 'Mason', experienceYears: 12, authority: 'Master Baas', nicVerified: true, wage: { fullDay: 5000, halfDay: 2800, overtimeRate: 700 }, rating: 4.7, jobsCompleted: 210, availableToday: true, specializations: [{ name: 'Stone Masonry', level: 'Master' }] }),
    mk(2, { fullName: 'Saman Kumara', displayName: 'Saman', homeDistrict: 'Gampaha', nearestTown: 'Wattala', location: { lat: 6.9894, lng: 79.8918 }, primaryTrade: 'Electrician', experienceYears: 6, authority: 'Skilled Worker', nicVerified: true, wage: { fullDay: 5500, halfDay: 3000, overtimeRate: 750 }, rating: 4.5, jobsCompleted: 88, availableToday: false, specializations: [{ name: 'House Wiring', level: 'Advanced' }] }),
    mk(3, { fullName: 'Ruwan Jayasinghe', displayName: 'Ruwan', homeDistrict: 'Colombo', nearestTown: 'Malabe', location: { lat: 6.9061, lng: 79.9696 }, primaryTrade: 'Carpenter', experienceYears: 9, authority: 'Skilled Worker', nicVerified: false, wage: { fullDay: 5200, halfDay: 2900, overtimeRate: 700 }, rating: 4.2, jobsCompleted: 120, availableToday: true, specializations: [{ name: 'Door & Window Framing', level: 'Expert' }] }),
    mk(4, { fullName: 'Chaminda Silva', displayName: 'Chaminda', homeDistrict: 'Gampaha', nearestTown: 'Katunayake', location: { lat: 7.1697, lng: 79.8841 }, primaryTrade: 'Helper / Labourer', experienceYears: 2, authority: 'Helper', nicVerified: true, wage: { fullDay: 3200, halfDay: 1800, overtimeRate: 400 }, rating: 4.0, jobsCompleted: 25, availableToday: true }),
  ]);
  await WorkerReview.insertMany([
    { employer: employer._id, worker: worker._id, rating: 5, comment: 'Excellent finishing on the plastered walls. Arrived early every day and kept the site clean.', jobTitle: 'Two-Story Slab Casting' },
    { employer: employer2._id, worker: worker._id, rating: 4, comment: 'Skilled and reliable. Needed little supervision.', jobTitle: 'Boundary Wall Plastering' },
    { employer: employer._id, worker: w2._id, rating: 5, comment: 'Best stone mason we have hired.', jobTitle: 'Living Room Tile Fitting' },
    { employer: employer2._id, worker: w3._id, rating: 4, comment: 'Good framing work, a little late on day one.', jobTitle: 'Door & Window Framing' },
  ]);
  await SavedWorker.create({ employer: employer._id, worker: w2._id });
  await Invitation.create({ employer: employer._id, worker: worker._id, job: jobs[3]._id, message: 'We need an experienced mason for the warehouse walls. Can you join from Monday?' });
  await Application.create({ job: jobs[0]._id, worker: w2._id, status: 'pending' });
  await Application.create({ job: jobs[0]._id, worker: w4._id, status: 'shortlisted', viewedByEmployer: true });
  await Application.create({ job: jobs[5]._id, worker: w3._id, status: 'pending' });

  await JobAlert.create({ worker: worker._id, label: 'Mason • Gampaha', trade: 'Mason', district: 'Gampaha', minWage: 4000 });

  console.log('Seeded.  Worker: 0771234567 / demo1234   Employer: 0712345678 / demo1234');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
