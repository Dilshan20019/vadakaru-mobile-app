export const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota',
  'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle',
];

export const TRADES = [
  'Mason', 'Helper / Labourer', 'Carpenter', 'Painter', 'Plumber',
  'Blacksmith', 'Electrician', 'Welder', 'Tile Setter',
];

export const AUTHORITY = ['Helper', 'Skilled Worker', 'Site Lead / Baas', 'Master Baas'];
export const LEVELS = ['Beginner', 'Mid Level', 'Advanced', 'Expert', 'Master'];
export const TRANSPORT = ['Public Bus', 'Motorbike', 'Bicycle', 'Three-Wheeler', 'Walking'];

export const SPECIALIZATION_SUGGESTIONS = [
  'Stone Masonry', 'Interlock Paver Laying', 'Exposed Brickwork Finishes',
  'Foundation Formwork & Shoring', 'Waterproofing & DPC Layering',
];

export const PAYOUT_METHODS = [
  { key: 'cash', title: 'Daily Cash on Site', sub: 'Handed in direct cash at 5:00 PM on the day.' },
  { key: 'bank', title: 'Direct Bank Transfer (CEFT)', sub: 'Bank-clearing transfer after each shift.' },
  { key: 'weekly', title: 'Weekly Friday Payout', sub: 'Locked safely in escrow; released on Fridays.' },
];

export const STATUS_OPTIONS = [
  { key: 'open', title: 'Open for Full Day', sub: 'Standard 8-hour shift' },
  { key: 'half', title: 'Morning Half-Day Only', sub: '08:00 AM - 12:30 PM' },
  { key: 'ot', title: 'Evening Emergency OT', sub: '17:00 - 21:00, paid 1.5x' },
  { key: 'off', title: 'Mark as Off / Block Date', sub: 'Private rest, temple day or personal' },
];

export const PERKS = [
  { key: 'meals', label: 'Meals Provided', sub: 'Free lunch and tea at the worksite', icon: 'restaurant-outline' },
  { key: 'transport', label: 'Transport Allowance', sub: 'Bus fare or site pickup', icon: 'bus-outline' },
  { key: 'cashPayout', label: 'Instant Daily Cashout', sub: 'Paid directly at the end of each shift', icon: 'cash-outline' },
  { key: 'accommodation', label: 'Accommodation Provided', sub: 'Overnight boarding for outstation builds', icon: 'bed-outline' },
  { key: 'fairPay', label: 'Fair Pay Guaranteed Only', sub: 'Wage verified by Vedakaru Trust', icon: 'shield-checkmark-outline' },
  { key: 'overtime', label: 'Overtime Bonus', sub: '1.5x after regular hours', icon: 'time-outline' },
];

export const INDUSTRIES = [
  'Residential Construction & Masonry', 'Commercial Construction', 'Interior & Finishing',
  'Electrical & Plumbing Contracting', 'Household / Private Owner',
];

export const FACILITIES = [
  { key: 'dailyPayout', label: 'Daily Wage Payout' },
  { key: 'transport', label: 'Site Transport Provided' },
  { key: 'ppe', label: 'Safety Gear (PPE)' },
  { key: 'teaSnack', label: 'Morning Tea & Snack' },
  { key: 'overtime', label: 'Overtime Bonus (OT)' },
];
