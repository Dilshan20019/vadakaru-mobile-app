import React, { createContext, useContext, useState } from 'react';

export const DEFAULT_WORKER_FILTERS = {
  skills: [],
  maxDistance: null,
  minExp: 0,
  availableToday: false,
  verified: false,
  minRating: 0,
  minWage: null,
  maxWage: null,
};

const Ctx = createContext(null);

export function WorkerFilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_WORKER_FILTERS);
  const reset = () => setFilters(DEFAULT_WORKER_FILTERS);

  const activeCount = (f = filters) =>
    (f.skills.length ? 1 : 0) + (f.maxDistance ? 1 : 0) + (f.minExp ? 1 : 0) + (f.availableToday ? 1 : 0) +
    (f.verified ? 1 : 0) + (f.minRating ? 1 : 0) + (f.minWage != null || f.maxWage != null ? 1 : 0);

  // filter state -> query string params for GET /workers
  const toParams = (f = filters) => {
    const p = {};
    if (f.skills.length) p.skills = f.skills.join(',');
    if (f.maxDistance) p.maxDistance = f.maxDistance;
    if (f.minExp) p.minExp = f.minExp;
    if (f.availableToday) p.availableToday = 'true';
    if (f.verified) p.verified = 'true';
    if (f.minRating) p.minRating = f.minRating;
    if (f.minWage != null) p.minWage = f.minWage;
    if (f.maxWage != null) p.maxWage = f.maxWage;
    return p;
  };

  return <Ctx.Provider value={{ filters, setFilters, reset, activeCount, toParams }}>{children}</Ctx.Provider>;
}

export const useWorkerFilters = () => useContext(Ctx);
