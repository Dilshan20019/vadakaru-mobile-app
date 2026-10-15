const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { isValidNic, normalizePhone } = require('../utils/validators');

const router = express.Router();
router.use(auth);

// Fields a user may change directly through PUT /api/profile
const EDITABLE = [
  'fullName', 'displayName', 'language', 'avatarUrl', 'nic',
  'homeDistrict', 'nearestTown', 'travelRadius', 'location', 'transport',
  'stayOnSite', 'urgentAlerts', 'primaryTrade', 'secondaryTrade',
  'experienceYears', 'authority', 'seasonalTradesEnabled', 'availableToday',
  'emergency', 'onboardingComplete', 'role', 'companyName',
  // employer profile
  'industry', 'authorizedRep', 'invoiceEmail', 'yardLocation', 'about', 'establishedYear', 'facilities', 'brNumber',
];

// READ profile
router.get('/', (req, res) => res.json({ user: req.user }));

// UPDATE profile (partial)
router.put('/', async (req, res) => {
  try {
    const body = req.body;
    if (body.nic && !isValidNic(body.nic)) {
      return res.status(400).json({ message: 'Enter a valid NIC (9 digits + V/X, or 12 digits)' });
    }
    if (body.phone) {
      const phone = normalizePhone(body.phone);
      if (!phone) return res.status(400).json({ message: 'Enter a valid Sri Lankan mobile number' });
      const taken = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (taken) return res.status(409).json({ message: 'Phone number already in use' });
      req.user.phone = phone;
    }
    // Changing the registered business number requires re-verification (shown in the employer edit screen)
    if (body.brNumber !== undefined && body.brNumber !== req.user.brNumber) req.user.brVerified = false;
    EDITABLE.forEach((key) => {
      if (body[key] !== undefined) req.user[key] = body[key];
    });
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Generic sub-document CRUD: specializations, certifications, tools, */
/* portfolio.  POST adds, PUT /:id edits, DELETE /:id removes.         */
/* ------------------------------------------------------------------ */
function subRoutes(path, field) {
  router.get(`/${path}`, (req, res) => res.json({ items: req.user[field] }));

  router.post(`/${path}`, async (req, res) => {
    try {
      req.user[field].push(req.body);
      await req.user.save();
      res.status(201).json({ items: req.user[field], user: req.user });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  router.put(`/${path}/:id`, async (req, res) => {
    try {
      const item = req.user[field].id(req.params.id);
      if (!item) return res.status(404).json({ message: 'Item not found' });
      item.set(req.body);
      await req.user.save();
      res.json({ items: req.user[field], user: req.user });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });

  router.delete(`/${path}/:id`, async (req, res) => {
    try {
      const item = req.user[field].id(req.params.id);
      if (!item) return res.status(404).json({ message: 'Item not found' });
      item.deleteOne();
      await req.user.save();
      res.json({ items: req.user[field], user: req.user });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
}

subRoutes('specializations', 'specializations');
subRoutes('certifications', 'certifications');
subRoutes('tools', 'tools');
subRoutes('portfolio', 'portfolio');

/* ---------------------------- Work towns ---------------------------- */
router.post('/towns', async (req, res) => {
  const town = (req.body.town || '').trim();
  if (!town) return res.status(400).json({ message: 'Town name is required' });
  if (!req.user.workTowns.includes(town)) req.user.workTowns.push(town);
  await req.user.save();
  res.status(201).json({ workTowns: req.user.workTowns, user: req.user });
});

router.delete('/towns/:town', async (req, res) => {
  req.user.workTowns = req.user.workTowns.filter((t) => t !== req.params.town);
  await req.user.save();
  res.json({ workTowns: req.user.workTowns, user: req.user });
});

/* --------------------------- Wage preferences ------------------------ */
const DISTRICT_DEFAULT = { fullDay: 4500, halfDay: 2600, overtimeRate: 650 };

router.get('/wage', (req, res) => res.json({ wage: req.user.wage }));

router.put('/wage', async (req, res) => {
  try {
    const { fullDay, halfDay, overtimeRate, payoutMethod, addOns } = req.body;
    const w = req.user.wage;
    if (fullDay !== undefined) {
      if (fullDay < 1000 || fullDay > 20000) return res.status(400).json({ message: 'Daily wage must be between LKR 1,000 and 20,000' });
      w.fullDay = fullDay;
    }
    if (halfDay !== undefined) w.halfDay = halfDay;
    if (overtimeRate !== undefined) w.overtimeRate = overtimeRate;
    if (payoutMethod) w.payoutMethod = payoutMethod;
    if (addOns) Object.assign(w.addOns, addOns);
    await req.user.save();
    res.json({ wage: req.user.wage });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// "Reset to district average"
router.delete('/wage', async (req, res) => {
  req.user.wage.set({
    ...DISTRICT_DEFAULT,
    payoutMethod: 'cash',
    addOns: { masterTools: false, siteTravel: false, leadBaas: false },
  });
  await req.user.save();
  res.json({ wage: req.user.wage });
});

module.exports = router;
