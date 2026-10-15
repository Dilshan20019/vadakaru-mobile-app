const mongoose = require('mongoose');

// Employer invites a specific worker to apply for / join a job
const InvitationSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    message: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  { timestamps: true }
);
InvitationSchema.index({ job: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model('Invitation', InvitationSchema);
