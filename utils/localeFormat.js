const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(value) {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

// Formats a number with thousands separators using the guaranteed-to-work
// 'en-US' grouping, then swaps in Bengali digit glyphs if needed. Produces
// e.g. "১১,০০০" for 11000 in Bengali, "11,000" in English.
export function formatNumber(value, lang) {
  const grouped = Number(value || 0).toLocaleString('en-US');
  return lang === 'bn' ? toBengaliDigits(grouped) : grouped;
}

export function formatMoney(value, lang) {
  return `৳${formatNumber(value, lang)}`;
}

// `t` is the translation function from useLanguage() — used to look up the
// month name so it comes from the same translation table as everywhere else.
export function formatDate(value, lang, t) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  const monthKeys = [
    'month.january', 'month.february', 'month.march', 'month.april',
    'month.may', 'month.june', 'month.july', 'month.august',
    'month.september', 'month.october', 'month.november', 'month.december',
  ];

  const day = lang === 'bn' ? toBengaliDigits(d.getDate()) : String(d.getDate()).padStart(2, '0');
  const month = t(monthKeys[d.getMonth()]);
  const year = lang === 'bn' ? toBengaliDigits(d.getFullYear()) : String(d.getFullYear());

  return `${day} ${month} ${year}`;
}