const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { normalizePhone, isValidNic } = require('../utils/validators');

const router = express.Router();

const sign = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// CREATE account
router.post('/register', async (req, res) => {
  try {
    const { fullName, phone, password, role, nic, language, homeDistrict, nearestTown, companyName } = req.body;

    if (!fullName || !phone || !password) {
      return res.status(400).json({ message: 'Full name, phone and password are required' });
    }
    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ message: 'Enter a valid Sri Lankan mobile number' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (nic && !isValidNic(nic)) return res.status(400).json({ message: 'Enter a valid NIC (9 digits + V/X, or 12 digits)' });

    if (await User.findOne({ phone: normalized })) {
      return res.status(409).json({ message: 'This phone number is already registered' });
    }

    const user = await User.create({
      fullName,
      displayName: fullName.split(' ')[0],
      phone: normalized,
      password: await bcrypt.hash(password, 10),
      role: role === 'employer' ? 'employer' : 'worker',
      nic: nic || '',
      language: language || 'en',
      homeDistrict: homeDistrict || '',
      nearestTown: nearestTown || '',
      companyName: companyName || '',
    });

    res.status(201).json({ token: sign(user), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const { password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'Phone and password are required' });

    const user = await User.findOne({ phone }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Incorrect phone number or password' });
    }
    res.json({ token: sign(user), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// READ current user
router.get('/me', auth, (req, res) => res.json({ user: req.user }));

// UPDATE password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await bcrypt.compare(currentPassword || '', user.password))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE account
router.delete('/me', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
