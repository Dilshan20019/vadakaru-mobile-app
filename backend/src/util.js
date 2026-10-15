const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const threadKey = (a, b) => [String(a), String(b)].sort().join('_');

// simple, explainable match score (0-99): trade/skill fit + rating + availability + distance
const matchScore = (w, job) => {
  let s = 55;
  if (job && job.category) {
    const rx = new RegExp(esc(job.category), 'i');
    if (rx.test(w.trade || '') || (w.skills || []).some((k) => rx.test(k))) s += 25;
  }
  s += Math.round(((w.rating || 0) / 5) * 12);
  if (w.available) s += 3;
  if (w.distanceKm != null && w.distanceKm <= 5) s += 5;
  return Math.min(99, s);
};

const BUFFER = 1000; // refundable safety buffer locked with each hire
const escrowBreakdown = (job) => {
  const wage = (job.dailyWage || 0) * (job.durationDays || 1);
  const travel = (job.travelAllowance || 0) * (job.durationDays || 1);
  return { wage, travel, fee: 0, buffer: BUFFER, total: wage + travel + BUFFER };
};

// what a worker earns on a shift (used for both preview and release)
const payoutFor = (job, e) => {
  const ot = Math.round((job.dailyWage || 0) / 8 * 1.5);
  const base = e.absent ? 0 : (job.dailyWage || 0) * (job.durationDays || 1);
  const travel = e.absent ? 0 : (job.travelAllowance || 0) * (job.durationDays || 1);
  const overtime = (e.overtimeHours || 0) * ot;
  const bonus = e.bonus || 0;
  return { base, overtime, travel, bonus, otRate: ot, total: base + overtime + travel + bonus };
};

module.exports = { esc, threadKey, matchScore, escrowBreakdown, payoutFor, BUFFER };
