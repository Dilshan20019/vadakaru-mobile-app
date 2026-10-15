const mongoose = require('mongoose');

// Employer bookmarks a worker ("shortlist" of favourite craftsmen)
const SavedWorkerSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
SavedWorkerSchema.index({ employer: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('SavedWorker', SavedWorkerSchema);
