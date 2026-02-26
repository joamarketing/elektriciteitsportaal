export const MONTHS_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December"
];

export const formatNumber = (n) => 
  n != null ? n.toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

export const formatKwh = (n) => 
  n != null ? n.toLocaleString("nl-BE", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : "—";

// Marge percentage
export const MARGE_PERCENTAGE = 0.10; // 10%

// Bereken bedrag met marge
export const withMarge = (amount) => amount * (1 + MARGE_PERCENTAGE);
