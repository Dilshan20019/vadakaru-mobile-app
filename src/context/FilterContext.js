import React, { createContext, useContext, useState } from 'react';

export const DEFAULT_FILTERS = {
  trades: [],
  minWage: null,
  maxWage: null,
  maxDistance: null,
  closestFirst: false,
  startWithin: null, // 'today' | 'tomorrow' | '3days'
  duration: null, // '1' | '2-6' | '7+'
  perks: [],
  verified: false,
};

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const reset = () => setFilters(DEFAULT_FILTERS);

  const activeCount = (f = filters) =>
    (f.trades.length ? 1 : 0) +
    (f.minWage != null || f.maxWage != null ? 1 : 0) +
    (f.maxDistance ? 1 : 0) +
    (f.closestFirst ? 1 : 0) +
    (f.startWithin ? 1 : 0) +
    (f.duration ? 1 : 0) +
    (f.perks.length ? 1 : 0) +
    (f.verified ? 1 : 0);

  // Convert filter state into query params for GET /jobs
  const toParams = (f = filters) => {
    const p = {};
    if (f.trades.length) p.trades = f.trades.join(',');
    if (f.minWage != null) p.minWage = f.minWage;
    if (f.maxWage != null) p.maxWage = f.maxWage;
    if (f.maxDistance) p.maxDistance = f.maxDistance;
    if (f.closestFirst) p.sort = 'nearest';
    if (f.startWithin) p.startWithin = f.startWithin;
    if (f.duration) p.duration = f.duration;
    if (f.perks.length) p.perks = f.perks.join(',');
    if (f.verified) p.verified = 'true';
    return p;
  };

  return <FilterContext.Provider value={{ filters, setFilters, reset, activeCount, toParams }}>{children}</FilterContext.Provider>;
}

export const useFilters = () => useContext(FilterContext);
