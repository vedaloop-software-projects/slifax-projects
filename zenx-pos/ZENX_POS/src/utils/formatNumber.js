// utils/formatNumber.js

/**
 * Formats a numeric value safely with fixed decimals.
 * @param {*} value - raw value (string | number | null | undefined)
 * @param {number} decimals - decimal places (default 2)
 * @param {string} fallback - fallback string when value is invalid
 */
export const fmtNum = (value, decimals = 2, fallback = '0.00') => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (isNaN(n)) return fallback;
  return n.toFixed(decimals);
};

/** For Qty / Free — integers, no decimals */
export const fmtInt = (value, fallback = '0') => {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (isNaN(n)) return fallback;
  return String(Math.round(n));
};