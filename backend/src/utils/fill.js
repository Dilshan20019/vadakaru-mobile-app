const Job = require('../models/Job');
const Application = require('../models/Application');

// Escape user input before building a RegExp (prevents invalid-pattern errors / ReDoS)
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// When an accepted worker leaves, re-open a filled job and restore the other applicants
async function syncJobFill(jobId) {
  const job = await Job.findById(jobId);
  if (!job) return;
  const accepted = await Application.countDocuments({ job: job._id, status: 'accepted' });
  if (job.status === 'filled' && accepted < job.workersNeeded) {
    job.status = 'open';
    await job.save();
    await Application.updateMany({ job: job._id, status: 'filled' }, { status: 'pending' });
  }
}

module.exports = { esc, syncJobFill };
