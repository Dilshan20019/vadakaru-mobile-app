const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

// one review per worker per employer
ReviewSchema.index({ employer: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
