const mongoose = require('mongoose');

// Review an employer writes about a worker (shown on the worker's public profile)
const WorkerReviewSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 },
    jobTitle: { type: String, default: '' },
    helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

WorkerReviewSchema.index({ employer: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('WorkerReview', WorkerReviewSchema);
