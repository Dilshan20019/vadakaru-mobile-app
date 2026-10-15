const mongoose = require('mongoose');

const STATUSES = ['open', 'half', 'ot', 'off', 'booked'];

const AvailabilitySchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    status: { type: String, enum: STATUSES, required: true },
    rate: { type: Number, default: 0 },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

AvailabilitySchema.index({ worker: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', AvailabilitySchema);
module.exports.STATUSES = STATUSES;
