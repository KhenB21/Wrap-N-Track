// Philippine mobile numbers are stored in the local 11-digit form: 09XXXXXXXXX.

export const PH_MOBILE_LENGTH = 11;
export const PH_MOBILE_REGEX = /^09\d{9}$/;

// Keeps only digits and caps the entry at 11 characters while the user types.
export const sanitizePhMobileInput = (value) => String(value || '').replace(/\D/g, '').slice(0, PH_MOBILE_LENGTH);

// Older records may hold +639XXXXXXXXX or 639XXXXXXXXX; show them as 09XXXXXXXXX.
export const normalizePhMobile = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('639')) return `0${digits.slice(2)}`;
  return digits.slice(0, PH_MOBILE_LENGTH);
};

export const phMobileError = (value, { required = false } = {}) => {
  const digits = String(value || '');
  if (!digits) return required ? 'Mobile number is required' : null;
  if (!digits.startsWith('09')) return 'PH mobile numbers start with 09';
  if (digits.length !== PH_MOBILE_LENGTH) return `Enter all 11 digits (${digits.length}/11)`;
  return PH_MOBILE_REGEX.test(digits) ? null : 'Use the format 09XXXXXXXXX';
};
