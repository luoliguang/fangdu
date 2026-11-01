function positiveInteger(value, fallback, maximum = 1000000) {
  if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, maximum) : fallback;
}
module.exports = { positiveInteger };
