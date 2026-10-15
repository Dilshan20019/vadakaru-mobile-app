const mongoose = require('mongoose');

// A saved search: "tell me when a Mason job above Rs. 4,000 appears in Gampaha"
const JobAlertSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, default: '', trim: true },
    trade: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    minWage: { type: Number, default: 0, min: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobAlert', JobAlertSchema);
