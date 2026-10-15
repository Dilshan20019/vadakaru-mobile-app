// Sri Lankan NIC: old format 9 digits + V/X, new format 12 digits
const NIC_REGEX = /^(\d{9}[vVxX]|\d{12})$/;

// Sri Lankan mobile: +94 7X XXX XXXX (also accepts 07X XXX XXXX)
function normalizePhone(input = '') {
  const digits = String(input).replace(/[^\d+]/g, '');
  if (/^07\d{8}$/.test(digits)) return '+94' + digits.slice(1);
  if (/^94\d{9}$/.test(digits)) return '+' + digits;
  if (/^\+94\d{9}$/.test(digits)) return digits;
  return null;
}

function isValidNic(nic) {
  return NIC_REGEX.test(String(nic || '').trim());
}

module.exports = { normalizePhone, isValidNic };
